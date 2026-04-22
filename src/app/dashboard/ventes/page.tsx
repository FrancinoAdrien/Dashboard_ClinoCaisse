'use client';
import { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, Eye, RefreshCw, Search } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { formatMoney, formatDateTime, modePaymentLabel, statutLabel, statutBadgeClass, getDateRange, DateRange } from '@/lib/utils';
import { exportCsv, exportPdf, exportExcel } from '@/lib/export';
import DateRangePicker from '@/components/ui/DateRangePicker';
import ExportMenu from '@/components/ui/ExportMenu';

type DateMode = 'today' | 'week' | 'month' | 'custom';

interface Vente {
  uuid: string; numero_ticket: string; date_vente: string;
  nom_caissier: string; total_ttc: number; mode_paiement: string;
  montant_paye: number; monnaie_rendue: number; statut: string;
  type_vente: string; table_numero?: number; note?: string;
}
interface LigneVente {
  uuid: string; produit_nom: string; quantite: number;
  prix_unitaire: number; remise: number; total_ttc: number;
  unite_choisie: string; est_offert: number;
}

export default function VentesPage() {
  const client = getSupabaseClient();
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateMode, setDateMode] = useState<DateMode>('today');
  const [customRange, setCustomRange] = useState<DateRange>(getDateRange('today'));
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState('');
  const [filterType, setFilterType] = useState('');
  const [selectedVente, setSelectedVente] = useState<Vente | null>(null);
  const [lignes, setLignes] = useState<LigneVente[]>([]);
  const [loadingLignes, setLoadingLignes] = useState(false);

  const load = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    const range = getDateRange(dateMode, customRange);
    let q = client.from('ventes').select('*')
      .gte('date_vente', range.from)
      .lte('date_vente', range.to + 'T23:59:59')
      .order('date_vente', { ascending: false });
    if (filterMode) q = q.eq('mode_paiement', filterMode);
    if (filterType) q = q.eq('type_vente', filterType);
    const { data } = await q;
    setVentes(data || []);
    setLoading(false);
  }, [client, dateMode, customRange, filterMode, filterType]);

  useEffect(() => { load(); }, [load]);

  async function openDetail(vente: Vente) {
    setSelectedVente(vente);
    setLoadingLignes(true);
    const { data } = await client!.from('lignes_vente').select('*').eq('vente_uuid', vente.uuid).order('uuid');
    setLignes(data || []);
    setLoadingLignes(false);
  }

  const filtered = ventes.filter(v =>
    !search || v.numero_ticket?.toLowerCase().includes(search.toLowerCase()) || v.nom_caissier?.toLowerCase().includes(search.toLowerCase())
  );

  const totalCA = filtered.reduce((s, v) => s + (v.total_ttc || 0), 0);
  const panierMoyen = filtered.length ? totalCA / filtered.length : 0;

  const CSV_COLS = [
    { header: 'Ticket', key: 'numero_ticket' },
    { header: 'Date', key: 'date_vente' },
    { header: 'Caissier', key: 'nom_caissier' },
    { header: 'Type', key: 'type_vente' },
    { header: 'Mode paiement', key: 'mode_paiement' },
    { header: 'Total (Ar)', key: 'total_ttc' },
    { header: 'Statut', key: 'statut' },
  ];

  const exportData = filtered.map(v => ({
    numero_ticket: v.numero_ticket,
    date_vente: formatDateTime(v.date_vente),
    nom_caissier: v.nom_caissier || '',
    type_vente: v.type_vente || '',
    mode_paiement: modePaymentLabel(v.mode_paiement),
    total_ttc: v.total_ttc,
    statut: statutLabel(v.statut),
  }));

  return (
    <div className="slide-up">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Ventes</h1>
          <p className="page-subtitle">{filtered.length} transaction{filtered.length !== 1 ? 's' : ''} • CA: {formatMoney(totalCA)} • Panier moyen: {formatMoney(panierMoyen)}</p>
        </div>
        <div className="page-actions">
          <ExportMenu
            onExportCsv={() => exportCsv(exportData, 'ventes')}
            onExportPdf={() => exportPdf('Rapport des Ventes', exportData, CSV_COLS, 'ventes')}
            onExportExcel={() => exportExcel(exportData, 'ventes', 'Ventes')}
          />
          <button className="btn btn-secondary btn-sm" onClick={load}><RefreshCw size={13} /></button>
        </div>
      </div>

      <div className="filters-bar">
        <DateRangePicker mode={dateMode} customRange={customRange} onChange={(m, r) => { setDateMode(m); setCustomRange(r); }} />
        <div style={{ position: 'relative', flex: 1, minWidth: 160, maxWidth: 280 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input id="search-ventes" className="filter-input" style={{ paddingLeft: 30, width: '100%' }} placeholder="Chercher ticket, caissier..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select id="filter-mode-paiement" className="filter-select" value={filterMode} onChange={e => setFilterMode(e.target.value)}>
          <option value="">Tous modes</option>
          {['CASH','MVOLA','ORANGE','AIRTEL','CARTE','COMPTE','AUTRE'].map(m => <option key={m} value={m}>{modePaymentLabel(m)}</option>)}
        </select>
        <select id="filter-type-vente" className="filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">Tous types</option>
          <option value="BAR">Bar</option>
          <option value="EMPORTE">À emporter</option>
          <option value="LIVRAISON">Livraison</option>
        </select>
      </div>

      {/* Stats rapides */}
      <div className="stat-grid stat-grid-4 mb-4">
        {[['CASH','Espèces'],['MVOLA','MVola'],['ORANGE','Orange'],['AIRTEL','Airtel']].map(([key, label]) => {
          const total = filtered.filter(v => v.mode_paiement === key).reduce((s, v) => s + (v.total_ttc || 0), 0);
          return (
            <div key={key} className="card" style={{ padding: '12px 16px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
              <div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>{formatMoney(total)}</div>
            </div>
          );
        })}
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Date / Heure</th>
              <th>Caissier</th>
              <th>Type</th>
              <th>Mode</th>
              <th>Statut</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8}><div className="state-box"><div className="spinner" /></div></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8}><div className="state-box"><div className="state-icon">🛒</div><div className="state-title">Aucune vente</div></div></td></tr>
            ) : filtered.map(v => (
              <tr key={v.uuid}>
                <td><span className="mono" style={{ color: 'var(--accent-cyan)', fontSize: 12 }}>{v.numero_ticket}</span></td>
                <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatDateTime(v.date_vente)}</td>
                <td>{v.nom_caissier || '—'}</td>
                <td><span className="badge badge-muted">{v.type_vente || 'BAR'}</span></td>
                <td><span className="badge badge-info">{modePaymentLabel(v.mode_paiement)}</span></td>
                <td><span className={`badge ${statutBadgeClass(v.statut)}`}>{statutLabel(v.statut)}</span></td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{formatMoney(v.total_ttc)}</td>
                <td>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openDetail(v)} id={`btn-detail-${v.uuid}`} title="Voir détail">
                    <Eye size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal détail */}
      {selectedVente && (
        <div className="modal-overlay" onClick={() => setSelectedVente(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3 className="modal-title">🧾 Ticket {selectedVente.numero_ticket}</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setSelectedVente(null)}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                ['Date', formatDateTime(selectedVente.date_vente)],
                ['Caissier', selectedVente.nom_caissier || '—'],
                ['Mode paiement', modePaymentLabel(selectedVente.mode_paiement)],
                ['Montant payé', formatMoney(selectedVente.montant_paye)],
                ['Monnaie rendue', formatMoney(selectedVente.monnaie_rendue)],
                ['Statut', statutLabel(selectedVente.statut)],
              ].map(([l, v]) => (
                <div key={l} style={{ background: 'var(--bg-tertiary)', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
            {selectedVente.note && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>📝 {selectedVente.note}</p>}
            <h4 style={{ marginBottom: 10, fontSize: 13 }}>Articles commandés</h4>
            {loadingLignes ? <div className="flex-center" style={{ height: 60 }}><div className="spinner" /></div> : (
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Produit</th><th style={{ textAlign: 'center' }}>Qté</th><th>Unité</th><th style={{ textAlign: 'right' }}>P.U.</th><th>Remise</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
                  <tbody>
                    {lignes.map(l => (
                      <tr key={l.uuid}>
                        <td>{l.produit_nom} {l.est_offert ? <span className="badge badge-success" style={{ fontSize: 10 }}>Offert</span> : ''}</td>
                        <td style={{ textAlign: 'center' }} className="mono">{l.quantite}</td>
                        <td>{l.unite_choisie || 'Unité'}</td>
                        <td style={{ textAlign: 'right' }} className="mono">{formatMoney(l.prix_unitaire)}</td>
                        <td>{l.remise ? `${l.remise}%` : '—'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }} className="mono">{formatMoney(l.total_ttc)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ marginTop: 16, textAlign: 'right', fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
              Total : {formatMoney(selectedVente.total_ttc)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
