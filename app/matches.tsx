import { supabase } from '@/lib/supabase';
import { useRouter, } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function MatchesScreen() {
    const [rooms, setRooms] = useState<any[]>([]);
    const router = useRouter();

    useEffect(() => {
        const fetchRooms = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.log("No user found yet")
                return;
            }
            console.log('Fetching rooms for User ID:', user.id)
            const { data, error } = await supabase
                .from('match_rooms')
                .select('*')
                .or(`user_1.eq.${user.id},user_2.eq.${user.id}`)
                .order('created_at', { ascending: false });

            if (data) {
                setRooms(data);
                console.log("Rooms Data:", data);
                console.log("Fetch Error:", error);
            }
        };

        fetchRooms();
        

        const channel = supabase
        .channel('matches-realtime')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'match_rooms' }, 
            (payload) => {
                console.log("Change detected in matches!", payload);
                fetchRooms();
            }
        )
        .subscribe();

            return () => {supabase.removeChannel(channel);};

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
        borderLeftColor: '#2f6fed',
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
