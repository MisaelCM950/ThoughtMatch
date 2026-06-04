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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid user session token token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const { thought, forceAIFallback, targetUserId } = await req.json()
    const userId = user.id;

    const {data: rooms, error: roomsCheckError} = await supabaseClient
        .from('match_rooms')
        .select('user_1, user_2, abandoned_by');

    if(roomsCheckError) throw roomsCheckError;

    const activeChatsCount = (rooms || []).filter(room => {
      return !room.abandoned_by && (room.user_1 === userId || room.user_2 === userId);
    }).length;

    if(activeChatsCount >= 3) {
        return new Response(JSON.stringify({
            diagnosticErrorTriggered: true,
            message: "maximum limit of 3 active chats"
        }), {
            headers: {...corsHeaders, 'Content-Type': 'application/json'},
            status: 200,
        });
    }

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
    if (!result.data) throw new Error("OpenAI Embedding Error: " + JSON.stringify(result))
    const embedding = result.data[0].embedding

    
        const {error: insertError} = await supabaseClient
            .from('thoughts')
            .insert({
                content: thought,
                user_id: userId,
                embedding: embedding,
            })

        if(insertError) throw insertError

    const targetThreshold = 0.40;
    let finalizedMatch = null;

    if (!forceAIFallback) {
      const { data: matches, error: matchError } = await supabaseClient.rpc('match_thoughts', {
        query_embedding: embedding,
        match_threshold: 0.0, 
        match_count: 20,     
        current_user_id: userId,
      })

      if (matchError) throw matchError
      
      console.log('=== 🧠 THOUGHTMATCH HUMAN LOGS ===');
      if (matches && matches.length > 0) {
        const humanMatches = matches.filter((m: any) => !m.is_ai_bot);

        for (const item of humanMatches) {
          console.log(`🔍 EVALUATING CANDIDATE: Score: ${item.similarity.toFixed(4)} | Thought: "${item.content}"`);
          if (item.similarity >= targetThreshold) {
            finalizedMatch = item;
            console.log(`✨ HUMAN MATCH FOUND: "${item.content}" (Score: ${item.similarity})`);
            break;
          }
        }
      }

      if (!finalizedMatch) {
        console.log(`📌 No human match discovered. Pinning thought to queue database...`);
        return new Response(JSON.stringify({ match: null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }
    }

    if (!finalizedMatch && forceAIFallback) {
      console.log(`🤖 User opted-in for Instant Sync. Generating AI Persona...`);
      const aiBotUserId = "80c65ed7-9758-4a19-8862-072c197463cd";

      const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', 
          messages: [
            { 
              role: 'system', 
              content: `You are a real human user posting a thought on a social connection app named ThoughtMatch. 
            Your primary goal is to write a short, single-sentence personal thought of your own that shares a SIMILAR topic, vibe, or situation as the input thought, but phrased completely differently as your own separate experience.
            
            CRITICAL SIMULATION RULES:
            1. DO NOT reply to the user's thought in this initial generation.
            2. DO NOT address the user (No "Happy birthday", no "Good luck with that", no "I agree with you").
            3. Speak in the first person ("I am...", "My...", "Just..."). informal, organic, max 15 words.` 
            },
            { role: 'user', content: `Generate a matching thought response for this user input: "${thought}"` }
          ],
          temperature: 0.7,
        }),
      })

      const aiChatResult = await aiResponse.json()
      const aiGeneratedThought = aiChatResult.choices[0].message.content.trim().replace(/^"|"$/g, '')

      console.log(`🤖 AI Engine Generated Dynamic Counter-Thought: "${aiGeneratedThought}"`);

      finalizedMatch = {
        user_id: aiBotUserId,
        content: aiGeneratedThought
      }
    }

    if (!finalizedMatch) {
      throw new Error("Match generation pipeline empty.");
    }

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