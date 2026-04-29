import { FontAwesome } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';

export default function Chat() {
    const messages = [
        {id: '1', from: 'other', text:'Hey, what are you thinking about?'},
        {id: '2', from: 'me', text: 'University prep for the US as an international student.'},
        {id: '3', from: 'other', text: 'Same. SATs are brutal.'},
        {id: '4', from: 'me', text: 'Yeah.'},
        {id: '5', from: 'other', text: 'Same. SATs are brutal.'},
        {id: '6', from: 'me', text: 'Same. SATs are brutal.'},
        {id: '7', from: 'other', text: 'Same. SATs are brutal.'},
        {id: '8', from: 'me', text: 'Same. SATs are brutal.'},
        {id: '9', from: 'other', text: 'Same. SATs are brutal.'},
        {id: '10', from: 'me', text: 'Same. SATs are brutal.'},
        {id: '11', from: 'other', text: 'Same. SATs are brutal.'},
        {id: '12', from: 'me', text: 'Same. SATs are brutal.'}
    ];
    const {roomId, thought} = useLocalSearchParams();
    const router = useRouter();
  return (
    <>
    <Stack.Screen options={{
        title: String(thought ?? ''), 
        headerStyle: {backgroundColor: '#000'}, 
        headerTintColor: '#fff', 
        headerTitleAlign: 'center',
        headerLeft: ()=> (
            <Pressable style={{paddingRight: 20, paddingLeft: 10}} onPress={()=> router.back()}>
                <FontAwesome name='chevron-left' size={23} color='#fff'/>
            </Pressable>
        ),
        headerRight: () => (
            <Pressable style={{paddingHorizontal: 20}} onPress={()=> console.log('Menu Open')}>
                <FontAwesome name='ellipsis-h' size={22} color='#fff'/>
            </Pressable>
        )
    }}/>
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <Text style={{color: "white"}}>{String(roomId ?? '')}</Text>
        <Text style={{color: "white"}}>Thought Match: {String(thought ?? '')}</Text>
    <FlatList keyExtractor={(item)=> item.id} contentContainerStyle={styles.contentContainer} data={messages} renderItem={({item})=>(
            <View style={[styles.messageRow, item.from === 'me' ? styles.rowMe : styles.rowOther ]}>
                <View style={[styles.bubble, item.from === 'me' ? styles.bubbleMe : styles.bubbleOther]}>
                    <Text style={styles.bubbleText}>{item.text}</Text>
                </View>
            </View>
            
        )}/>
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
    </>
  );
}

const styles = StyleSheet.create({
    contentContainer: {
        paddingBottom: 20,
        paddingVertical: 12
    },
    bubbleText: {
        color: 'white',
        fontSize: 16
    },
    bubble: {
        maxWidth: '85%',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 18
    },
    bubbleMe: {
        backgroundColor: '#2f6fed'
    },
    bubbleOther: {
        backgroundColor: '#222'
    },
    messageRow: {
        width: '100%',
        flexDirection: 'row',
        marginVertical: 6,
        paddingHorizontal: 12,
        marginTop: 20
    },
    rowMe: {
        justifyContent: 'flex-end'
    },
    rowOther: {
        justifyContent: 'flex-start'
    },
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
    },
    content:{
        flex: 1,
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
