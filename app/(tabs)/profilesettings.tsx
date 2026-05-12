import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
    const [name, setName] = useState('User');
    const [email, setEmail] = useState('');
    const router = useRouter();

    async function getProfile() {
        const {data: {user}} = await supabase.auth.getUser();

        if(user) {
            const fullName = user.user_metadata?.full_name;
            setName(fullName || 'No name set');
            setEmail(user.email || '')
        }
    }
    useEffect(()=> {
        getProfile();
    }, [])
    
    const handleSignOut = async () => {
        await supabase.auth.signOut();
    }
    
  return (
    <View style={styles.container}>
        <Text style={styles.label}>Full Name</Text>
        <Text style={styles.userName}>{name}</Text>

        <Text style={styles.label}>Email</Text>
        <Text style={styles.userEmail}>{email}</Text>
        <TouchableOpacity
            onPress={handleSignOut}
            style={styles.logoutButton}
        >
            <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
    userEmail: {
        color: '#fff',
        fontSize: 18,
        marginBottom: 40
    },
    userName: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20
    },
    label: {
        color: '#666',
        fontSize: 12,
        textTransform: 'uppercase',
        marginBottom: 5
    },
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
        backgroundColor: '#121212',
        padding: 20,
        justifyContent: 'center'
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
