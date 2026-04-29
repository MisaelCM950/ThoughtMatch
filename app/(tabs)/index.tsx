import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';

export default function HomeScreen() {
    const [thought, setThought] = useState('');
    const [status, setStatus] = useState<'idle' | 'matching'  | 'queued' | 'matched'>('idle');
    const [roomId, setRoomId] = useState<string | null>(null);
    const router = useRouter();
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
      <TextInput placeholder="Type your thought…" style={styles.input} value={thought} onChangeText={setThought} />
        <Pressable
            onPress={() => {
                setStatus('matching');
                setTimeout(() =>{
                    const matched = Math.random() < 0.5;
                    if(matched){
                        setStatus('matched');
                        const newRoomId = 'demo-room-123';
                        setRoomId(newRoomId);
                        router.push({
                            pathname: '/chat',
                            params: {roomId: newRoomId, thought}
                        })
                    } else{
                        setStatus('queued');
                        setRoomId(null);
                    }
                }, 1200)
            }}
            disabled={thought.trim().length < 3}
            style={[styles.button, thought.trim().length < 3 && styles.buttonDisabled]}
            >
                <ThemedText type="defaultSemiBold">Match me</ThemedText>
        </Pressable>

        {status === 'matching' && <ThemedText>Matching...</ThemedText>}
        {status === 'queued' && <ThemedText>No instant match. You're queued</ThemedText>}
        {status === 'matched' && <ThemedText>Matched: Room {roomId}</ThemedText>}
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
