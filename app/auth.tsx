import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function signIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert("Login Error", error.message);
    setLoading(false);
  }

  async function signUp() {
    setLoading(true);
    const { data: { session }, error } = await supabase.auth.signUp({ email, password });
    if (error) Alert.alert("Sign Up Error", error.message);
    if (!session && !error) Alert.alert('Check your email for a verification link!');
    setLoading(false);
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible ={false}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.authBox}>
        <Text style={styles.title}>ThoughtMatch</Text>
        
        <TextInput
          placeholder="email@address.com"
          placeholderTextColor="#666"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          style={styles.input}
        />

        <TextInput
          placeholder="Password"
          placeholderTextColor="#666"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          style={styles.input}
        />

        <TouchableOpacity style={styles.buttonPrimary} onPress={signIn} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Sign In</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.buttonSecondary} onPress={()=> {router.push('/signup')}} disabled={loading}>
          <Text style={styles.buttonSecondaryText}>Create Account</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', padding: 20 },
  authBox: { width: '100%' },
  title: { color: 'white', fontSize: 32, fontWeight: 'bold', marginBottom: 40, textAlign: 'center' },
  input: {
    backgroundColor: '#111',
    color: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  buttonPrimary: {
    backgroundColor: '#2686b3',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  buttonSecondary: { 
    backgroundColor: '#2686b365',
    marginTop: 20, 
    alignItems: 'center', 
    padding: 16,
    borderRadius: 10,
},
  buttonSecondaryText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});