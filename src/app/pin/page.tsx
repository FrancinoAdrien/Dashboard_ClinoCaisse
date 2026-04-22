'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Delete, ArrowLeft } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { saveAdminSession, isDbConnected, clearDbCredentials } from '@/lib/auth';
import { initSupabaseFromStorage, getSupabaseClient } from '@/lib/supabase';

interface Admin {
  uuid: string;
  nom: string;
  prenom: string;
  role: string;
  pin: string;
}

export default function PinPage() {
  const router = useRouter();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [selected, setSelected] = useState<Admin | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (!isDbConnected()) { router.replace('/connect'); return; }
    initSupabaseFromStorage();
    loadAdmins();
  }, [router]);

  async function loadAdmins() {
    const client = getSupabaseClient();
    if (!client) { router.replace('/connect'); return; }
    const { data, error } = await client
      .from('utilisateurs')
      .select('uuid, nom, prenom, role, pin')
      .eq('role', 'admin')
      .eq('actif', 1)
      .order('nom');
    if (error) {
      setError('Impossible de charger les administrateurs.');
    } else {
      setAdmins(data || []);
      if (data && data.length === 1) setSelected(data[0]);
    }
    setLoading(false);
  }

  function handleKey(k: string) {
    setError('');
    if (k === 'DEL') { setPin(p => p.slice(0, -1)); return; }
    if (k === 'OK') { verifyPin(); return; }
    if (pin.length < 6) setPin(p => p + k);
  }

  function verifyPin() {
    if (!selected) { setError('Sélectionnez un administrateur'); return; }
    if (pin === selected.pin) {
      saveAdminSession({ uuid: selected.uuid, nom: selected.nom, prenom: selected.prenom, role: selected.role });
      router.replace('/dashboard');
    } else {
      setError('Code PIN incorrect');
      setPin('');
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  }

  useEffect(() => {
    if (pin.length === 4 && selected) verifyPin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const keys = ['1','2','3','4','5','6','7','8','9','DEL','0','OK'];

  if (loading) return (
    <div className="auth-layout">
      <div className="flex-center" style={{ flexDirection: 'column', gap: 16 }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
        <p className="text-muted">Chargement des administrateurs...</p>
      </div>
    </div>
  );

  return (
    <div className="auth-layout">
      <div className="auth-card" style={{ maxWidth: 420 }}>
        <div className="auth-logo">
          <div className="auth-logo-icon">🏪</div>
          <span className="auth-logo-text">ClinoCaisse</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { clearDbCredentials(); router.replace('/connect'); }}
            style={{ fontSize: 12 }}
          >
            <ArrowLeft size={14} />
            Changer de base
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
            <Shield size={13} />
            Accès Administrateur
          </div>
        </div>

        {admins.length === 0 ? (
          <div className="state-box">
            <div className="state-icon">👤</div>
            <div className="state-title">Aucun administrateur</div>
            <p className="state-subtitle">Aucun compte admin actif trouvé dans cette base de données.</p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 16 }}>
              Sélectionnez votre compte
            </p>

            <div className="admins-grid">
              {admins.map(admin => (
                <div
                  key={admin.uuid}
                  className={`admin-card ${selected?.uuid === admin.uuid ? 'selected' : ''}`}
                  onClick={() => { setSelected(admin); setPin(''); setError(''); }}
                  id={`admin-${admin.uuid}`}
                >
                  <div className="admin-card-avatar">
                    {getInitials(admin.nom, admin.prenom)}
                  </div>
                  <div className="admin-card-name">{admin.nom}</div>
                  {admin.prenom && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{admin.prenom}</div>
                  )}
                </div>
              ))}
            </div>

            {selected && (
              <>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 4 }}>
                  Code PIN — <strong style={{ color: 'var(--text-primary)' }}>{selected.nom}</strong>
                </p>

                <div
                  className="pin-display"
                  style={shake ? { animation: 'shake 0.5s ease' } : {}}
                >
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`} />
                  ))}
                </div>

                {error && (
                  <p style={{ textAlign: 'center', color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>
                    {error}
                  </p>
                )}

                <div className="pin-pad">
                  {keys.map(k => (
                    <button
                      key={k}
                      id={`pin-key-${k}`}
                      className={`pin-key ${k === 'DEL' ? 'delete' : ''} ${k === 'OK' ? 'confirm' : ''}`}
                      onClick={() => handleKey(k)}
                    >
                      {k === 'DEL' ? <Delete size={18} /> : k}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
