import { default as i18nInstance } from '@/i18n';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordWrong, setIsPasswordWrong] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const passwordInputRef = React.useRef<any>(null)

  const { t, i18n } = useTranslation();
  
  const changeLanguage = (langCode: string) => {
    i18nInstance.changeLanguage(langCode);
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (isPasswordWrong) setIsPasswordWrong(false)
  }

  const handlePasswordChange = (text:string) => {
    setPassword(text);
    if(isPasswordWrong) setIsPasswordWrong(false);
    }

  async function signIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        setIsPasswordWrong(true)
        console.log("Your email or password is wrong")
        setLoading(false);
        return;
    };
    setIsPasswordWrong(false);
    setLoading(false);
    router.replace('/(tabs)')
  }

  return (
    <TouchableWithoutFeedback onPress={Platform.OS === 'web' ? undefined : Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <View style={styles.authBox}>
          <Text style={styles.title}>ThoughtMatch</Text>
          
          <TextInput
            placeholder="email@gmail.com"
            placeholderTextColor="#666"
            value={email}
            onChangeText={handleEmailChange}
            autoCapitalize="none"
            style={styles.input}
            returnKeyType='next'
            onSubmitEditing={() => passwordInputRef.current?.focus()}
          />

          <TextInput
            placeholder={t('password')}
            placeholderTextColor="#666"
            value={password}
            onChangeText={handlePasswordChange}
            secureTextEntry
            autoCapitalize="none"
            style={styles.input}
            returnKeyType='done'
            onSubmitEditing={signIn}
          />

          {isPasswordWrong &&(
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{t('auth_error_msg')}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.buttonPrimary} onPress={signIn} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>{t('sign_in')}</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.buttonSecondary} onPress={() => { router.push('/signup') }} disabled={loading}>
            <Text style={styles.buttonSecondaryText}>{t('create_account')}</Text>
          </TouchableOpacity>

          <View style={styles.languageContainer}>
              <TouchableOpacity 
                style={[styles.langLink, i18n.resolvedLanguage?.startsWith('en') && styles.activeLang, styles.webPointer]} 
                onPress={() => { changeLanguage('en') }} 
                disabled={loading}
              >
                  <Text style={styles.buttonSecondaryText}>English</Text>
              </TouchableOpacity>
              
              <Text style={styles.divider}>|</Text>
              
              <TouchableOpacity 
                style={[styles.langLink, i18n.resolvedLanguage?.startsWith('es') && styles.activeLang, styles.webPointer]} 
                onPress={() => { changeLanguage('es') }} 
                disabled={loading}
              >
                  <Text style={styles.buttonSecondaryText}>Español</Text>
              </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000', 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: '5%', 
  },
  errorContainer: {
    marginVertical: 5,
    paddingLeft: 4,
    alignSelf: 'flex-start'
  },
  errorText: {
    color: '#FF4444',
    fontSize: 13,
    alignSelf: 'flex-start'
  },
  authBox: { 
    width: '100%', 
    maxWidth: 500,
    alignItems: 'center',
  },
  title: { color: 'white', fontSize: 32, fontWeight: 'bold', marginBottom: 40, textAlign: 'center' },
  input: {
    backgroundColor: '#111',
    color: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333',
    width: '100%',
  },
  buttonPrimary: {
    backgroundColor: '#2686b3',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    width: '100%',
  },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  buttonSecondary: { 
    backgroundColor: '#2686b365',
    marginTop: 20, 
    alignItems: 'center', 
    padding: 16,
    borderRadius: 10,
    width: '100%',
  },
  buttonSecondaryText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
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
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  webPointer: {
    ...Platform.select({
      web: {
        cursor: 'pointer'
      }
    })
  }
});