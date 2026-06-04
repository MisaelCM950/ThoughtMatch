import { useNotifications } from '@/hooks/useNotifications';
import { useWebNotifications } from '@/hooks/useWebNotifications';
import '@/i18n';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface PopupConfig {
  visible: boolean;
  title: string;
  message: string;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  onPrimaryPress?: () => void;
}

let globalPresenceChannel: any = null;
let globalListeners: Set<(count: number)=> void> = new Set();

const initializedGlobalCounter = () => {
    const globalRef = Platform.OS === 'web' ? (window as any) : globalThis;
    if (globalRef.globalPresenceChannel) {
        try {
            supabase.removeChannel(globalRef.globalPresenceChannel);
        }
        catch (e){
            console.log("Cleaning up dev channel")
        }
        globalRef.globalPresenceChannel = null;
    }   

    globalRef.globalPresenceChannel = supabase.channel('global-online-counter', {
        config: {
            presence: {
                key: `device-token-${Math.random().toString(36).substring(7)}`,
            },
        },
    });

    globalRef.globalPresenceChannel
        .on('presence', {event: 'sync'}, ()=> {
            const presenceState = globalRef.globalPresenceChannel.presenceState();
            const totalOnline = Object.keys(presenceState).length;
            const count = totalOnline > 0 ? totalOnline: 1;
            globalListeners.forEach((listener) => listener(count));
        })
        .subscribe((status: string)=> {
            if(status === 'SUBSCRIBED') {
                globalRef.globalPresenceChannel.track({
                    online_at: new Date().toISOString(),
                }).catch((err: any)=> console.error('Global presence tracking block error:', err));
            }
        });
};

const getRelativeTime = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const msPerMinute = 60 * 1000;
    const msPerHour = msPerMinute * 60;
    const msPerDay = msPerHour * 24;
    const elapsed = now.getTime() - past.getTime();

    if(elapsed < msPerMinute) return 'Just Now';
    if(elapsed < msPerHour) return Math.round(elapsed / msPerMinute) + 'm ago';
    if(elapsed < msPerDay) return Math.round(elapsed / msPerHour) + 'h ago';
    return Math.round(elapsed / msPerDay) + 'd ago';
};

