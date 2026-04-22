import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  return _client;
}

export function createSupabaseClient(url: string, key: string): SupabaseClient {
  const cleanUrl = url.trim().replace(/\/rest\/v1\/?$/, '');
  _client = createClient(cleanUrl, key.trim(), {
    auth: { persistSession: false },
  });
  return _client;
}

export async function testSupabaseConnection(url: string, key: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const cleanUrl = url.trim().replace(/\/rest\/v1\/?$/, '');
    const client = createClient(cleanUrl, key.trim(), { auth: { persistSession: false } });
    const { error } = await client.from('utilisateurs').select('uuid').limit(1);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Connexion impossible' };
  }
}

export function initSupabaseFromStorage(): boolean {
  if (typeof window === 'undefined') return false;
  const url = localStorage.getItem('cc_db_url');
  const key = localStorage.getItem('cc_db_key');
  if (url && key) {
    createSupabaseClient(url, key);
    return true;
  }
  return false;
}
