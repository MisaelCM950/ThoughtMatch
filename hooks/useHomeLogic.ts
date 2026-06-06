import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Platform } from "react-native";
import { useNotifications } from "./useNotifications";
import { globalListeners, initializedGlobalCounter } from "./usePresence";
import { useWebNotifications } from "./useWebNotifications";
interface PopupConfig {
  visible: boolean;
  title: string;
  message: string;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  onPrimaryPress?: () => void;
}

export function useHomeLogic() {
    useWebNotifications();
    const pushToken = useNotifications();

    const [thought, setThought] = useState('');
    const [status, setStatus] = useState<'idle' | 'matching'  | 'queued' | 'matched'>('idle');
    const [recentThoughts, setRecentThoughts] = useState<any[]>([]);
    const [onlineUserCount, setOnlineUserCount] = useState<number>(1);
    const isMatchingRef = useRef(false);
    const router = useRouter();
    const { t } = useTranslation();
    const [isAIProcessing, setIsAIProcessing] = useState<boolean>(false);

    const [popupConfig, setPopupConfig] = useState<PopupConfig>({
          visible: false,
          title: '',
          message: '',
    });

    const triggerPopup = (title: string, message: string, primaryButtonText?: string, onPrimaryPress?: () => void, secondaryButtonText?: string) => {
      setPopupConfig({
        visible: true,
        title,
        message,
        primaryButtonText,
        secondaryButtonText,
        onPrimaryPress,
      });
    };

    const getActiveChatCount = async (userId: string): Promise<number> => {
            const { data, error } = await supabase.rpc('get_user_active_chat_count', {
                check_user_id: userId,
            });
            if (error) throw error;
            return data ?? 0;
    };

    const getFullUserIdSet = async (): Promise<Set<string>> => {
            const { data: fullUsers, error } = await supabase.rpc('get_full_user_ids');
            if (error) throw error;
    
            const fullUserIdSet = new Set<string>();
            (fullUsers || []).forEach((row: { user_id?: string } | string) => {
                const id = typeof row === 'string' ? row : row.user_id;
                if (id) fullUserIdSet.add(id.toLowerCase());
            });
            return fullUserIdSet;
    };

    const fetchRecentThoughts = async () => {
            try {
                const { data: authData } = await supabase.auth.getUser();
                const currentUserId = authData?.user?.id;
    
                const fullUserIdSet = await getFullUserIdSet();
    
                let query = supabase
                    .from('thoughts')
                    .select('content, created_at, user_id')
                    .order('created_at', { ascending: false });
    
                if (currentUserId) {
                    query = query.not('user_id', 'eq', currentUserId);
                }
    
                const { data: thoughts, error: thoughtsError } = await query.limit(20);
    
                if (thoughtsError) throw thoughtsError;
    
                const filtered = (thoughts || []).filter(
                    (thought) => !fullUserIdSet.has(thought.user_id.toLowerCase())
                );
    
                setRecentThoughts(filtered);
            } catch (err: any) {
                console.error("Error loading interactive thoughts loop:", err.message);
            }
    };

    const handleMatchError = (errorMessage: string) => {
        console.log("Parsing function error", errorMessage);

        if (errorMessage.includes('maximum limit of 3 active chats')) {
            triggerPopup(
              t('limit_reached'),
              t('three_chats'),
              t('view_matches'),
              () => {
                setPopupConfig(prev => ({ ...prev, visible: false }));
                router.push('/matches');
              },
              t('cancel')
            );
        } else {
            triggerPopup("Matching Error", errorMessage);
        }
    };

    const handleForceAIMatch = async (userThought: string, userId: string) => {
         if(isAIProcessing) return;
        setIsAIProcessing(true);
        setStatus('matching');
        setPopupConfig(prev => ({...prev, visible: false}));

        try {
            const { data, error } = await supabase.functions.invoke('match-thought', {
                body: { thought: userThought, userId: userId, forceAIFallback: true }
            });

            if (error || data?.diagnosticErrorTriggered) throw new Error(error?.message || data?.message);

            if(data?.match) {
                console.log("AI Match Formed via User Opt-In Option!")
                setStatus('matched');
                setTimeout(() => {
                    setStatus('idle');
                    setIsAIProcessing(false);
                    router.push({
                        pathname: '/chat',
                        params: {roomId: data.match.room_id, thought: userThought}
                    });
                }, 1000);
            }
        } catch (e: any){
            console.error("AI Fallback creation crash:", e.message);
            setStatus('idle');
            setIsAIProcessing(false);
            handleMatchError(e.message || "An unexpected error occurred." )
        }
    };

    const handleMatch = async () => {

        if (thought.trim().length < 15) {
            triggerPopup(t('thought_too_short'), t('write_more'));
            return;
          }
        if(isMatchingRef.current || status === 'matching') return;
        isMatchingRef.current = true;

      setStatus('matching');
      const currentThoughtText = thought;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No user found");

        const {data: rooms, error: roomsError} = await supabase
            .from('match_rooms')
            .select('user_1, user_2, abandoned_by');

        if(!roomsError && rooms) {
            const activeChatCounts = rooms.filter(room => {
                return !room.abandoned_by && (room.user_1 === user.id || room.user_2 === user.id)
            }).length;

            if(activeChatCounts >= 3) {
                setStatus('idle')
                triggerPopup(
                    t('limit_reached'),
                    t('three_chats'),
                    t('view_matches'),
                    ()=> {
                        setPopupConfig(prev => ({...prev, visible: false}));
                        router.push('/matches');
                    },
                    t('cancel')
                );
                return;
            }
        }

         const { data, error } = await supabase.functions.invoke('match-thought', {
          body: { thought, userId: user.id }
        });

        if (data?.diagnosticErrorTriggered) {
            setStatus('idle');
            handleMatchError(data.message);
            return; 
        }

        if (error) throw error;

        if (data?.match) {
          const { room_id, alreadyMatched, content } = data.match;

          if (alreadyMatched) {
            triggerPopup(
              "Existing Match",
              `You're already in a conversation about "${content}".`,
              "Go to Chat",
              () => {
                setPopupConfig(prev => ({ ...prev, visible: false }));
                setStatus('idle');
                setThought('');
                router.push({
                  pathname: '/chat',
                  params: { roomId: room_id, thought: content }
                });
              }
            );
            return;
          } 
            console.log("Match Found!");
            setStatus('matched' );
            setThought('');
            setTimeout(() => {
                setStatus('idle');
                router.push({
                    pathname: '/chat',
                    params: { roomId: room_id, thought: currentThoughtText }
                })
            }, 1000);        

        }else {
              setStatus('idle');
            setThought('');
          triggerPopup(
            t('new_thought'),
            t('alert_match_not_found') || "Your thought is pinned and waiting for a human match. In the meantime, do you want to unlock an AI Reflection Buddy to explore this thought right now?",
            t('chat_with_AI'),
          () => handleForceAIMatch(currentThoughtText, user.id),
          t('wait')
          );
        }

      } catch (e: any) {
        console.error('Match error:', e);
        setStatus('idle');
        triggerPopup("Matching Failed", e.message || "An unexpected network error occurred.");
      } finally {
        isMatchingRef.current = false;
      }
    };

    const handleSelectRecentThought = async (selectedText: string, targetUserId: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user found");

            if (user.id === targetUserId) return;

            const targetUserChats = await getActiveChatCount(targetUserId);
            if (targetUserChats >= 3) {
                triggerPopup(
                    "User Busy",
                    "This user has reached their maximum limit of active chats. Try matching with another active thought!"
                );
                fetchRecentThoughts();
                return;
            }

            const currentUserChats = await getActiveChatCount(user.id);
            if (currentUserChats >= 3) {
                triggerPopup(t('limit_reached'), t('three_chats'));
                return;
            }

            setStatus('matching');

            const { data: existingRoom } = await supabase
                .from('match_rooms')
                .select('id')
                .or(`and(user_1.eq.${user.id},user_2.eq.${targetUserId}),and(user_1.eq.${targetUserId},user_2.eq.${user.id})`)
                .maybeSingle();

            let targetRoomId;

            if (existingRoom) {
                targetRoomId = existingRoom.id;
            } else {
                const { data: newRoom, error: roomError } = await supabase
                    .from('match_rooms')
                    .insert({
                        user_1: user.id,
                        user_2: targetUserId,
                        user_1_thought: selectedText,
                        user_2_thought: selectedText
                    })
                    .select()
                    .single();

                if (roomError) {
                    if (roomError.message.includes('maximum limit of 3 active chats')) {
                        triggerPopup(
                            "User Busy",
                            "This user has reached their maximum limit of active chats. Try matching with another active thought!"
                        );
                        fetchRecentThoughts();
                        setStatus('idle');
                        return;
                    }
                    throw roomError;
                }
                targetRoomId = newRoom.id;
            }

            setStatus('matched');
            setTimeout(() => {
                setStatus('idle');
                router.push({
                    pathname: '/chat',
                    params: { roomId: targetRoomId, thought: selectedText }
                });
            }, 1000);

        } catch (err: any) {
            console.error("Direct connection failed:", err.message);
            setStatus('idle');
        }
    };

    useEffect(() => {
            initializedGlobalCounter();
    
            const globalRef = Platform.OS === 'web' ? (window as any) : globalThis;
            if (globalRef.globalPresenceChannel) {
                const initialState = globalRef.globalPresenceChannel.presenceState();
                setOnlineUserCount(Object.keys(initialState).length || 1);
            }
    
            const handleLiveCounterUpdate = (count: number) => {
                setOnlineUserCount(count);
            };
            globalListeners.add(handleLiveCounterUpdate);
    
            return () => {
                globalListeners.delete(handleLiveCounterUpdate);
            };
        }, []);

        useEffect(() => {
      fetchRecentThoughts();
        const channelUniqueId = `thoughts-feed-stream-${Math.random().toString(36).substring(7)}`;

        const thoughtsSubscription = supabase
            .channel(channelUniqueId)
            .on(
                'postgres_changes',
                {event: 'INSERT', schema: 'public', table: 'thoughts'},
                ()=> fetchRecentThoughts()
            )
            .on(
                'postgres_changes',
                {event: 'INSERT', schema: 'public', table: 'feed_refresh_signals'},
                ()=> fetchRecentThoughts()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(thoughtsSubscription);
        };
    }, []);

    useEffect(() => {
        if (status == 'idle') {
            fetchRecentThoughts();
        }
    }, [status]);

    return {
        onlineUserCount,
        recentThoughts,
        thought,
        setThought,
        status,
        setStatus,
        isAIProcessing,
        popupConfig,
        setPopupConfig,
        handleMatch,
        handleSelectRecentThought,
    };
}