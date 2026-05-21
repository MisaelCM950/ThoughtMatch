import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, LayoutAnimation } from "react-native";

export function useChatRoom(roomId: string | string[]) {
    const router = useRouter();
    const [partnerId, setPartnerId] =useState('');
    const [partnerThought, setPartnerThought] = useState('');
    const [isPartnerGone, setIsPartnerGone] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [otherUserName, setOtherUserName] = useState('Someone');
    const [user, setUser] = useState<any>(null);

    async function fetchOtherParticipant() {
            const {data: {user: currentUser}} = await supabase.auth.getUser();
            if(!currentUser) return;
            setUser(currentUser);
    
            const {data: room, error: roomError} = await supabase
                .from('match_rooms')
                .select('user_1, user_2, user_1_thought, user_2_thought, abandoned_by')
                .eq('id', roomId)
                .single();
            
                if(roomError || !room) {
                    console.log("Room not found", roomError);
                    return;
                }
            if(room?.abandoned_by && room.abandoned_by !== currentUser.id) {
                setIsPartnerGone(true);
            }
            const oppositeThought = room.user_1 === currentUser.id ? room.user_2_thought : room.user_1_thought;
            setPartnerThought(oppositeThought || "A shared thought")
    
            const calculatedPartnerId = room.user_1 === currentUser.id ? room.user_2 : room.user_1;
            setPartnerId(calculatedPartnerId)
    
            const {data: profile} = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id',calculatedPartnerId)
                .single();
            
                setOtherUserName(profile?.full_name || 'Someone')
            
        }

        useEffect(()=> {
                if (!roomId) return;
                let isMounted = true;
                let roomChannel: any;
                let channel: any;
        
                const setupRoomSubscription = async () => {
                    const {data: {session}} = await supabase.auth.getSession();
                    const currentUser = session?.user?.id
                    if(!currentUser || !isMounted) return;
                    
                    if(session?.user) {
                        setUser(session.user);
                    }
                    roomChannel = supabase
                        .channel(`room-status-${roomId}-${Date.now()}`)
                        .on('postgres_changes',
                            {
                                event: 'UPDATE',
                                schema: 'public',
                                table: 'match_rooms',
                                filter: `id=eq.${roomId}` 
                            },
                            (payload) => {
                                console.log("Room status updated live!", payload.new);
        
                                if(payload.new.abandoned_by && String(payload.new.abandoned_by).toLowerCase() !== String(currentUser).toLowerCase()) {
                                    if(isMounted) {
                                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                        setIsPartnerGone(true);
                                    }
                                }
                            }
                        )
                        .subscribe();
                };
                const fetchMessages = async () => {
                    const {data} = await supabase
                    .from('messages')
                    .select('*')
                    .eq('room_id', roomId)
                    .order('created_at', {ascending: false});
                    if (data && isMounted) setMessages(data);
                };
                setupRoomSubscription();
                fetchOtherParticipant();
                fetchMessages();

                channel = supabase
                    .channel(`room-${roomId}`)
                    .on('postgres_changes',
                        {event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}`},
                        (payload) => {
                            setMessages((current) => {
                                const filtered = current.filter(msg=> !(msg.status === 'sending' && msg.content === payload.new.content));
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                return [payload.new, ...filtered]
                            })
                        }
                    )
                    .subscribe();

                return () => {
                                isMounted = false;
                                if(channel) supabase.removeChannel(channel)
                                if(roomChannel) {
                                supabase.removeChannel(roomChannel);
                                }
                            };
        }, [roomId]);

        const sendMessage = async (input: string, setInput: (val: string) => void) => {
                if(input.trim().length === 0) return;
                const {data: {user: currentUser}} = await supabase.auth.getUser();
                if(!currentUser) return;
                const tempId = Date.now().toString();
                const textToSend = input;
                setInput('');
                
                const optimisticMessage = {
                    id: tempId,
                    content: textToSend,
                    user_id: currentUser.id,
                    room_id: String(roomId),
                    created_at: new Date().toISOString(),
                    status: 'sending'
                };
        
                setMessages((current) => [optimisticMessage, ...current]);
        
                const {error} = await supabase.from('messages').insert({
                    content: textToSend,
                    user_id: currentUser.id,
                    room_id: String(roomId),
                });
                if(error) {
                    setMessages((current)=> current.filter(msg => msg.id !== tempId));
                    alert('Message failed to send. Please try again.')
                    alert("Message failed to send");
                    console.error("Supabase Error Details:", error);
                } 
            };

            const handleAbandonChat = async (closeMenu: ()=> void) => {
                try {
                    const {data: {user: currentUser}} = await supabase.auth.getUser();
                    if(!currentUser) return;
                    const {error} = await supabase
                        .from('match_rooms')
                        .update({abandoned_by: currentUser.id})
                        .eq('id', roomId)
                        
                    if(error) throw error;
                    closeMenu();
                    router.replace('/(tabs)')
                } catch (error: any){
                    console.error('Error abandoning chat:', error.message);
                    alert("Could not delete chat. Try again later.")
                }
            };

            const handleFinalDelete = async () => {
                const {error} = await supabase
                    .from('match_rooms')
                    .delete()
                    .eq('id', roomId)

                if (!error) {
                    router.replace('/(tabs)')
                }
            }

            const handleSubmittingReport = async (selectedReason: string) => {
                try{
                    const {data: {user}} = await supabase.auth.getUser();
                    if(!user) return;

                    const chatEvidenceSnapshot = messages.slice(-15).map(msg => ({
                        sender_id: msg.user_id,
                        text: msg.content,
                        created_at: msg.created_at
                    }));

                    
                    
                    const {error: reportError} = await supabase
                        .from('reports')
                        .insert({
                            reporter_id: user.id,
                            reported_user_id: partnerId,
                            room_id: roomId,
                            reason: selectedReason,
                            chat_context: chatEvidenceSnapshot
                        });

                    if(reportError) throw reportError;

                    const {error: abandonError} = await supabase
                        .from('match_rooms')
                        .update({abandoned_by: user.id})
                        .eq('id', roomId);
                    
                    if(abandonError) {
                        console.error("Silent error auto-abandoning room:", abandonError.message);
                    }

                    Alert.alert(
                        "Report Submitted",
                        "Thank you. Our team will review this conversation and take immediate action if guidelines were broken."
                    );

                    router.replace('/(tabs)')
                } catch(error: any) {
                    Alert.alert("Error submitting report", error.message)
                }        
            }
            return {
                user,
                messages,
                otherUserName,
                isPartnerGone,
                partnerThought,
                sendMessage,
                handleAbandonChat,
                handleFinalDelete,
                handleSubmittingReport
            };           
}

