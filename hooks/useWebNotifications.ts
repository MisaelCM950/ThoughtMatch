import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';
import { Platform } from 'react-native';

let globalMatchChannel: any = null;
let globalMatchListeners: Set<(newRoom: any) => void> = new Set();
let isNotificationChannelInitializing = false;

const initializeGlobalMatchStream = async () => {
  if (globalMatchChannel || isNotificationChannelInitializing) return;
  isNotificationChannelInitializing = true;

  const { data } = await supabase.auth.getUser();
  const currentUserId = data.user?.id || null;

  if (!currentUserId) {
    isNotificationChannelInitializing = false;
    return;
  }

  globalMatchChannel = supabase.channel('pc-live-match-stream', {
    config: {
      broadcast: { self: false },
    },
  });

  globalMatchChannel
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'match_rooms' },
      (payload: any) => {
        const newRoom = payload.new;
        if (newRoom.user_1 === currentUserId || newRoom.user_2 === currentUserId) {
          globalMatchListeners.forEach((listener) => listener(newRoom));
        }
      }
    )
    .subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        console.log('📡 [Web Notifications] Global match pipeline connected to Supabase.');
      }
    });
};

export function useWebNotifications() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          console.log('🔔 PC Web Notification access granted successfully!');
        }
      });
    }


    initializeGlobalMatchStream();

    const handleIncomingMatchAlert = (newRoom: any) => {
      if (Notification.permission === 'granted') {
        const notification = new Notification('🧠 ThoughtMatch Found!', {
          body: `Someone matched with your thought! Click to jump into your chat room.`,
          icon: '@/assets/images/favicon.png"',
          tag: `match-${newRoom.id}`,
        });

        notification.onclick = () => {
          window.focus();
        };
      }
    };

    globalMatchListeners.add(handleIncomingMatchAlert);

    return () => {
      globalMatchListeners.delete(handleIncomingMatchAlert);
    };
  }, []);
}