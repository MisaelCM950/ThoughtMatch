import { useNotifications } from '@/hooks/useNotifications';
import '@/i18n';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface PopupConfig {
  visible: boolean;
  title: string;
  message: string;
  primaryButtonText?: string;
  onPrimaryPress?: () => void;
}

let globalPresenceChannel: any = null;
let globalListeners: Set<(count: number)=> void> = new Set();

const initializedGlobalCounter = () => {
    if (globalPresenceChannel) return;

    globalPresenceChannel = supabase.channel('global-online-counter', {
        config: {
            presence: {
                key: `device-token-${Math.random().toString(36).substring(7)}`,
            },
        },
    });

    globalPresenceChannel
        .on('presence', {event: 'sync'}, ()=> {
            const presenceState = globalPresenceChannel.presenceState();
            const totalOnline = Object.keys(presenceState).length;
            const count = totalOnline > 0 ? totalOnline: 1;
            globalListeners.forEach((listener) => listener(count));
        })
        .subscribe((status: string)=> {
            if(status === 'SUBSCRIBED') {
                globalPresenceChannel.track({
                    online_at: new Date().toISOString(),
                }).catch((err: any)=> console.error('Global presence tracking block error:', err));
            }
        });
};

export default function HomeScreen() {
    const [onlineUserCount, setOnlineUserCount] = useState<number>(1);
    const pushToken = useNotifications();
    const [thought, setThought] = useState('');
    const [status, setStatus] = useState<'idle' | 'matching'  | 'queued' | 'matched'>('idle');
    const [roomId, setRoomId] = useState<string | null>(null);
    const router = useRouter();
    const { t} = useTranslation();
    useEffect(()=>{
    initializedGlobalCounter();

    if(globalPresenceChannel) {
        const initialState = globalPresenceChannel.presenceState();
        const initialCount = Object.keys(initialState).length;
        setOnlineUserCount(initialCount > 0 ? initialCount : 1);
    }

    const handleLiveCounterUpdate = (count: number) => {
        setOnlineUserCount(count);
    };
    globalListeners.add(handleLiveCounterUpdate);

    return ()=> {
        globalListeners.delete(handleLiveCounterUpdate);
    };
  }, []);

    const [popupConfig, setPopupConfig] = useState<PopupConfig>({
      visible: false,
      title: '',
      message: '',
    });

    const triggerPopup = (title: string, message: string, primaryButtonText?: string, onPrimaryPress?: () => void) => {
      setPopupConfig({
        visible: true,
        title,
        message,
        primaryButtonText,
        onPrimaryPress,
      });
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
              }
            );
        } else {
            triggerPopup("Matching Error", errorMessage);
        }
    }

    const handleMatch = async () => {
      if (thought.trim().length < 15) {
        triggerPopup(t('thought_too_short'), t('write_more'));
        return;
      }

      setStatus('matching');

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No user found");

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
          } else {
            console.log("New Match Found!");
            setStatus('matched');
            setTimeout(() => {
              setStatus('idle');
              router.push({
                pathname: '/chat',
                params: { roomId: room_id, thought: thought }
              });
            }, 1000);
          }
          setThought('');
        } else {
          triggerPopup(
            t('new_thought'),
            t('alert_match_not_found') || "You are the first one thinking this! No match was found right away, but your thought is pinned."
          );
          setStatus('idle');
          setThought('');
        }

      } catch (e: any) {
        console.error('Match error:', e);
        setStatus('idle');
        triggerPopup("Matching Failed", e.message || "An unexpected network error occurred.");
      }
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

        {/* 🟢 Live Counter UI Badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ADE80', marginRight: 8 }} />
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
            {onlineUserCount} {onlineUserCount === 1 ? 'person' : 'people'} online
            </Text>
        </View>
        </View>

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
                  {popupConfig.primaryButtonText ? t('cancel') : "Close"}
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