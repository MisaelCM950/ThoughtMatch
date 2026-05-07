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

    const { error: insertError } = await supabaseClient
      .from('thoughts')
      .insert({
        content: thought,
        user_id: userId,
        embedding: embedding,
      })

    if (insertError) throw insertError

    const { data: matches, error: matchError } = await supabaseClient.rpc('match_thoughts', {
      query_embedding: embedding,
      match_threshold: 0.5, 
      match_count: 1,      
      current_user_id: userId,
    })

    console.log("Current User ID:", userId);
    console.log("Matches found from DB:", JSON.stringify(matches));

    if (matchError) {
        console.log("SQL Error:", matchError);
        throw matchError;
    }
    if(matches && matches.length > 0) {
        const match = matches[0];
        const otherUserId = match.user_id;
        console.log(`MATCH FOUND! Score: ${matches[0].similarity} between "${thought}" and "${matches[0].content}"`);

        const {data: existingRoom } = await supabaseClient
            .from('match_rooms')
            .select('id')
            .eq('thought_content', match.content)
            .or(`and(user_1.eq.${userId},user_2.eq.${otherUserId}),and(user_1.eq.${otherUserId},user_2.eq.${userId})`)
            .maybeSingle();

        let roomId;

        if(existingRoom) {
            roomId = existingRoom.id;
        } else {
            const { data: newRoom, error: roomError } = await supabaseClient
                .from('match_rooms')
                .insert({
                    user_1: userId,
                    user_2: otherUserId,
                    thought_content: match.content
                })
                .select()
                .single();

                if(roomError) throw roomError;
                roomId = newRoom.id;
        }

        return new Response(JSON.stringify({ 
            match: {
                ...match, 
                room_id: existingRoom.id,
                alreadyMatched: true,
                matchedUserName: 'someone'
            }
        }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
        });
    }
    return new Response(JSON.stringify({match: null}), {
        headers: {...corsHeaders, 'Content-Type' : 'application/json'},
        status: 200,
    })


  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})