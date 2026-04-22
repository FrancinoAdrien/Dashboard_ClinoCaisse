'use client';
import { useState, useEffect, useCallback } from 'react';
import { BookOpen, RefreshCw, Search } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { formatMoney, formatDateTime, getDateRange, DateRange } from '@/lib/utils';
import { exportCsv, exportExcel, exportPdf } from '@/lib/export';
import DateRangePicker from '@/components/ui/DateRangePicker';
import ExportMenu from '@/components/ui/ExportMenu';

type DateMode = 'today' | 'week' | 'month' | 'custom';

interface JournalEntry { uuid: string; date_action: string; categorie: string; action: string; detail?: string; operateur?: string; montant?: number; icone?: string; }

const CATEGORY_COLORS: Record<string, string> = {
  vente: 'badge-success', stock: 'badge-warning', caisse: 'badge-violet',
  cloture: 'badge-info', employe: 'badge-cyan', reservation: 'badge-muted',
  parametres: 'badge-muted', finance: 'badge-danger',
};

const CATEGORIES = ['vente','stock','caisse','cloture','employe','reservation','parametres','finance'];

export default function JournalPage() {
  const client = getSupabaseClient();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateMode, setDateMode] = useState<DateMode>('today');
  const [customRange, setCustomRange] = useState<DateRange>(getDateRange('today'));
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterOp, setFilterOp] = useState('');

  const load = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    const range = getDateRange(dateMode, customRange);
    let q = client.from('journal_activite').select('*').gte('date_action', range.from).lte('date_action', range.to + 'T23:59:59').order('date_action', { ascending: false }).limit(500);
    if (filterCat) q = q.eq('categorie', filterCat);
    if (filterOp) q = q.ilike('operateur', `%${filterOp}%`);
    const { data } = await q;
    setEntries(data || []);
    setLoading(false);
  }, [client, dateMode, customRange, filterCat, filterOp]);

  useEffect(() => { load(); }, [load]);

  const filtered = entries.filter(e => !search || e.action?.toLowerCase().includes(search.toLowerCase()) || e.detail?.toLowerCase().includes(search.toLowerCase()) || e.operateur?.toLowerCase().includes(search.toLowerCase()));

  const operateurs = [...new Set(entries.map(e => e.operateur).filter(Boolean))];

  const exportData = filtered.map(e => ({ Date: formatDateTime(e.date_action), Catégorie: e.categorie, Action: e.action, Détail: e.detail || '', Opérateur: e.operateur || '', Montant: e.montant || '' }));

  return (
    <div className="slide-up">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Journal d'Activité</h1>
          <p className="page-subtitle">{filtered.length} entrée(s) dans la période sélectionnée</p>
        </div>
        <div className="page-actions">
          <ExportMenu
            onExportCsv={() => exportCsv(exportData, 'journal')}
            onExportPdf={() => exportPdf("Journal d'Activité", exportData, [{ header: 'Date', key: 'Date' }, { header: 'Catégorie', key: 'Catégorie' }, { header: 'Action', key: 'Action' }, { header: 'Opérateur', key: 'Opérateur' }], 'journal')}
            onExportExcel={() => exportExcel(exportData, 'journal', 'Journal')}
          />
          <button className="btn btn-secondary btn-sm" onClick={load}><RefreshCw size={13} /></button>
        </div>
      </div>

      <div className="filters-bar">
        <DateRangePicker mode={dateMode} customRange={customRange} onChange={(m, r) => { setDateMode(m); setCustomRange(r); }} />
        <div style={{ position: 'relative', flex: 1, minWidth: 150, maxWidth: 240 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="filter-input" style={{ paddingLeft: 30, width: '100%' }} placeholder="Action, détail..." value={search} onChange={e => setSearch(e.target.value)} id="search-journal" />
        </div>
        <select className="filter-select" value={filterCat} onChange={e => setFilterCat(e.target.value)} id="filter-categorie-journal">
          <option value="">Toutes catégories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
        <select className="filter-select" value={filterOp} onChange={e => setFilterOp(e.target.value)} id="filter-operateur-journal">
          <option value="">Tous opérateurs</option>
          {operateurs.map(o => <option key={o} value={o!}>{o}</option>)}
        </select>
      </div>

      {/* Timeline view */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? <div className="state-box"><div className="spinner" /></div>
        : filtered.length === 0 ? <div className="state-box"><div className="state-icon">📋</div><div className="state-title">Aucune activité</div><p className="state-subtitle">Aucune entrée dans la période sélectionnée</p></div>
        : (
          <div style={{ padding: '8px 0' }}>
            {filtered.map((e, idx) => {
              const isNewDay = idx === 0 || new Date(filtered[idx - 1].date_action).toDateString() !== new Date(e.date_action).toDateString();
              return (
                <div key={e.uuid}>
                  {isNewDay && (
                    <div style={{ background: 'var(--bg-tertiary)', padding: '6px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}>
                      {new Date(e.date_action).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 20px', borderBottom: '1px solid rgba(48,54,61,0.4)', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}>
                    <div style={{ fontSize: 20, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-tertiary)', borderRadius: '50%', flexShrink: 0, border: '1px solid var(--border)' }}>
                      {e.icone || '📌'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{e.action}</span>
                          <span className={`badge ${CATEGORY_COLORS[e.categorie] || 'badge-muted'}`} style={{ marginLeft: 8, fontSize: 10 }}>{e.categorie}</span>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {new Date(e.date_action).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {e.montant != null && e.montant !== 0 && (
                            <div className="mono" style={{ fontSize: 12, fontWeight: 700, color: e.montant >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                              {e.montant >= 0 ? '+' : ''}{formatMoney(e.montant)}
                            </div>
                          )}
                        </div>
                      </div>
                      {e.detail && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{e.detail}</p>}
                      {e.operateur && (
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>👤 {e.operateur}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
