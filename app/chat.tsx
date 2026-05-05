import { supabase } from '@/lib/supabase';
import { FontAwesome } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';

export default function Chat() {

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
        const newMessage = {
            content: input,
            user_id: user.id,
            room_id: String(roomId),
        };
        const {error} = await supabase.from('messages').insert(newMessage);
        if(error) {
            alert("Message failed to send");
            console.error("Supabase Error Details:", error);
        } else{
            setInput('');
        }
    };

    useEffect(()=> {
        if (!roomId) return;

        const fetchMessages = async () => {
            const {data} = await supabase
                .from('messages')
                .select('*')
                .eq('room_id', roomId)
                .order('created_at', {ascending: true});
                if (data) setMessages(data);
                console.log("Fetched messages:", data)
        }
        fetchMessages();
        
        const channel = supabase
            .channel(`room-${roomId}`)
            .on('postgres_changes',
                {event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}`},
                (payload) => {
                    setMessages((current) => [...current, payload.new])
                }
            )
            .subscribe();
            return () => {
                supabase.removeChannel(channel);
            };
    }, [roomId]);

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
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <Text style={{color: "white"}}>{String(roomId ?? '')}</Text>
        <Text style={{color: "white"}}>Thought Match: {String(thought ?? '')}</Text>
    <FlatList keyExtractor={(item)=> item.id} contentContainerStyle={styles.contentContainer} data={messages} renderItem={({item})=>{
        const isMe = item.user_id === user?.id;
        return (
            <View style={[styles.messageRow, isMe ? styles.rowMe : styles.rowOther ]}>
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                    <Text style={styles.bubbleText}>{item.content}</Text>
                </View>
            </View>
            
        )}}/>
    <View style={styles.messageBar}>
    <FontAwesome name='plus' size={22} color="#fff"/>
        <TextInput 
            placeholder='Type a message'
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
    </TouchableWithoutFeedback>
    </>
  );
}

const styles = StyleSheet.create({
    contentContainer: {
        paddingBottom: 20,
        paddingVertical: 12
    },
    bubbleText: {
        color: 'white',
        fontSize: 16
    },
    bubble: {
        maxWidth: '85%',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 18
    },
    bubbleMe: {
        backgroundColor: '#2f6fed'
    },
    bubbleOther: {
        backgroundColor: '#222'
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
        justifyContent: 'center',
        width: '100%',
        paddingHorizontal: 20,
        paddingVertical: 15,
        marginBottom: 20,
        borderTopWidth: 1,
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
        padding: 12,
        borderRadius: 999,
        color: 'white',
        marginHorizontal: 10,
        paddingHorizontal: 14,
        paddingVertical: 14
      },
});
