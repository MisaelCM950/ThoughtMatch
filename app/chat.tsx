import { FontAwesome } from '@expo/vector-icons';
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';

export default function Chat() {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 115 : 0}>
    <View style={styles.content}>
        <Text style={{color: 'white'}}>Hello</Text>
    </View>
    <View style={styles.messageBar}>
    <FontAwesome name='plus' size={22} color="#fff"/>
        <TextInput 
            placeholder='Type a message'
            placeholderTextColor='#999'
            style={styles.input}
        />
        <FontAwesome name='send' size={22} color="#fff"/>
    </View>
    </KeyboardAvoidingView>
    </TouchableWithoutFeedback>

  );
}

const styles = StyleSheet.create({
    messageBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingHorizontal: 20,
        paddingVertical: 15,
        marginBottom: 20,
        borderTopWidth: 1,
        borderColor: '#333'
    },
    container: {
        flex: 1,
        backgroundColor: '#000',
        alignItems: 'center'
    },
    content:{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center'
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#999',
        padding: 12,
        borderRadius: 999,
        color: 'white',
        marginHorizontal: 10,
        paddingHorizontal: 14,
        paddingVertical: 14
      },
});
