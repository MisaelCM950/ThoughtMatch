import { supabase } from "@/lib/supabase";
import { Platform } from "react-native";

export const globalListeners: Set<(count: number)=> void> = new Set();

export const initializedGlobalCounter = () => {
    const globalRef = Platform.OS === 'web' ? (window as any) : globalThis;
    if (globalRef.globalPresenceChannel) {
        try {
            supabase.removeChannel(globalRef.globalPresenceChannel);
        }
        catch (e){
            console.log("Cleaning up dev channel")
        }
        globalRef.globalPresenceChannel = null;
    }   

    globalRef.globalPresenceChannel = supabase.channel('global-online-counter', {
        config: {
            presence: {
                key: `device-token-${Math.random().toString(36).substring(7)}`,
            },
        },
    });

    globalRef.globalPresenceChannel
        .on('presence', {event: 'sync'}, ()=> {
            const presenceState = globalRef.globalPresenceChannel.presenceState();
            const totalOnline = Object.keys(presenceState).length;
            const count = totalOnline > 0 ? totalOnline: 1;
            globalListeners.forEach((listener) => listener(count));
        })
        .subscribe((status: string)=> {
            if(status === 'SUBSCRIBED') {
                globalRef.globalPresenceChannel.track({
                    online_at: new Date().toISOString(),
                }).catch((err: any)=> console.error('Global presence tracking block error:', err));
            }
        });
};