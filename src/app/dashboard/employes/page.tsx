'use client';
import { useState, useEffect, useCallback } from 'react';
import { Users, RefreshCw, Search, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { formatMoney, formatDate, getDateRange, DateRange } from '@/lib/utils';
import { exportCsv, exportExcel, exportPdf } from '@/lib/export';
import DateRangePicker from '@/components/ui/DateRangePicker';
import ExportMenu from '@/components/ui/ExportMenu';

type DateMode = 'today' | 'week' | 'month' | 'custom';

interface Employe { uuid: string; nom: string; poste: string; salaire_base: number; date_embauche: string; actif: number; }
interface Salaire { uuid: string; employe_uuid: string; type_paiement: string; montant: number; date_paiement: string; operateur: string; }

export default function EmployesPage() {
  const client = getSupabaseClient();
  const [employes, setEmployes] = useState<Employe[]>([]);
  const [salaires, setSalaires] = useState<Salaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActif, setFilterActif] = useState('1');
  const [dateMode, setDateMode] = useState<DateMode>('month');
  const [customRange, setCustomRange] = useState<DateRange>(getDateRange('month'));
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    const range = getDateRange(dateMode, customRange);
    const [e, s] = await Promise.all([
      client.from('employes').select('*').order('nom'),
      client.from('salaires_paiements').select('*').gte('date_paiement', range.from).lte('date_paiement', range.to + 'T23:59:59').order('date_paiement', { ascending: false }),
    ]);
    setEmployes(e.data || []);
    setSalaires(s.data || []);
    setLoading(false);
  }, [client, dateMode, customRange]);

  useEffect(() => { load(); }, [load]);

  const filtered = employes.filter(e => {
    if (filterActif !== '' && String(e.actif) !== filterActif) return false;
    if (search && !e.nom?.toLowerCase().includes(search.toLowerCase()) && !e.poste?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalMasseSalariale = salaires.reduce((s: number, p: Salaire) => s + (p.montant || 0), 0);
  const totalBaseSalariale = filtered.filter(e => e.actif).reduce((s, e) => s + (e.salaire_base || 0), 0);

  function getSalairesEmploye(empUuid: string) {
    return salaires.filter(s => s.employe_uuid === empUuid);
  }

  const exportData = filtered.map(e => ({
    Nom: e.nom, Poste: e.poste || '', 'Salaire base (Ar)': e.salaire_base,
    "Date d'embauche": formatDate(e.date_embauche), Statut: e.actif ? 'Actif' : 'Inactif',
  }));

  return (
    <div className="slide-up">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Employés</h1>
          <p className="page-subtitle">{filtered.length} employé(s) · Masse salariale période : {formatMoney(totalMasseSalariale)}</p>
        </div>
        <div className="page-actions">
          <ExportMenu
            onExportCsv={() => exportCsv(exportData, 'employes')}
            onExportPdf={() => exportPdf('Liste des Employés', exportData, [{ header: 'Nom', key: 'Nom' }, { header: 'Poste', key: 'Poste' }, { header: 'Salaire', key: 'Salaire base (Ar)' }, { header: 'Statut', key: 'Statut' }], 'employes')}
            onExportExcel={() => exportExcel(exportData, 'employes', 'Employés')}
          />
          <button className="btn btn-secondary btn-sm" onClick={load}><RefreshCw size={13} /></button>
        </div>
      </div>

      <div className="stat-grid stat-grid-3 mb-4">
        <div className="stat-card violet"><div className="stat-icon violet"><Users size={18} /></div><div className="stat-value mono">{employes.filter(e => e.actif).length}</div><div className="stat-label">Employés actifs</div></div>
        <div className="stat-card cyan"><div className="stat-icon cyan"><DollarSign size={18} /></div><div className="stat-value mono">{formatMoney(totalBaseSalariale)}</div><div className="stat-label">Base salariale mensuelle</div></div>
        <div className="stat-card success"><div className="stat-icon success"><DollarSign size={18} /></div><div className="stat-value mono">{formatMoney(totalMasseSalariale)}</div><div className="stat-label">Salaires payés (période)</div></div>
      </div>

      <div className="filters-bar">
        <div style={{ position: 'relative', flex: 1, minWidth: 160, maxWidth: 280 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="filter-input" style={{ paddingLeft: 30, width: '100%' }} placeholder="Chercher nom, poste..." value={search} onChange={e => setSearch(e.target.value)} id="search-employes" />
        </div>
        <select className="filter-select" value={filterActif} onChange={e => setFilterActif(e.target.value)} id="filter-actif-employe">
          <option value="">Tous</option>
          <option value="1">Actifs</option>
          <option value="0">Inactifs</option>
        </select>
        <DateRangePicker mode={dateMode} customRange={customRange} onChange={(m, r) => { setDateMode(m); setCustomRange(r); }} />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <div className="state-box"><div className="spinner" /></div>
        : filtered.length === 0 ? <div className="state-box"><div className="state-icon">👥</div><div className="state-title">Aucun employé</div></div>
        : filtered.map(emp => {
          const empSalaires = getSalairesEmploye(emp.uuid);
          const totalPaye = empSalaires.reduce((s, p) => s + (p.montant || 0), 0);
          const isExpanded = expanded === emp.uuid;
          return (
            <div key={emp.uuid} style={{ borderBottom: '1px solid var(--border)' }}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', cursor: empSalaires.length > 0 ? 'pointer' : 'default', transition: 'background 0.15s' }}
                onClick={() => empSalaires.length > 0 && setExpanded(isExpanded ? null : emp.uuid)}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, var(--accent-violet), var(--accent-cyan))', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white', fontSize: 14, flexShrink: 0 }}>
                  {(emp.nom || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{emp.nom}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{emp.poste || 'Sans poste'} · Embauché le {formatDate(emp.date_embauche)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="mono" style={{ fontWeight: 700, fontSize: 14 }}>{formatMoney(emp.salaire_base)}<span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>/mois</span></div>
                  {totalPaye > 0 && <div style={{ fontSize: 12, color: 'var(--success)' }}>Payé: {formatMoney(totalPaye)}</div>}
                </div>
                <span className={`badge ${emp.actif ? 'badge-success' : 'badge-danger'}`}>{emp.actif ? 'Actif' : 'Inactif'}</span>
                {empSalaires.length > 0 && (isExpanded ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />)}
              </div>
              {isExpanded && empSalaires.length > 0 && (
                <div style={{ background: 'var(--bg-primary)', padding: '0 20px 16px 76px' }}>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>Historique des paiements</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {empSalaires.map(s => (
                      <div key={s.uuid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{s.type_paiement || 'Salaire'}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(s.date_paiement)}</span>
                        <span className="mono" style={{ fontWeight: 700, color: 'var(--success)' }}>{formatMoney(s.montant)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
