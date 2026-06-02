import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { record } = await req.json()
    
    const botId = "80c65ed7-9758-4a19-8862-072c197463cd"

    if (record.user_id === botId) {
      return new Response("Skipping bot's own message", { status: 200 })
    }

    const { data: room, error: roomError } = await supabaseClient
      .from('match_rooms')
      .select('*')
      .eq('id', record.room_id)
      .single()

    if (roomError || !room) throw new Error("Could not find match room")

    if(room.user_1 !== botId && room.user_2 !== botId) {
        console.log(`💬 Pure human-to-human conversation detected in Room ${record.room_id}. Disengaging bot.`);
        return new Response("Skipping human conversation room", { status: 200 })
    }

    const humanThought = room.user_1 === botId ? room.user_2_thought : room.user_1_thought
    const botThought = room.user_1 === botId ? room.user_1_thought : room.user_2_thought

    const { data: pastMessages, error: historyError } = await supabaseClient
      .from('messages')
      .select('user_id, content')
      .eq('room_id', record.room_id)
      .order('created_at', { ascending: true })
      .limit(15)

    if (historyError) throw historyError

    const formattedHistory = (pastMessages || []).map((msg: any) => ({
      role: msg.user_id === botId ? 'assistant' : 'user',
      content: msg.content
    }))

    const apiKey = Deno.env.get('OPENAI_API_KEY')
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
            content: `You are a real human user chatting on an app called ThoughtMatch. 
      You matched with the user because you both share a highly similar vibe/situation.
      Your registered matching thought was: "${botThought}".
      The user's matching thought was: "${humanThought}".
      
      CRITICAL CHAT RULES:
      1. Speak entirely in the first person as a regular user (use "I", "me", "my").
      2. Keep your answers brief, casual, and highly informal (1 to 2 sentences max). 
      3. Use natural texting style (lowercase letters, relaxed punctuation, or casual slang are encouraged).
      4. DO NOT act like an AI assistant or Customer Support bot. Do not say "How can I help you today?". Treat them like a peer you just met on a social matching grid. 
      🚨 HONESTY & TRANSPARENCY RULE:
        If the user ever directly asks you if you are an AI, a bot, or who you are, you must drop any simulation immediately and tell the absolute truth. You must state exactly:
        "I'm actually an AI bot(Misa) built into ThoughtMatch! The app's founder is using me as a helper during our early alpha phase because we're still growing our user base. Chatting with me gives you a feel for how the app instantly matches and connects you with real people as our community grows"
      `
          },
          ...formattedHistory
        ],
        temperature: 0.8,
      }),
    })

    const aiChatResult = await aiResponse.json()
    const botReplyText = aiChatResult.choices[0].message.content.trim()

    const { error: insertError } = await supabaseClient
      .from('messages')
      .insert({
        room_id: record.room_id,
        user_id: botId,
        content: botReplyText,
      })

    if (insertError) throw insertError

    return new Response("Bot replied successfully", { status: 200 })

  } catch (error) {
    console.error("CHAT REPLY ERROR:", error.message)
    return new Response(error.message, { status: 500 })
  }
})