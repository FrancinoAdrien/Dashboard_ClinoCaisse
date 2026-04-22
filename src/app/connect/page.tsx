'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Database, Wifi, WifiOff, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { testSupabaseConnection, createSupabaseClient } from '@/lib/supabase';
import { saveDbCredentials, isDbConnected, getAdminSession, getDbUrl } from '@/lib/auth';

export default function ConnectPage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const [isCurrentlyConnected, setIsCurrentlyConnected] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsCurrentlyConnected(isDbConnected());
    // Si déjà connecté, pré-remplir
    const savedUrl = getDbUrl();
    if (savedUrl) setUrl(savedUrl);
    const savedKey = localStorage.getItem('cc_db_key') || '';
    if (savedKey) setKey(savedKey);
  }, []);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || !key.trim()) return;
    setLoading(true);
    setStatus('testing');
    setErrorMsg('');

    const result = await testSupabaseConnection(url.trim(), key.trim());
    if (result.ok) {
      createSupabaseClient(url.trim(), key.trim());
      saveDbCredentials(url.trim(), key.trim());
      setStatus('ok');
      setTimeout(() => {
        // Si déjà une session admin active, aller direct au dashboard
        if (getAdminSession()) router.replace('/dashboard');
        else router.replace('/pin');
      }, 800);
    } else {
      setStatus('error');
      setErrorMsg(result.error || 'Connexion échouée');
      setLoading(false);
    }
  }

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">🏪</div>
          <span className="auth-logo-text">ClinoCaisse</span>
        </div>

        <h2 className="auth-title">Connexion à la base de données</h2>
        <p className="auth-subtitle">
          Saisissez vos identifiants Supabase pour accéder au tableau de bord
        </p>

        {isCurrentlyConnected && (
          <div style={{
            background: 'var(--success-dim)',
            border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            color: 'var(--success)',
          }}>
            <CheckCircle size={15} />
            Une connexion est déjà configurée. Vous pouvez la modifier ci-dessous.
          </div>
        )}

        <form onSubmit={handleConnect}>
          <div className="form-group">
            <label className="form-label">
              <Database size={13} style={{ display: 'inline', marginRight: 5 }} />
              URL Supabase
            </label>
            <input
              id="supabase-url"
              className={`form-input ${status === 'error' ? 'error' : ''}`}
              type="url"
              placeholder="https://xxxxxxxxxxxx.supabase.co"
              value={url}
              onChange={e => { setUrl(e.target.value); setStatus('idle'); }}
              required
              disabled={loading}
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Wifi size={13} style={{ display: 'inline', marginRight: 5 }} />
              Clé publique (anon key)
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="supabase-key"
                className={`form-input ${status === 'error' ? 'error' : ''}`}
                type={showKey ? 'text' : 'password'}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={key}
                onChange={e => { setKey(e.target.value); setStatus('idle'); }}
                required
                disabled={loading}
                style={{ paddingRight: 44 }}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowKey(v => !v)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                }}
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {status === 'error' && (
            <div style={{
              background: 'var(--danger-dim)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              fontSize: '13px',
              color: 'var(--danger)',
            }}>
              <AlertCircle size={15} style={{ marginTop: 1, flexShrink: 0 }} />
              {errorMsg}
            </div>
          )}

          {status === 'ok' && (
            <div style={{
              background: 'var(--success-dim)',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              color: 'var(--success)',
            }}>
              <CheckCircle size={15} />
              Connexion réussie ! Redirection...
            </div>
          )}

          <button
            id="btn-connect-db"
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading || !url || !key}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: 16, height: 16 }} />
                {status === 'testing' ? 'Test de connexion...' : 'Connexion...'}
              </>
            ) : (
              <>
                <Database size={16} />
                {isCurrentlyConnected ? 'Changer la base de données' : 'Se connecter'}
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Vos identifiants sont sauvegardés localement dans votre navigateur.
          </p>
        </div>

        {isCurrentlyConnected && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => router.replace('/pin')}
            >
              Continuer avec la connexion actuelle →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
