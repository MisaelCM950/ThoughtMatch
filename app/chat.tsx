import { supabase } from '@/lib/supabase';
import { FontAwesome } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, LayoutAnimation, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

export default function Chat() {
    const flatListRef = useRef<FlatList>(null);
    const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<any[]>([]);
    const [user, setUser] = useState<any>(null);
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
            <Text style={styles.matchText}> You matched on: <Text style={styles.highlightText}>{thought}</Text> with <Text style={styles.highlightText}>Misael</Text></Text>
        </View>
    )

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
            <Pressable style={{paddingHorizontal: 20}} onPress={()=> console.log('Menu Open')}>
                <FontAwesome name='ellipsis-h' size={22} color='#fff'/>
            </Pressable>
        )
    }}/>
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
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
        <View style={styles.messageBar}>
        <FontAwesome name='plus' size={22} color="#fff"/>
            <TextInput 
                placeholder='Message...'
                placeholderTextColor='#999'
                style={styles.input}
                value= {input} 
                onChangeText={setInput}
            />
            <Pressable onPress={sendMessage}>
                <FontAwesome name='send' size={22} color="#fff" style={{paddingVertical: 5}}/>
            </Pressable>
        </View>
    </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
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
        marginHorizontal: 20,
        marginTop: 15,
        borderRadius: 20
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
        backgroundColor: '#2f6fed',
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
        marginBottom: 30,
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
});
