import { supabase } from '@/lib/supabase';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function MatchesScreen() {
    const [rooms, setRooms] = useState<any[]>([]);
    const router = useRouter();
    const { t, ready} = useTranslation();
    const [currentUserId, setCurrentUserId] = useState<string | null>(null); 
    const [infoModalVisible, setInfoModelVisible] = useState(false);

    if(!ready) {
            return (
                <View style={{flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center'}}>
                    <ActivityIndicator color='#2686b3' size='large'/>
                </View>
            )
        }

    const channelRef = useRef<any>(null);
    useEffect(() => {
        let isMounted = true;

        const fetchRooms = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !isMounted) return;

            setCurrentUserId(user.id)

            const { data } = await supabase
                .from('match_rooms')
                .select('*')
                .or(`user_1.eq.${user.id},user_2.eq.${user.id}`)
                .or(`abandoned_by.is.null,abandoned_by.neq.${user.id}`)
                .order('created_at', { ascending: false });

            if (data && isMounted) {
                setRooms(data);
            }
        };

        const setup = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !isMounted) return;

            await fetchRooms();
            if (!isMounted) return;

            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }

            const newChannel = supabase.channel(`matches-${user.id}-${Date.now()}`);
            
            newChannel
                .on('postgres_changes', 
                    { event: 'DELETE', schema: 'public', table: 'match_rooms' }, 
                    (payload: any) => {
                        console.log("REALTIME PAYLOAD RECEIVED:", payload);
                        if (isMounted) fetchRooms();
                    }
                )
                .subscribe((status: string) => {
                    if (status === 'SUBSCRIBED') {
                        console.log("Realtime: Locked and loaded");
                    }
                });

            channelRef.current = newChannel;
        };

        setup();

        return () => {
            isMounted = false;
            if (channelRef.current) {
                console.log("Cleaning up matches channel...");
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, []);

  return (  
    <View style={styles.container}>
        <View style={styles.layoutWrapper}>
            <Text style={styles.title}>{t('your_matches')}</Text>
            
            <View style={styles.mainContentRow}>
                <FlatList
                  data={rooms}
                  keyExtractor={(item) => item.id}
                  style={styles.list}
                  contentContainerStyle={styles.listContent}
                  renderItem={({item}) => {
                    const myThought = item.user_1 === currentUserId ? item.user_1_thought : item.user_2_thought;
                    const partnerThought = item.user_1 === currentUserId ? item.user_2_thought : item.user_1_thought
                    return (
                    <TouchableOpacity
                        style={styles.chatCard}
                        onPress={() => router.push({
                            pathname: '/chat',
                            params: {roomId: item.id, thought: partnerThought}
                        })}
                    >
                        <View style={styles.cardHeader}>
                            <Text style={styles.matchThought}>"{myThought}"</Text>
                            <Text style={styles.subText}>{t('tap_to_chat')}</Text>
                        </View>
                    </TouchableOpacity>
              )}}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={{color: 'gray', fontSize: 16}}>{t('no_matches_yet')}</Text>
                        <TouchableOpacity style={styles.inlineButton} onPress={() => router.back()}>
                            <Text style={styles.buttonText}>{t('go_think_btn')}</Text>
                        </TouchableOpacity>
                    </View>}
                />
            </View>
            <View style={styles.chatCounter}>
                <Text style={styles.chatCounterText}>{rooms.length} / 3 Chats</Text>
                <TouchableOpacity onPress={()=>{setInfoModelVisible(true)}}>
                    <FontAwesome size={24} name="question-circle" color='white'/>
                </TouchableOpacity>
            </View>
        <Modal 
            transparent={true}
            visible={infoModalVisible}
            animationType='fade'
            onRequestClose={()=> setInfoModelVisible(false)}
        >
                <View style={styles.modalOverlay}>
                    <View style={styles.infoBox}>
                        <FontAwesome name='info-circle' size={32} color='#2686b3' style={{marginBottom: 12}}/>
                        <Text style={styles.infoTitle}>Active Chat Limit</Text>
                        <Text style={styles.infoMessage}>
                            {t('info_first')}{"\n\n"}
                            {t('info_second')}
                        </Text>
                        <TouchableOpacity
                            style={styles.infoCloseButton}
                            onPress={()=> setInfoModelVisible(false)}
                        >
                            <Text style={styles.infoCloseButtonText}>Got it</Text>
                        </TouchableOpacity>
                    </View>
                </View>
        </Modal>
            <View style={styles.footerActionRow}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.buttonText}>{t('back_btn')}</Text>    
                </TouchableOpacity>
            </View>
        
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
    infoBox: {
        backgroundColor: '#1E1E1E',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 360,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
        elevation: 5
    },
    infoTitle: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    infoMessage: {
        color: '#BBB',
        fontSize: 20,
        lineHeight: 20,
        textAlign: 'center',
        marginBottom: 20,  
    },
    infoCloseButton: {
        backgroundColor: '#2686b3',
        width: '100%',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    infoCloseButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 15
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    chatCounterText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14
    },
    chatCounter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        backgroundColor: '#1E1E1E',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        alignSelf: 'flex-end',
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#2A2A2A',
        alignItems: 'center'
    },
    container: {
        flex: 1,
        backgroundColor: '#121212',
        paddingTop: 60,
    },
    layoutWrapper: {
        flex: 1,
        width: '100%',
        maxHeight: 1200,
        paddingHorizontal: '5%',
    },
    mainContentRow: {
        flex: 1,
        width: '100%',
        flexDirection: 'row',
    },
    list: {
        flex: 1,
        width: '100%',
    },
    listContent: {
        paddingBottom: 20,
    },
    chatCard: {
        backgroundColor: '#0c0c0c',
        borderColor: '#222',
        borderWidth: 1,
        padding: 24,
        borderRadius: 14,
        marginBottom: 16,
        borderLeftWidth: 5,
        borderLeftColor: '#2686b3',
        width: '100%', 
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 15,
    },
    matchThought: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '500',
        flexShrink: 1,
    },
    subText : {
        color: '#2686b3',
        fontSize: 13,
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
        gap: 20,
    },
    footerActionRow: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: 30,
    },
    backButton: {
        backgroundColor: '#2686b3',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        width: '100%',
        maxWidth: 400, 
    },
    inlineButton: {
        backgroundColor: '#2686b3',
        paddingVertical: 14,
        paddingHorizontal: 30,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: { 
        color: 'white', 
        fontWeight: 'bold', 
        fontSize: 16 
    },
    title: {
        fontSize: 36,
        color: '#fff',
        fontWeight: 'bold',
        marginBottom: 30,
        textAlign: 'left', 
    },
});