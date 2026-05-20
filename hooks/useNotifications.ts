import { supabase } from '@/lib/supabase';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export function useNotifications() {
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function registerAndSync() {
            if (!Device.isDevice) {
                console.log('Must use physical device for Push Notifications');
                return;
            }

            
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.log('Failed to get push token for push notifications');
                return;
            }

            
            try {
                const tokenData = await Notifications.getExpoPushTokenAsync({
                    projectId: '0c542b6a-c08e-4703-9d66-16bc6c3e5045',
                });
                const pushToken = tokenData.data;
                
                if (isMounted) setToken(pushToken);

                
                supabase.auth.onAuthStateChange(async (event, session) => {
                    if (session?.user) {
                        console.log(`Syncing token to profile row for user: ${session.user.id}`);
                        
                        const { error } = await supabase
                            .from('profiles')
                            .update({ push_token: pushToken })
                            .eq('id', session.user.id);

                        if (error) {
                            console.error('Error writing token to Supabase profiles:', error.message);
                        }         
                    }
                });

               
                if (Platform.OS === 'android') {
                    Notifications.setNotificationChannelAsync('default', {
                        name: 'default',
                        importance: Notifications.AndroidImportance.MAX,
                        vibrationPattern: [0, 250, 250, 250],
                        lightColor: '#FF231F7C',
                    });
                }

            } catch (err: any) {
                console.error('Error fetching Expo token:', err.message);
            }
        }

        registerAndSync();

        return () => {
            isMounted = false;
        };
    }, []);

    return token;
}