import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { thought, userId } = await req.json()

    const apiKey = Deno.env.get('OPENAI_API_KEY')
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: thought,
        model: 'text-embedding-3-small',
      }),
    })

    const result = await response.json()
    if (!result.data) throw new Error("OpenAI Error: " + JSON.stringify(result))
    const embedding = result.data[0].embedding

    const {error: insertError} = await supabaseClient
        .from('thoughts')
        .insert({
            content: thought,
            user_id: userId,
            embedding: embedding,
        })

    if(insertError) {
        console.error("DATABASE INSERT CRASHED", insertError.message, insertError.details);
        throw insertError
    }

    const targetThreshold = 0.47;

    const { data: matches, error: matchError } = await supabaseClient.rpc('match_thoughts', {
      query_embedding: embedding,
      match_threshold: 0.0, 
      match_count: 5,      
      current_user_id: userId,
    })

    if (matchError) {
        console.error("RPC MATCHING CRASHED:", matchError.message, matchError.details);
        throw matchError
    }
    
    console.log('=== 🧠 THOUGHTMATCH SIMILARITY LOGS ===');
    console.log(`Current incoming thought: "${thought}"`);

    let finalizedMatch = null;

    if (matches && matches.length > 0) {
    let logOutput = `Found ${matches.length} potential rows to scan inside the database pool:\n`;
      
      matches.forEach((item: any, index: number) => {
        const passesGatekeeper = item.similarity >= targetThreshold;
        
        console.log(`[Option #${index + 1}] ----------------------------------`);
        console.log(`🎯 Target Text: "${item.content}"`);
        console.log(`📊 Similarity Score: ${item.similarity}`);
        console.log(`✅ Passed Gatekeeper? ${passesGatekeeper ? 'YES' : 'NO'}`);

        if (passesGatekeeper && !finalizedMatch) {
          finalizedMatch = item;
          console.log(`✨ SELECTED AS ACTIVE MATCH RECIPIENT!`);
        }
      });
      console.log(`=======================================`);

      if (finalizedMatch) {
        const otherUserId = finalizedMatch.user_id

    
        const { data: existingRoom } = await supabaseClient
          .from('match_rooms')
          .select('id')
          .or(`and(user_1.eq.${userId},user_2.eq.${otherUserId}),and(user_1.eq.${otherUserId},user_2.eq.${userId})`)
          .or(`user_1_thought.eq.${finalizedMatch.content},user_2_thought.eq.${finalizedMatch.content}`)
          .maybeSingle()

        let roomId
        let alreadyMatched = false

        if (existingRoom) {
          roomId = existingRoom.id
          alreadyMatched = true
        } else {
          const { data: newRoom, error: roomError } = await supabaseClient
            .from('match_rooms')
            .insert({
              user_1: userId,
              user_2: otherUserId,
              user_1_thought: thought,
              user_2_thought: finalizedMatch.content
            })
            .select()
            .single()

          if (roomError) throw roomError
          roomId = newRoom.id
        }

        return new Response(JSON.stringify({ 
          match: {
            room_id: roomId,
            content: finalizedMatch.content,
            alreadyMatched: alreadyMatched
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }
    } else {
      console.log(`❌ No other active rows found in database table 'thoughts' to compare with.`);
      console.log(`=======================================`);
    }

    return new Response(JSON.stringify({ match: null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error("INTERNAL ENGINE CRASH ENCOUNTERED:", error.message);
    return new Response(JSON.stringify({
        diagnosticErrorTriggered: true,
        message: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})