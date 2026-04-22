'use client';
import { useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export function useRealtime(table: string, onUpdate: () => void) {
  const client = getSupabaseClient();
  const cb = useCallback(onUpdate, []);

  useEffect(() => {
    if (!client) return;
    let channel: RealtimeChannel;
    try {
      channel = client
        .channel(`realtime:${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, cb)
        .subscribe();
    } catch { /* ignore */ }
    return () => { channel?.unsubscribe(); };
  }, [client, table, cb]);
}
