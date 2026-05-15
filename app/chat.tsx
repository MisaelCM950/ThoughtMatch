import { supabase } from '@/lib/supabase';
import { FontAwesome } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, LayoutAnimation, Modal, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

export default function ChatScreen() {

    const [isPartnerGone, setIsPartnerGone] = useState(false);
    const [isConfirmingAbandon, setIsConfirmingAbandon] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);
    const openMenu = ()=> setMenuVisible(true);
    const closeMenu = ()=> {
        setIsConfirmingAbandon(false);
        setMenuVisible(false)
    };

    const flatListRef = useRef<FlatList>(null);
    const [otherUserName, setOtherUserName] = useState('Someone')
    const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<any[]>([]);
    const [user, setUser] = useState<any>(null);

    async function fetchOtherParticipant() {
        const {data: {user}} = await supabase.auth.getUser();
        if(!user) return;

        const {data: room, error: roomError} = await supabase
            .from('match_rooms')
            .select('user_1, user_2, abandoned_by')
            .eq('id', roomId)
            .single();
        
        if(room?.abandoned_by && room.abandoned_by !== user.id) {
            setIsPartnerGone(true);
        }

        if(roomError || !room) {
            console.log("Room not found", roomError);
            return;
        }

        const partnerId = room.user_1 === user.id ? room.user_2 : room.user_1;

        const {data: profile} = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', partnerId)
            .single();
        
            setOtherUserName(profile?.full_name || 'Someone')
        
    }

    

    
    useEffect(()=> {
        supabase.auth.getUser().then(({data}) => setUser(data.user));
    }, [])
    const {roomId, thought} = useLocalSearchParams();
    console.log(roomId)
    const router = useRouter();
    
    const sendMessage = async () => {
        if(input.trim().length === 0) return;
        const tempId = Date.now().toString();
        const textToSend = input;
        setInput('');
        
        const optimisticMessage = {
            id: tempId,
            content: textToSend,
            user_id: user.id,
            room_id: String(roomId),
            created_at: new Date().toISOString(),
            status: 'sending'
        };

        setMessages((current) => [optimisticMessage, ...current]);

        const {error} = await supabase.from('messages').insert({
            content: textToSend,
            user_id: user.id,
            room_id: String(roomId),
        });
        if(error) {
            setMessages((current)=> current.filter(msg => msg.id !== tempId));
            alert('Message failed to send. Please try again.')
            alert("Message failed to send");
            console.error("Supabase Error Details:", error);
        } 
    };

    useEffect(()=> {
        fetchOtherParticipant();
    }, [roomId])

    useEffect(()=> {
        const timer = setTimeout(()=> {
            if(messages.length > 0) {
                flatListRef.current?.scrollToIndex({
                    index: 0,
                    animated: true,
                });
            }
        }, 100);
        return () => clearTimeout(timer);
    }, [messages]);

    useEffect(()=> {
        if (!roomId) return;

        const fetchMessages = async () => {
            const {data} = await supabase
                .from('messages')
                .select('*')
                .eq('room_id', roomId)
                .order('created_at', {ascending: false});
                if (data) setMessages(data);
                console.log("Fetched messages:", data)
        }
        fetchMessages();
        
        const channel = supabase
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
                supabase.removeChannel(channel);
            };
    }, [roomId]);

    

    const RenderHeader = () => (
        <View style={styles.matchContainer}>
            <Text style={styles.matchText}> You matched on: <Text style={styles.highlightText}>{thought}</Text> with <Text style={styles.highlightText}>{otherUserName}</Text></Text>
        </View>
    )

    const handleAbandonChat = async () => {
        try {
            const {error} = await supabase
                .from('match_rooms')
                .update({abandoned_by: user.id})
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

  return (
    <>
    <Stack.Screen options={{
        title: String(thought ?? ''), 
        headerStyle: {backgroundColor: '#000'}, 
        headerTintColor: '#fff', 
        headerTitleAlign: 'center',
        headerLeft: ()=> (
            <Pressable style={{paddingRight: 20, paddingLeft: 10}} onPress={()=> router.back()}>
                <FontAwesome name='chevron-left' size={23} color='#fff'/>
            </Pressable>
        ),
        headerRight: () => (
            <Pressable style={{paddingHorizontal: 20}} onPress={() =>{
                openMenu();}}>
                <FontAwesome name='ellipsis-h' size={22} color='#fff'/>
            </Pressable>
        )
    }}/>
    <KeyboardAvoidingView style={[styles.container, {flex: 1}]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 35}>
        <FlatList 
            ref={flatListRef} 
            inverted
            keyExtractor={(item)=> item.id} contentContainerStyle={styles.contentContainer} 
            ListFooterComponent={RenderHeader}
            onScrollToIndexFailed={(info)=> {
                flatListRef.current?.scrollToOffset({offset: info.averageItemLength * info.index, animated: true});
            }}
            keyboardDismissMode='interactive'
            data={messages} renderItem={({item})=>{
            const isMe = item.user_id === user?.id;
            const isSelected = selectedMessageId === item.id
            const isSending = item.status
            return (
                    <View style={[styles.messageRow, isMe ? styles.rowMe : styles.rowOther ]}>
                        <View style={{alignItems: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%', opacity: isSending ? 0.7 : 1}}>
                            <Pressable 
                                style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther, {alignSelf: isMe ? 'flex-end' : 'flex-start'}]}
                                onPress={()=> setSelectedMessageId(isSelected ? null : item.id)}
                            >
                                <Text style={styles.bubbleText}>{item.content}</Text>
                            </Pressable>
                            {isSelected && (
                                <Text style={styles.timeText}>
                                    {new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                                </Text>
                            )}
                        </View>
                    </View>
            )}}/>
            {isPartnerGone ? (
                <View style={styles.abandonedContainer}>
                    <Text style={styles.abandonedText}>{otherUserName} has left the chat</Text>
                    <TouchableOpacity onPress={handleFinalDelete} style={styles.finishButton}>
                        <Text style={styles.finishButtonText}>Close Chat</Text>
                    </TouchableOpacity>
                </View>
            ):(
        <View style={styles.messageBar}>
            <Pressable hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}>
                <FontAwesome name='plus' size={22} color="#fff"/>
            </Pressable>
            <TextInput 
                placeholder='Message...'
                placeholderTextColor='#999'
                style={styles.input}
                value= {input} 
                onChangeText={setInput}
            />
            <Pressable onPress={sendMessage} hitSlop={{top: 15, bottom: 15, left: 15, right: 15}} style={({pressed})=> [{opacity: pressed ? 0.5 : 1}]}>
                <FontAwesome name='send' size={22} color="#fff" style={{paddingVertical: 5}}/>
            </Pressable>
        </View>
        )}
        <Modal
            animationType='slide'
            transparent={true}
            visible={menuVisible}
            onRequestClose={closeMenu}
        >
            <View style={styles.modalOverlay}>
                <Pressable style={styles.modalBackdrop} onPress={closeMenu}>
                    <Pressable style={styles.customSheet} onPress={(e)=> e.stopPropagation()}>
                        <View style={styles.dragHandle}></View>
                        {!isConfirmingAbandon ? (
                            <>                        
                        <Text style={styles.modalTitle}>Chat Options</Text>

                        <TouchableOpacity style={styles.modalButton} onPress={()=> {
                            console.log("Report");
                            closeMenu();
                        }}>
                            <Text style={styles.buttonText}>Report User</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.modalButton} onPress={()=> {
                            setIsConfirmingAbandon(true);
                        }}>
                            <Text style={[styles.buttonText, {color: '#fc4545'}]}>Abandon Chat</Text>
                        </TouchableOpacity>
                        </>
                        ): (
                            <>
                                <Text style={styles.modalTitle}>Are you absolutely sure?</Text>
                                <Text style={styles.modalSubtitle}>This will delete the chat for both users and cannot be undone</Text>
                                <TouchableOpacity style={styles.modalButton} onPress={handleAbandonChat}>
                                    <Text style={[styles.buttonText, {color: '#FF3B30', fontWeight: '800'}]}>Yes, Abandon Chat</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.modalButton} onPress={()=> setIsConfirmingAbandon(false)}>
                                    <Text style={styles.buttonText}>No, Keep Chatting</Text>
                                </TouchableOpacity>
                            </>
                        )}

                        <TouchableOpacity style={[styles.modalButton, {borderBottomWidth: 0, marginTop: 10}]} onPress={()=> {
                            closeMenu();
                        }}>
                            <Text style={{color: '#2f6fed', fontWeight: 'bold', fontSize: 18}}>Cancel</Text>
                        </TouchableOpacity>

                        
                    </Pressable>
                </Pressable>
            </View>

        </Modal>
    </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
    abandonedContainer: {
        backgroundColor: '#1c1c1e',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#333',
        alignItems: 'center'
    },
    abandonedText: {
        fontSize: 20,
        color: '#999',
        marginBottom: 10,
        fontStyle: 'italic'
    },
    finishButton: {
       backgroundColor: '#2686b3',
       paddingVertical: 10,
       paddingHorizontal: 20,
       borderRadius: 8
    },
    finishButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    timeText: {
        color: '#666',
        fontSize: 11,
        marginTop: 4,
        marginHorizontal: 4
    },
    highlightText: {
        color: '#2f6Fed',
        fontWeight: 'bold'
    },
    matchText: {
        color: '#AAA',
        fontSize: 14,
        textAlign: 'center'
    },
    matchContainer: {
        alignItems: 'center',
        backgroundColor: "#1e1c1e",
        borderWidth: 1,
        borderColor: '#4d4d4d',
        paddingVertical: 20,
        marginHorizontal: 10,
        marginTop: 15,
        borderRadius: 20
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        textAlign: 'center',
        fontWeight: '600'
    },
    contentContainer: {
        paddingBottom: 20,
        paddingVertical: 12
    },
    bubbleText: {
        color: 'white',
        fontSize: 16
    },
    bubble: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 18
    },
    bubbleMe: {
        backgroundColor: '#2686b3',
        borderBottomRightRadius: 4
    },
    bubbleOther: {
        backgroundColor: '#1C1C1E',
        borderBottomLeftRadius: 4
    },
    messageRow: {
        width: '100%',
        flexDirection: 'row',
        marginVertical: 6,
        paddingHorizontal: 12,
        marginTop: 20
    },
    rowMe: {
        justifyContent: 'flex-end'
    },
    rowOther: {
        justifyContent: 'flex-start'
    },
    messageBar: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 15,
        paddingVertical: 10,
        backgroundColor: '#000',
        marginBottom: Platform.OS === 'android' ? 50 : 30,
        marginTop: 10,
        borderTopWidth: 0.5,
        borderColor: '#333'
    },
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    content:{
        flex: 1,
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#999',
        backgroundColor: '#1C1C1E',
        borderRadius: 20,
        color: 'white',
        marginHorizontal: 10,
        paddingHorizontal: 15,
        paddingVertical: 10
      },
      modalOverlay: {
        flex: 1,
        backgroundColor: 'transparent'
      },
      modalSubtitle: {
        color: '#999',
        fontSize: 16,
        textAlign: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
        lineHeight: 20,
      },
      modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end'
      },
      customSheet: {
        backgroundColor: '#1c1c1e',
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        padding: 20,
        paddingBottom: 40,
        borderWidth: 1,
        borderColor: '#333'
      },
      dragHandle: {
        width: 40,
        height: 5,
        backgroundColor: '#3a3a3c',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 15,
      },
      modalTitle: {
        color: '#666',
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 20,
        textTransform: 'uppercase',
        letterSpacing: 1,
      },
      modalButton: {
        paddingVertical: 18,
        borderBottomWidth: 0.5,
        borderBottomColor: '#333',
        width: '100%',
        alignItems: 'center'
      }
});



