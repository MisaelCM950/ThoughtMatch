import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Keyboard, Platform, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

export default function SignUpScreen() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const [birthdate, setBirthdate] = useState('');

    const { t } = useTranslation();


    const handleBirthdayChange = (text: string) => {
        const cleaned = text.replace(/[^0-9]/g, '');
        let formatted = cleaned;

        if(cleaned.length > 4 && cleaned.length <=6) {
            formatted = `${cleaned.slice(0,4)}-${cleaned.slice(4)}`;
        } else if (cleaned.length > 6) {
            formatted = `${cleaned.slice(0,4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`
        } 

        setBirthdate(formatted);
    }
    const isOldEnough = (dobString: string): boolean => {
        if(!dobString) return false;

        const birthDate = new Date(dobString);
        const today = new Date();

        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDifference = today.getMonth() - birthDate.getMonth();

        if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age >= 18  
      }

    const handleSignUp = async () => {
        if (!email || !password || !fullName || !birthdate) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        if(!isOldEnough(birthdate)) {
            Alert.alert(
                "Access Denied",
                "You must be at least 18 years old to create an account on ThoughtMatch."
            );
            return;
        }
        setLoading(true);

        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: fullName
                },
            },
        });
        if (error) {
            Alert.alert("Sign Up Error", error.message);
            setLoading(false);
        } else {
            Alert.alert("Success!", "Check your email for a confirmation link.");
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Platform.OS === 'web' ? undefined : Keyboard.dismiss} accessible={false}>
            <View style={{ flex: 1 }}>
                <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View style={styles.formBox}>
                        <Text style={styles.title}>{t('create_account')}</Text>
                        
                        <TextInput
                            placeholder={t('name')}
                            style={styles.input}
                            placeholderTextColor="#999"
                            onChangeText={setFullName}
                        />
                        
                        <TextInput
                            placeholder="Email"
                            placeholderTextColor="#999"
                            style={styles.input}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                        />
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>{birthdate.length === 0 ? ('Date of Birth - must be 18+') : !isOldEnough(birthdate) ? (<Text style={{color: 'red'}}>Must be 18+</Text>) : 'Date of Birth - must be 18+'}</Text>
                        <TextInput
                            placeholder= 'YYYY-MM-DD'
                            placeholderTextColor="#999"
                            style={styles.input}
                            value={birthdate}
                            onChangeText={handleBirthdayChange}
                            maxLength={10}
                            {...Platform.select({
                                web: {secureTextEntry: false, dataSet: {type: 'date'}, id: 'birthdate-picker'} as any
                            })}
                        />
                    </View>
                        
                        <TextInput
                            placeholder={t("password")}
                            placeholderTextColor="#999"
                            style={styles.input}
                            secureTextEntry
                            onChangeText={setPassword}
                            autoCapitalize="none"
                        />             

                        <TouchableOpacity
                            style={[styles.button, styles.webPointer]}
                            onPress={handleSignUp}
                            disabled={loading}
                        >
                            <Text style={styles.buttonText}>{loading ? "Creating" : t('sign_up')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.loginLink, styles.webPointer]} onPress={() => router.push('/auth')}>
                            <Text style={styles.loginLinkText}>
                                {t('already_account')}{' '}
                                <Text style={styles.signInHighlight}>{t('sign_in')}</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    inputContainer: {
        width: '100%',
        alignItems: 'flex-start'
    },
    inputLabel: {
        color: '#888',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 4,
        marginLeft: 4,
        textTransform: 'uppercase'
    },
    container: {
        flex: 1,
        backgroundColor: '#000',
        paddingHorizontal: '5%',
        justifyContent: 'center',
        alignItems: 'center', 
    },
    formBox: {
        width: '100%',
        maxWidth: 500,
        alignItems: 'center',
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
        alignItems: 'center',
        width: '100%',
    },
    input: {
        backgroundColor: '#111',
        color: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#333',
        width: '100%',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    loginLink: {
        marginTop: 30,
        width: '100%',
        alignItems: 'center',
    },
    loginLinkText: {
        color: '#fff', 
        fontSize: 15,
        textAlign: 'center',
    },
    signInHighlight: {
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
    webPointer: {
        ...Platform.select({
            web: {
                cursor: 'pointer'
            }
        })
    },
});