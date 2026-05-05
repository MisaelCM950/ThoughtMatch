import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';

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
                },
            });
            if(data?.match) {
                console.log("You matched with someone thinking about:", data.match.content);
                setStatus('matched');
                const generatedRoomId = data.match.id;
                setTimeout(() => {
                    router.push({
                        pathname: '/chat',
                        params: {
                            roomId: generatedRoomId,
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
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">What are you thinking about?</ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
      <TextInput placeholder="Type your thought…" style={styles.input} value={thought} onChangeText={setThought} multiline/>
        <Pressable
            onPress={handleMatch}
            disabled={status === 'matching' || thought.trim().length < 5}
            style={[styles.button, ( status === 'matching' || thought.trim().length < 5) && styles.buttonDisabled]}
            >
                <ThemedText type="defaultSemiBold">{status === 'matching' ? "Finding Match..." : "Match Me"}</ThemedText>
        </Pressable>

        {status === 'matching' && <ThemedText>Matching...</ThemedText>}
        {status === 'queued' && <ThemedText>No instant match. You're queued</ThemedText>}
        {status === 'matched' && <ThemedText>Matched: Room {roomId}</ThemedText>}
        <Pressable
            onPress={()=> supabase.auth.signOut()}
            style={{marginTop: 20}}
        >
            <ThemedText style={{color: 'red'}}>Logout</ThemedText>
        </Pressable>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
    input: {
        borderWidth: 1,
        borderColor: '#999',
        padding: 12,
        borderRadius: 8,
        color: 'white'
      },
    button: {
        marginTop: 12,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        backgroundColor: '#2f6fed',
      },
      buttonDisabled: {
        opacity: 0.4,
      },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
