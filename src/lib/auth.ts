export interface AdminSession {
  uuid: string;
  nom: string;
  prenom?: string;
  role: string;
  loginTime: number;
}

const SESSION_TIMEOUT = 8 * 60 * 60 * 1000; // 8 heures

export function saveDbCredentials(url: string, key: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('cc_db_url', url);
  localStorage.setItem('cc_db_key', key);
  localStorage.setItem('cc_db_connected', '1');
}

export function clearDbCredentials() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('cc_db_url');
    localStorage.removeItem('cc_db_key');
    localStorage.removeItem('cc_db_connected');
  }
  clearAdminSession();
}

export function isDbConnected(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('cc_db_connected') === '1' &&
    !!localStorage.getItem('cc_db_url') &&
    !!localStorage.getItem('cc_db_key');
}

export function getDbUrl(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('cc_db_url') || '';
}

export function getDbLabel(): string {
  const url = getDbUrl();
  try {
    const u = new URL(url);
    return u.hostname.split('.')[0];
  } catch {
    return url.slice(0, 20) || 'Supabase';
  }
}

export function saveAdminSession(admin: { uuid: string; nom: string; prenom?: string; role: string }) {
  if (typeof window === 'undefined') return;
  const session: AdminSession = { ...admin, loginTime: Date.now() };
  localStorage.setItem('cc_admin_session', JSON.stringify(session));
}

export function getAdminSession(): AdminSession | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('cc_admin_session');
  if (!raw) return null;
  try {
    const session: AdminSession = JSON.parse(raw);
    if (Date.now() - session.loginTime > SESSION_TIMEOUT) {
      clearAdminSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearAdminSession() {
  if (typeof window !== 'undefined') localStorage.removeItem('cc_admin_session');
}

export function getAuthState(): 'no_db' | 'no_admin' | 'authenticated' {
  if (!isDbConnected()) return 'no_db';
  if (!getAdminSession()) return 'no_admin';
  return 'authenticated';
}
