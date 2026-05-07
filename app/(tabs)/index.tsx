import { supabase } from '@/lib/supabase';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
    const [thought, setThought] = useState('');
    const [status, setStatus] = useState<'idle' | 'matching'  | 'queued' | 'matched'>('idle');
    const [roomId, setRoomId] = useState<string | null>(null);
    const router = useRouter();


    const handleMatch = async () => {
        if(thought.trim().length < 5) {
            alert('Too short. Write a bit more to find a better match');
            return;
        }
        setStatus('matching');

        try {
            const {data: {user}} = await supabase.auth.getUser();
            if(!user) throw new Error("No user found");
            
            const { data, error } = await supabase.functions.invoke('match-thought', {
                body: { 
                    thought: thought, 
                    userId: user.id 
                }      
                
            });
            if(data?.match) {
                const {room_id, alreadyMatched, content} = data.match;
                if(alreadyMatched) {
                    Alert.alert(
                        "Existing Match",
                        `You are already talking to someone about "${data.match.content}".`,
                        [
                            {
                                text: "Go to Chat",
                                onPress: ()=> router.push({
                                    pathname: '/chat',
                                    params: {roomId: room_id, thought: content}
                                })
                            },
                            {text: "Cancel", style: 'cancel', onPress: ()=> (setStatus('idle'))}
                        ]
                    );
                    return;
                } else {
                    console.log("New Match Found!")
                }
                console.log("You matched with someone thinking about:", data.match.content);
                setStatus('matched');
                setTimeout(() => {
                    router.push({
                        pathname: '/chat',
                        params: {
                            roomId: room_id,
                            thought: thought
                        }
                    })
                }, 1000);
            } else {
                alert("No matches yet. You're the first one thinking this! We'll notify you when a match is found.");
                setStatus('idle')
            } 
            } catch (e: any) {
                console.error('Match error:', e);
                setStatus('idle');
                alert('Matching failed: ' + e.message);
            }
    }
  return (
    <ScrollView style={styles.container}>
        <View style={styles.headerContainer}>
            <Image
            source={require('@/assets/images/partial-react-logo.png')}
            style={styles.logo}
            />
        </View>
      
      <View style={styles.content}>
        <Text style={styles.title}>What are you thinking about?</Text>
      
      <TextInput 
        placeholder="Type your thought…" 
        style={styles.input} 
        value={thought} 
        onChangeText={setThought} 
        multiline
      />
        <TouchableOpacity
            onPress={handleMatch}
            disabled={status === 'matching' || thought.trim().length < 5}
            style={[styles.button, ( status === 'matching' || thought.trim().length < 5) && styles.buttonDisabled]}
            >
                <Text style={styles.buttonText}>{status === 'matching' ? "Finding Match..." : "Match Me"}</Text>
        </TouchableOpacity>

        {status === 'matching' && <Text style={styles.statusText}>Matching...</Text>}
        {status === 'queued' && <Text style={styles.statusText}>No instant match. You're queued</Text>}
        {status === 'matched' && <Text style={styles.statusText}>Matched: Room {roomId}</Text>}

        <TouchableOpacity style={styles.chatsButton} onPress={()=> router.push('/matches')}>
                <Text style={styles.chatsButtonText}>My Chats</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
            onPress={()=> supabase.auth.signOut()}
            style={styles.logoutButton}
        >
            <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
    statusText: {
        color: '#AAA',
        textAlign: 'center'
    },
    chatsButton: {
        marginTop: 20,
        borderWidth: 1,
        borderColor: '#2f6fed',
        paddingVertical: 16,
        borderRadius: 8,
        alignItems: 'center'
    },
    chatsButtonText: {
        color: '#2f6fed',
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
        fontWeight: 'bold',
    },
    container: {
        flex: 1,
        backgroundColor: '#121212'
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
        color: 'white'
      },
    button: {
        marginTop: 12,
        paddingVertical: 16,
        borderRadius: 10,
        alignItems: 'center',
        backgroundColor: '#2f6fed',
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
