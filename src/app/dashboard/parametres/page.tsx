'use client';
import { useState, useEffect, useCallback } from 'react';
import { Settings, RefreshCw, Database, Server } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { getDbUrl, getDbLabel } from '@/lib/auth';

interface Parametre { uuid: string; cle: string; valeur: string; date_maj?: string; }

const PARAM_GROUPS: { title: string; icon: string; keys: string[] }[] = [
  { title: 'Entreprise', icon: '🏢', keys: ['entreprise.nom','entreprise.adresse','entreprise.ville','entreprise.telephone','entreprise.email','entreprise.nif','entreprise.stat','entreprise.slogan'] },
  { title: 'Caisse', icon: '💰', keys: ['caisse.devise','caisse.nom_poste','caisse.version','caisse.remise1','caisse.remise2'] },
  { title: 'Impression', icon: '🖨️', keys: ['impression.imprimante','impression.largeur','impression.copies_ticket','impression.copies_cloture','impression.actif'] },
  { title: 'Licence', icon: '🔑', keys: ['license.first_launch'] },
];

function ParamCard({ title, icon, params, group }: { title: string; icon: string; params: Record<string, string>; group: typeof PARAM_GROUPS[0] }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">{icon} {title}</h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {group.keys.map(k => {
          const v = params[k];
          const label = k.split('.').slice(1).join('.').replace(/_/g, ' ');
          return (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(48,54,61,0.4)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, fontFamily: k.includes('license') ? 'var(--font-mono)' : 'inherit', maxWidth: 200, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {v == null || v === '' ? <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Non défini</span> : v}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ParametresPage() {
  const client = getSupabaseClient();
  const [params, setParams] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [dbInfo, setDbInfo] = useState({ url: '', label: '' });

  const load = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    const { data } = await client.from('parametres').select('cle, valeur');
    const map: Record<string, string> = {};
    (data || []).forEach((p: Parametre) => { if (p.cle) map[p.cle] = p.valeur; });
    setParams(map);
    setDbInfo({ url: getDbUrl(), label: getDbLabel() });
    setLoading(false);
  }, [client]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="state-box"><div className="spinner" style={{ width: 32, height: 32 }} /></div>;

  return (
    <div className="slide-up">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Paramètres</h1>
          <p className="page-subtitle">Configuration système (lecture seule depuis le dashboard)</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm" onClick={load}><RefreshCw size={13} /> Actualiser</button>
        </div>
      </div>

      {/* DB Info Card */}
      <div className="card" style={{ marginBottom: 24, background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(6,182,212,0.06))', borderColor: 'rgba(124,58,237,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, var(--accent-violet), var(--accent-cyan))', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Database size={20} style={{ color: 'white' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>Base de données connectée</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 7, height: 7, background: 'var(--success)', borderRadius: '50%' }} />
                <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>Connecté</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>•</span>
              <span className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{dbInfo.url}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Projet</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-violet-light)' }}>{dbInfo.label}</div>
          </div>
        </div>
      </div>

      {/* Params Groups */}
      <div className="grid-2">
        {PARAM_GROUPS.map(g => (
          <ParamCard key={g.title} title={g.title} icon={g.icon} params={params} group={g} />
        ))}
      </div>

      {/* All other params */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <h3 className="card-title"><Server size={15} /> Tous les paramètres ({Object.keys(params).length})</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
          {Object.entries(params)
            .filter(([k]) => k !== 'license.activated')
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => (
            <div key={k} style={{ background: 'var(--bg-tertiary)', borderRadius: 8, padding: '8px 12px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 3 }}>{k}</div>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {v || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontWeight: 400 }}>vide</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
