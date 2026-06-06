import { useHomeLogic } from '@/hooks/useHomeLogic';
import '@/i18n';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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

export default function HomeScreen() {
    const [isClientMounted, setIsClientMounted] = useState<boolean>(false);

    useEffect(() => {
        setIsClientMounted(true);
    }, []);

    if (!isClientMounted) {
        return <View style={{ flex: 1, backgroundColor: '#121212' }} />;
    }
    
    return <SafeHomeScreenContent />
}
 function SafeHomeScreenContent() {
    const {t} = useTranslation();
    const router = useRouter();

    const {
        onlineUserCount,
        recentThoughts,
        thought,
        setThought,
        status,
        isAIProcessing,
        popupConfig,
        setStatus,
        setPopupConfig,
        handleMatch,
        handleSelectRecentThought,
    } = useHomeLogic();

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

         
          {recentThoughts?.length > 0 && (
            <View style={styles.recentSection}>
                <View style={styles.recentHeaderRow}>
                    <Text style={styles.recentSectionTitle}>Recent Active Thoughts</Text>
                    <Text style={styles.recentSectionSubtitle}>Tap a thought to write a matching reply instantly</Text>
                </View>

                <View style={styles.recentListContainer}>
                    {recentThoughts?.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.thoughtCard}
                            onPress={()=> handleSelectRecentThought(item.content, item.user_id)}
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
                  style={[styles.popupPrimaryButton, isAIProcessing && {opacity: 0.5}]} 
                  disabled={isAIProcessing}
                  onPress={popupConfig.onPrimaryPress}
                >
                  <Text style={styles.popupPrimaryButtonText}>{isAIProcessing ? 'Syncing....' : popupConfig.primaryButtonText}</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={[styles.popupCloseButton, !popupConfig.primaryButtonText && { width: '100%' }]} 
                disabled={isAIProcessing}
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