// 🛠️ CHANGED: Master Diagnostic Root component to force error exposure on production build templates
export default function HomeScreen() {
    const [isClientMounted, setIsClientMounted] = useState<boolean>(false);
    const [fatalError, setFatalError] = useState<string | null>(null);

    useEffect(() => {
        // Intercept global browser canvas failures instantly
        if (typeof window !== 'undefined') {
            window.onerror = function (message, source, lineno, colno, error) {
                const logTrace = `MESSAGE: ${message}\nSOURCE: ${source}\nLINE: ${lineno}:${colno}\nSTACK: ${error?.stack}`;
                setFatalError(logTrace);
                return false;
            };
        }
        setIsClientMounted(true);
    }, []);

    // 🛠️ CHANGED: If a hidden hook loop triggers an engine exception, render the stack trace on-screen instantly
    if (fatalError) {
        return (
            <ScrollView style={{ flex: 1, backgroundColor: '#1c1c1c', padding: 24 }}>
                <Text style={{ color: '#ff4a4a', fontSize: 22, fontWeight: 'bold', marginBottom: 16 }}>
                    🛑 LIVE CRITICAL LOG DIAGNOSTIC
                </Text>
                <Text style={{ color: '#fff', fontSize: 13, fontFamily: 'monospace', backgroundColor: '#000', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#444', lineHeight: 20 }}>
                    {fatalError}
                </Text>
                <TouchableOpacity 
                    style={{ marginTop: 24, backgroundColor: '#2686b3', padding: 16, borderRadius: 8, alignItems: 'center' }}
                    onPress={() => setFatalError(null)}
                >
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Clear Log Window & Retry</Text>
                </TouchableOpacity>
            </ScrollView>
        );
    }

    if (!isClientMounted) {
        return <View style={{ flex: 1, backgroundColor: '#121212' }} />;
    }

    return <SafeHomeScreenContent />;
}

function SafeHomeScreenContent() {
    useWebNotifications();
    const pushToken = useNotifications();
    
    const [onlineUserCount, setOnlineUserCount] = useState<number>(1);
    const [recentThoughts, setRecentThoughts] = useState<any[]>([]);
    const [thought, setThought] = useState('');
    const [status, setStatus] = useState<'idle' | 'matching'  | 'queued' | 'matched'>('idle');
    const [roomId, setRoomId] = useState<string | null>(null);
    const router = useRouter();
    const { t } = useTranslation();

    useEffect(() => {
        initializedGlobalCounter();

        if (globalPresenceChannel) {
            const initialState = globalPresenceChannel.presenceState();
            const initialCount = Object.keys(initialState).length;
            setOnlineUserCount(initialCount > 0 ? initialCount : 1);
        }

        const handleLiveCounterUpdate = (count: number) => {
            setOnlineUserCount(count);
        };
        globalListeners.add(handleLiveCounterUpdate);

        return () => {
            globalListeners.delete(handleLiveCounterUpdate);
        };
    }, []);

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

    useEffect(() => {
        const fetchRecentThoughts = async () => {
            try {
                const { data: authData } = await supabase.auth.getUser();
                const currentUserId = authData?.user?.id;

                const { data: rooms, error: roomsError } = await supabase
                    .from('match_rooms')
                    .select('user_1, user_2, abandoned_by');

                if (roomsError) throw roomsError;

                const activeChatCounts: Record<string, number> = {};

                (rooms || []).forEach(room => {
                    if (room.abandoned_by !== room.user_1) {
                        activeChatCounts[room.user_1] = (activeChatCounts[room.user_1] || 0) + 1;
                    }
                    if (room.abandoned_by !== room.user_2) {               
                        activeChatCounts[room.user_2] = (activeChatCounts[room.user_2] || 0) + 1;
                    }
                });

                const fullUserIds = Object.keys(activeChatCounts).filter(
                    userId => activeChatCounts[userId] >= 3
                );

                let query = supabase
                    .from('thoughts')
                    .select('content, created_at, user_id')
                    .order('created_at', { ascending: false });

                if (currentUserId) {
                    query = query.not('user_id', 'eq', currentUserId);
                }

                if (fullUserIds.length > 0) {
                    query = query.not('user_id', 'in', `(${fullUserIds.join(',')})`)
                }

                const { data: thoughts, error: thoughtsError } = await query.limit(20);

                if (!thoughtsError && thoughts) {
                    setRecentThoughts(thoughts)
                }
            } catch (err: any) {
                console.error("Error loading interactive thoughts loop:", err.message);
            }
        };

        fetchRecentThoughts();

        const thoughtsSubscription = supabase
            .channel('public-live-thoughts-feed')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'thoughts' },
                () => {
                    fetchRecentThoughts();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(thoughtsSubscription);
        };
    }, [status]);

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
    }

    const handleForceAIMatch = async (userThought: string, userId: string) => {
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
                    router.push({
                        pathname: '/chat',
                        params: {roomId: data.match.room_id, thought: userThought}
                    });
                }, 1000);
            }
        } catch (e: any){
            console.error("AI Fallback creation crash:", e.message);
            setStatus('idle');
            handleMatchError(e.message || "An unexpected error occurred." )
        }
    };

    const handleMatch = async () => {
      if (thought.trim().length < 15) {
        triggerPopup(t('thought_too_short'), t('write_more'));
        return;
      }

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
      }
    };

    const handleSelectRecentThought = (selectedText: string) => {
        setThought(selectedText);
    };

  return (
    <View style={{ flex: 1, backgroundColor: '#121212' }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.centerScrollContent}> 
        <View style={styles.content}>
          <Text style={styles.titleApp}>ThoughtMatch</Text>
          <Text style={styles.title}>{t("what_thought")}</Text>
        
          <TextInput 
            placeholder={t('type_thought')} 
            placeholderTextColor="#808080"
            style={styles.input} 
            value={thought} 
            onChangeText={setThought} 
            multiline
          />
          <TouchableOpacity
              onPress={handleMatch}
              disabled={status === 'matching' || thought.trim().length < 5}
              style={[styles.button, (status === 'matching' || thought.trim().length < 5) && styles.buttonDisabled]}
          >
              <Text style={styles.buttonText}>
                {status === 'matching' ? t('finding_match') : t('match_me')}
              </Text>
          </TouchableOpacity>

          {status === 'matching' && <Text style={styles.statusText}>{t('matching')}</Text>}
          {status === 'queued' && <Text style={styles.statusText}>No instant match. You're queued</Text>}
          {status === 'matched' && <Text style={styles.statusText}>{t('matched')}</Text>}

          <TouchableOpacity style={styles.chatsButton} onPress={() => router.push('/matches')}>
              <Text style={styles.chatsButtonText}>{t("chat")}</Text>
          </TouchableOpacity>

          <View style={{ padding: 20, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ADE80', marginRight: 8 }} />
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                {onlineUserCount} {onlineUserCount === 1 ? 'person' : 'people'} online
                </Text>
            </View>
          </View>

          {recentThoughts.length > 0 && (
            <View style={styles.recentSection}>
                <View style={styles.recentHeaderRow}>
                    <Text style={styles.recentSectionTitle}>Recent Active Thoughts</Text>
                    <Text style={styles.recentSectionSubtitle}>Tap a thought to write a matching reply instantly</Text>
                </View>

                <View style={styles.recentListContainer}>
                    {recentThoughts.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.thoughtCard}
                            onPress={()=> handleSelectRecentThought(item.content)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.thoughtCardText} numberOfLines={3}>
                                "{item.content}"
                            </Text>
                            <Text style={styles.thoughtCardTime}>
                                {getRelativeTime(item.created_at)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
          )}

        </View>
      </ScrollView>
      <Modal
        transparent
        visible={popupConfig.visible}
        animationType="fade"
        onRequestClose={() => setPopupConfig(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.popupBox}>
            <Text style={styles.popupTitle}>{popupConfig.title}</Text>
            <Text style={styles.popupMessage}>{popupConfig.message}</Text>
            
            <View style={styles.popupActionsContainer}>
              {popupConfig.primaryButtonText && popupConfig.onPrimaryPress && (
                <TouchableOpacity 
                  style={styles.popupPrimaryButton} 
                  onPress={popupConfig.onPrimaryPress}
                >
                  <Text style={styles.popupPrimaryButtonText}>{popupConfig.primaryButtonText}</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={[styles.popupCloseButton, !popupConfig.primaryButtonText && { width: '100%' }]} 
                onPress={() => {
                  setPopupConfig(prev => ({ ...prev, visible: false }));
                  setStatus('idle');
                }}
              >
                <Text style={styles.popupCloseButtonText}>
                  {popupConfig.secondaryButtonText || 'Close'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
    recentSection: {
      marginTop: 24,
      width: '100%',
      borderTopWidth: 1,
      borderTopColor: '#232323',
      paddingTop: 24,
    },
    recentHeaderRow: {
      marginBottom: 14,
      alignItems: 'center',
    },
    recentSectionTitle: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    recentSectionSubtitle: {
      color: '#707070',
      fontSize: 12,
      marginTop: 2,
      textAlign: 'center',
    },
    recentListContainer: {
      gap: 10,
      width: '100%',
    },
    thoughtCard: {
      backgroundColor: '#181818',
      borderRadius: 10,
      padding: 16,
      borderWidth: 1,
      borderColor: '#242424',
      flexDirection: 'column',
      gap: 6,
    },
    thoughtCardText: {
      color: '#E0E0E0',
      fontSize: 14,
      lineHeight: 20,
      fontStyle: 'italic',
    },
    thoughtCardTime: {
      color: '#555555',
      fontSize: 11,
      fontWeight: '600',
      alignSelf: 'flex-end',
    },


    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20
    },
    popupBox: {
      backgroundColor: '#1E1E1E',
      borderRadius: 14,
      padding: 24,
      width: '100%',
      maxWidth: 440,
      borderWidth: 1,
      borderColor: '#2A2A2A',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5
    },
    popupTitle: {
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 10,
      textAlign: 'center'
    },
    popupMessage: {
      color: '#B3B3B3',
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 24,
      textAlign: 'center'
    },
    popupActionsContainer: {
      flexDirection: 'row',
      gap: 12,
      width: '100%'
    },
    popupPrimaryButton: {
      flex: 1,
      backgroundColor: '#2686b3',
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center'
    },
    popupPrimaryButtonText: {
      color: '#FFFFFF',
      fontWeight: '600',
      fontSize: 15
    },
    popupCloseButton: {
      flex: 1,
      backgroundColor: '#2A2A2A',
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#3A3A3A'
    },
    popupCloseButtonText: {
      color: '#FFFFFF',
      fontWeight: '600',
      fontSize: 15
    },

    titleApp: { color: 'white', fontSize: 32, fontWeight: 'bold', marginBottom: 40, textAlign: 'center' },
    statusText: {
        color: '#AAA',
        textAlign: 'center'
    },
    chatsButton: {
        marginTop: 20,
        borderWidth: 1,
        borderColor: '#2686b3',
        paddingVertical: 16,
        borderRadius: 8,
        alignItems: 'center',
        width: '100%'
    },
    chatsButtonText: {
        color: '#2686b3',
        fontWeight: '600',
        fontSize: 16
    },
    logoutButton: {
        marginTop: 40,
        alignItems: 'center'
    },
    logoutText: {
        color: '#FF4444',
        fontSize: 14
    },
    title: {
        fontSize: 24,
        color: '#FFFFFF',
        textAlign: 'center',
        fontWeight: 'bold',
    },
    container: {
        flex: 1,
        backgroundColor: '#121212'
    },
    centerScrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    headerContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        height: 200,
        backgroundColor: '#1D3D47'
    },
    input: {
        borderWidth: 1,
        borderColor: '#999',
        padding: 16,
        backgroundColor: '#1E1E1E',
        borderRadius: 8,
        color: 'white',
        width: '100%',
        height: 100, 
        textAlignVertical: 'top'
      },
    button: {
        marginTop: 12,
        paddingVertical: 16,
        borderRadius: 10,
        alignItems: 'center',
        backgroundColor: '#2686b3',
        width: '100%'
      },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 16
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    content: {
        width: '100%',
        maxWidth: 600,
        padding: 24,
        gap: 16
    },
    logo: {
        height: 178,
        width: 290,
        bottom: 0,
        left: 0,
        position: 'absolute',
    },
});