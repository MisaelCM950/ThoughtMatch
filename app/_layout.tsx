import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Redirect, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { supabase } from '../lib/supabase';

export default function RootLayout() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange( async (_event, session) => {
     try{
        setSession(session);
     } catch (e: any){
        console.log("Auth session cleanup:", e.message);
        await supabase.auth.signOut();
     }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#2f6fed" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{flex: 1}}>
        <BottomSheetModalProvider>
            <KeyboardProvider>
                <Stack screenOptions={{headerShown: false}}>
                    <Stack.Screen name="auth"/>
                    <Stack.Screen name ='signup'/>
                    <Stack.Screen name="(tabs)"/>
                    <Stack.Screen name = 'chat' options={{headerShown: true}}/>
                    </Stack>

                    {!session ? <Redirect href="/auth"/> : <Redirect href="/(tabs)"/>}
            </KeyboardProvider>
        </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}