import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';
import { Platform } from 'react-native';

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

    let currentUserId: string | null = null;

    supabase.auth.getUser().then(({ data }) => {
      currentUserId = data.user?.id || null;
    });

    const matchSubscription = supabase
      .channel('pc-live-match-stream')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'match_rooms' },
        (payload) => {
          const newRoom = payload.new;

          if (currentUserId && (newRoom.user_1 === currentUserId || newRoom.user_2 === currentUserId)) {
            
            if (Notification.permission === 'granted') {
              const notification = new Notification('✨ ThoughtMatch Found!', {
                body: `Someone matched with your thought! Click to jump into your chat room.`,
                icon: '/favicon.png', 
                tag: `match-${newRoom.id}`,
              });

              
              notification.onclick = () => {
                window.focus();
              };
            }
          }
        }
      )
      .subscribe();

      return () => {
        supabase.removeChannel(matchSubscription);
      };
    }, []);
}