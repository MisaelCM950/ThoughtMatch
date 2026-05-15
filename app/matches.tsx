import { supabase } from '@/lib/supabase';
import { useRouter, } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function MatchesScreen() {
    const [rooms, setRooms] = useState<any[]>([]);
    const router = useRouter();

    const channelRef = useRef<any>(null);
    useEffect(() => {
        let isMounted = true;

        const fetchRooms = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !isMounted) return;

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
        <Text style={styles.title}>Your Matches</Text>
    <FlatList
      data={rooms}
      keyExtractor={(item)=> item.id}
      renderItem={({item}) =>(
        <TouchableOpacity
            style={styles.chatCard}
            onPress={() => router.push({
                pathname: '/chat',
                params: {roomId: item.id, thought: item.thought_content}
            })}
        >
            <Text style={styles.matchThought}>"{item.thought_content}"</Text>
            <Text style={styles.subText}>Tap to chat</Text>
        </TouchableOpacity>

      )}
      ListEmptyComponent={
        <View>
            <Text style={{color: 'gray'}}>No matches yet. Go think something!</Text>
            <TouchableOpacity style={styles.button} onPress={()=> router.back()}>
                <Text style={styles.buttonText}>Go Think!</Text>
            </TouchableOpacity>
        </View>}
    />
    <TouchableOpacity style={styles.button} onPress={()=>router.back()}>
        <Text style={styles.buttonText}>Back</Text>    
    </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
    button: {
        marginBottom: 50,
        backgroundColor: '#2686b3',
        padding: 16,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 40,
    },
    buttonText: { 
        color: 'white', 
        fontWeight: 'bold', 
        fontSize: 16 
    },
    chatCard: {
        backgroundColor: '#1a1a1a',
        padding: 20,
        borderRadius: 12,
        marginBottom: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#2686b3',
    },
    matchThought: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600'
    },
    subText : {
        color: '#999',
        marginTop: 5,
        fontSize: 12,
    },
    container: {
        flex: 1,
        backgroundColor: '#000',
        paddingTop: 60,
        paddingHorizontal: 20,
    },
  title: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 20
  },
});
