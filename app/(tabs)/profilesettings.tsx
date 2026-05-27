import '@/i18n';
import { default as i18nInstance } from '@/i18n';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
    const [name, setName] = useState('User');
    const [email, setEmail] = useState('');
    const router = useRouter();
    const {t, i18n} = useTranslation();

    const changeLanguage = (langCode: string) => {
        i18nInstance.changeLanguage(langCode)
    }

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
        <Text style={styles.label}>{t('full_name')}</Text>
        <Text style={styles.userName}>{name}</Text>

        <Text style={styles.label}>Email</Text>
        <Text style={styles.userEmail}>{email}</Text>
        <TouchableOpacity
            onPress={handleSignOut}
            style={styles.logoutButton}
        >
            <Text style={styles.logoutText}>{t('logout')}</Text>
        </TouchableOpacity>
        <View style={styles.languageContainer}>
            <TouchableOpacity style={[styles.langLink, i18n.language?.startsWith('en') && styles.activeLang]} onPress={()=> {changeLanguage('en')}}>
                <Text style={styles.buttonSecondaryText}>English</Text>
            </TouchableOpacity>
            <Text style={styles.divider}>|</Text>
            <TouchableOpacity style={[styles.langLink, i18n.language?.startsWith('es') && styles.activeLang]} onPress={()=> {changeLanguage('es')}}>
                <Text style={styles.buttonSecondaryText}>Español</Text>
            </TouchableOpacity>
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
    buttonSecondaryText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    buttonSecondary: { 
        backgroundColor: '#2686b365',
        marginTop: 20, 
        alignItems: 'center', 
        padding: 16,
        borderRadius: 10,
    },
    divider: {
        color: '#ccc',
        marginHorizontal: 5
    },
    activeLang: {
        borderBottomWidth: 2,
        borderBottomColor: '#fff'
    },
    langLink: {
        padding: 10
    },
    languageContainer: {
        flexDirection: 'row',
        marginTop: 30,
        alignItems: 'center'
    },
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
