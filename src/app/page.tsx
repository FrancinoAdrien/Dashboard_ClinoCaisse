'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthState } from '@/lib/auth';
import { initSupabaseFromStorage } from '@/lib/supabase';

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    initSupabaseFromStorage();
    const state = getAuthState();
    if (state === 'no_db') router.replace('/connect');
    else if (state === 'no_admin') router.replace('/pin');
    else router.replace('/dashboard');
  }, [router]);
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  );
}
