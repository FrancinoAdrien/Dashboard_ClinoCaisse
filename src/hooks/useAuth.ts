'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAuthState, getAdminSession, AdminSession, getDbLabel } from '@/lib/auth';
import { initSupabaseFromStorage } from '@/lib/supabase';

export function useAuth() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminSession | null>(null);
  const [dbLabel, setDbLabel] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initSupabaseFromStorage();
    const state = getAuthState();
    if (state === 'no_db') {
      router.replace('/connect');
      return;
    }
    if (state === 'no_admin') {
      router.replace('/pin');
      return;
    }
    setAdmin(getAdminSession());
    setDbLabel(getDbLabel());
    setLoading(false);
  }, [router]);

  return { admin, dbLabel, loading };
}
