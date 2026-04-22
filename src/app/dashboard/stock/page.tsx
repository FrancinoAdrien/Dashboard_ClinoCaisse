'use client';
import { useState, useEffect, useCallback } from 'react';
import { BarChart3, RefreshCw, Search } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { formatDateTime, getDateRange, DateRange } from '@/lib/utils';
import { exportCsv, exportExcel, exportPdf } from '@/lib/export';
import DateRangePicker from '@/components/ui/DateRangePicker';
import ExportMenu from '@/components/ui/ExportMenu';

type DateMode = 'today' | 'week' | 'month' | 'custom';

interface StockHisto {
  uuid: string; produit_nom: string; ancienne_qte: number;
  nouvelle_qte: number; delta: number; motif: string;
  operateur: string; date_op: string;
}
interface StockLot {
  uuid: string; produit_uuid: string; numero_lot: string;
  date_expiration: string; quantite_restante: number; localisation: string;
}
interface StockTransfert {
  uuid: string; produit_uuid: string; quantite: number;
  source: string; destination: string; date_transfert: string; operateur: string;
}

export default function StockPage() {
  const client = getSupabaseClient();
  const [tab, setTab] = useState<'historique' | 'lots' | 'transferts'>('historique');
  const [histo, setHisto] = useState<StockHisto[]>([]);
  const [lots, setLots] = useState<StockLot[]>([]);
  const [transferts, setTransferts] = useState<StockTransfert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateMode, setDateMode] = useState<DateMode>('month');
  const [customRange, setCustomRange] = useState<DateRange>(getDateRange('month'));
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    const range = getDateRange(dateMode, customRange);
    const [h, l, t] = await Promise.all([
      client.from('stock_historique').select('*').gte('date_op', range.from).lte('date_op', range.to + 'T23:59:59').order('date_op', { ascending: false }).limit(500),
      client.from('stock_lots').select('*').order('date_expiration'),
      client.from('stock_transferts').select('*').gte('date_transfert', range.from).lte('date_transfert', range.to + 'T23:59:59').order('date_transfert', { ascending: false }),
    ]);
    setHisto(h.data || []);
    setLots(l.data || []);
    setTransferts(t.data || []);
    setLoading(false);
  }, [client, dateMode, customRange]);

  useEffect(() => { load(); }, [load]);

  const filteredHisto = histo.filter(h => !search || h.produit_nom?.toLowerCase().includes(search.toLowerCase()) || h.motif?.toLowerCase().includes(search.toLowerCase()));

  function deltaColor(delta: number) {
    if (delta > 0) return 'var(--success)';
    if (delta < 0) return 'var(--danger)';
    return 'var(--text-muted)';
  }

  const histoExport = filteredHisto.map(h => ({
    Produit: h.produit_nom, 'Ancienne qté': h.ancienne_qte, 'Nouvelle qté': h.nouvelle_qte,
    Delta: h.delta, Motif: h.motif, Opérateur: h.operateur, Date: formatDateTime(h.date_op),
  }));

  const lotsExpirantBientot = lots.filter(l => {
    if (!l.date_expiration) return false;
    const d = new Date(l.date_expiration);
    const diff = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff <= 30 && diff >= 0;
  });

  return (
    <div className="slide-up">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Stock & Ajustements</h1>
          <p className="page-subtitle">Historique des mouvements, lots et transferts</p>
        </div>
        <div className="page-actions">
          {tab === 'historique' && (
            <ExportMenu
              onExportCsv={() => exportCsv(histoExport, 'stock_historique')}
              onExportPdf={() => exportPdf('Historique Stock', histoExport, [{ header: 'Produit', key: 'Produit' }, { header: 'Delta', key: 'Delta' }, { header: 'Motif', key: 'Motif' }, { header: 'Date', key: 'Date' }], 'stock_historique')}
              onExportExcel={() => exportExcel(histoExport, 'stock_historique', 'Historique')}
            />
          )}
          <button className="btn btn-secondary btn-sm" onClick={load}><RefreshCw size={13} /></button>
        </div>
      </div>

      {/* Tabs */}
      <div className="filter-group" style={{ marginBottom: 16, width: 'fit-content' }}>
        {(['historique', 'lots', 'transferts'] as const).map(t => (
          <button key={t} className={`filter-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)} id={`tab-stock-${t}`}>
            {t === 'historique' ? '📋 Ajustements' : t === 'lots' ? '📦 Lots' : '🔄 Transferts'}
          </button>
        ))}
      </div>

      {tab === 'historique' && (
        <>
          <div className="filters-bar">
            <DateRangePicker mode={dateMode} customRange={customRange} onChange={(m, r) => { setDateMode(m); setCustomRange(r); }} />
            <div style={{ position: 'relative', flex: 1, minWidth: 160, maxWidth: 280 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="filter-input" style={{ paddingLeft: 30, width: '100%' }} placeholder="Produit, motif..." value={search} onChange={e => setSearch(e.target.value)} id="search-stock" />
            </div>
          </div>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Produit</th><th>Motif</th><th>Opérateur</th><th style={{ textAlign: 'center' }}>Avant</th><th style={{ textAlign: 'center' }}>Delta</th><th style={{ textAlign: 'center' }}>Après</th><th>Date</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={7}><div className="state-box"><div className="spinner" /></div></td></tr>
                : filteredHisto.length === 0 ? <tr><td colSpan={7}><div className="state-box"><div className="state-icon">📊</div><div className="state-title">Aucun ajustement</div></div></td></tr>
                : filteredHisto.map(h => (
                  <tr key={h.uuid}>
                    <td style={{ fontWeight: 500 }}>{h.produit_nom || '—'}</td>
                    <td><span className="badge badge-muted">{h.motif || '—'}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{h.operateur || '—'}</td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{h.ancienne_qte ?? '—'}</td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, color: deltaColor(h.delta) }}>
                      {h.delta > 0 ? `+${h.delta}` : h.delta}
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{h.nouvelle_qte ?? '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatDateTime(h.date_op)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'lots' && (
        <>
          {lotsExpirantBientot.length > 0 && (
            <div style={{ background: 'var(--warning-dim)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius-md)', padding: '10px 16px', marginBottom: 16, fontSize: 13, color: 'var(--warning)' }}>
              ⚠️ {lotsExpirantBientot.length} lot(s) expirent dans les 30 prochains jours
            </div>
          )}
          <div className="table-wrapper">
            <table>
              <thead><tr><th>N° Lot</th><th>Localisation</th><th style={{ textAlign: 'center' }}>Qté restante</th><th>Expiration</th></tr></thead>
              <tbody>
                {lots.length === 0 ? <tr><td colSpan={4}><div className="state-box"><div className="state-icon">📦</div><div className="state-title">Aucun lot</div></div></td></tr>
                : lots.map(l => {
                  const expiring = lotsExpirantBientot.some(ex => ex.uuid === l.uuid);
                  const expired = l.date_expiration && new Date(l.date_expiration) < new Date();
                  return (
                    <tr key={l.uuid}>
                      <td className="mono">{l.numero_lot || '—'}</td>
                      <td><span className="badge badge-muted">{l.localisation}</span></td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{l.quantite_restante}</td>
                      <td style={{ color: expired ? 'var(--danger)' : expiring ? 'var(--warning)' : 'var(--text-primary)', fontSize: 12 }}>
                        {l.date_expiration ? new Date(l.date_expiration).toLocaleDateString('fr-FR') : '—'}
                        {expired ? ' ❌ Expiré' : expiring ? ' ⚠️ Bientôt' : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'transferts' && (
        <>
          <div className="filters-bar">
            <DateRangePicker mode={dateMode} customRange={customRange} onChange={(m, r) => { setDateMode(m); setCustomRange(r); }} />
          </div>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Source</th><th>Destination</th><th style={{ textAlign: 'center' }}>Quantité</th><th>Opérateur</th><th>Date</th></tr></thead>
              <tbody>
                {transferts.length === 0 ? <tr><td colSpan={5}><div className="state-box"><div className="state-icon">🔄</div><div className="state-title">Aucun transfert</div></div></td></tr>
                : transferts.map(t => (
                  <tr key={t.uuid}>
                    <td><span className="badge badge-muted">{t.source}</span></td>
                    <td><span className="badge badge-info">{t.destination}</span></td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{t.quantite}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t.operateur || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatDateTime(t.date_transfert)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
