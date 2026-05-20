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

    const { record, triggering_user_id } = await req.json()
    
    if (!record) {
      throw new Error("No record found in webhook payload")
    }
    console.log(`DATABASE PAYLOAD RECEIVED -> Triggered By: ${triggering_user_id}`);
    const roomId = record.id
    const user1Id = record.user_1
    const user2Id = record.user_2
    const user1Thought = record.user_1_thought
    const user2Thought = record.user_2_thought
    const waitingUserId = triggering_user_id ? ((triggering_user_id === user1Id) ? user1Id : user2Id) : user2Id;

    console.log(`Match Triggered By: ${triggering_user_id}. Sending notification to Waiting User: ${waitingUserId}`)

    const { data: profiles, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, full_name, push_token')
      .in('id', [user1Id, user2Id])

    if (profileError) throw profileError
    if(!profiles) throw new Error("No profiles found")

    const user1Profile = profiles.find(p => p.id === user1Id)
    const user2Profile = profiles.find(p => p.id === user2Id)
    const recipientProfile = profiles.find(p => p.id === waitingUserId)

    const notificationPayloads = []

    if (recipientProfile?.push_token) {

        const fallbackName = 'Someone';
        const bodyText = (waitingUserId === user1Id) 
            ? `${user2Profile?.full_name || fallbackName} is thinking: "${user2Thought}"`
            : `${user1Profile?.full_name || fallbackName} is thinking: "${user1Thought}"`;

      notificationPayloads.push({
        to: recipientProfile.push_token,
        sound: 'default',
        title: 'New ThoughtMatch Found! 🧠',
        body: bodyText,
        data: { roomId: roomId} 
      })
    }

    if (notificationPayloads.length === 0) {
      return new Response(JSON.stringify({ message: 'No registered push tokens found for this match.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notificationPayloads),
    })

    const expoResult = await expoResponse.json()
    console.log('Expo Push Server Response Log:', JSON.stringify(expoResult))

    return new Response(JSON.stringify({ success: true, dispatched: notificationPayloads.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Notification dispatch error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})