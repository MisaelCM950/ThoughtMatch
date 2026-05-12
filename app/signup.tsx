import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Keyboard, Platform, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';


export default function SignUpScreen() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSignUp = async ()=> {
        if(!email || !password || !fullName) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        setLoading(true);

        const {data, error} = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: fullName
                },
            },
        });
        if(error) {
            Alert.alert("Sign Up Error", error.message);
            setLoading(false);
        } else {
            Alert.alert("Sucess!", "Check your email for a confirmation link.");
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={{flex: 1}}>
                <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <Text style={styles.title}>Create Account</Text>
                    <TextInput
                        placeholder="Name"
                        style={styles.input}
                        placeholderTextColor="#999"
                        onChangeText={setFullName}
                    />
                    <TextInput
                        placeholder= "Email"
                        placeholderTextColor= "#999"
                        style={styles.input}
                        onChangeText={setEmail}
                    />

                    <TextInput
                        placeholder="Password"
                        placeholderTextColor="#999"
                        style={styles.input}
                        secureTextEntry
                        onChangeText={setPassword}
                    />

                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleSignUp}
                        disabled={loading}
                    >
                        <Text style={styles.buttonText}>{loading ? "Creating" : "Sign Up"}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={{marginTop: 30}}onPress={()=> router.push('/auth')}>
                        <Text style={{color: '#fff', fontSize: 15}}>Already have an account? <Text style={{borderBottomWidth: 1, borderBottomColor: 'blue', fontWeight: 'bold'}}>Sign in</Text></Text>
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            </View>
        </TouchableWithoutFeedback>
    )
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        padding: 20,
        justifyContent: 'center'
    },
    title: {
        fontSize: 28,
        color: '#fff',
        fontWeight: 'bold',
        marginBottom: 30,
        textAlign: 'center'
    },
    button: {
        backgroundColor: '#2686b3',
        padding: 15,
        borderRadius: 10,
        alignItems:'center',        
    },
    input: {
        backgroundColor: '#111',
        color: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#333'
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
})