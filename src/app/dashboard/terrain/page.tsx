'use client';
import { useState, useEffect, useCallback } from 'react';
import { Map, RefreshCw, Search } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { formatMoney, formatDate, formatDateTime, statutLabel, statutBadgeClass, getDateRange, DateRange } from '@/lib/utils';
import { exportCsv, exportPdf, exportExcel } from '@/lib/export';
import DateRangePicker from '@/components/ui/DateRangePicker';
import ExportMenu from '@/components/ui/ExportMenu';

type DateMode = 'today' | 'week' | 'month' | 'custom';

interface Espace { uuid: string; id: number; nom: string; type: string; description?: string; tarif_heure: number; actif: number; type_tarif: string; }
interface ReservTerrain { uuid: string; client_nom: string; client_contact?: string; espace_id: number; date_debut: string; date_fin: string; montant_total: number; montant_paye: number; statut_paiement: string; statut: string; note?: string; operateur?: string; date_creation: string; }

export default function TerrainPage() {
  const client = getSupabaseClient();
  const [espaces, setEspaces] = useState<Espace[]>([]);
  const [reservations, setReservations] = useState<ReservTerrain[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateMode, setDateMode] = useState<DateMode>('month');
  const [customRange, setCustomRange] = useState<DateRange>(getDateRange('month'));
  const [search, setSearch] = useState('');
  const [filterEspace, setFilterEspace] = useState('');
  const [filterStatutPai, setFilterStatutPai] = useState('');

  const load = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    const range = getDateRange(dateMode, customRange);
    const [esp, res] = await Promise.all([
      client.from('espaces').select('*').order('nom'),
      client.from('reservations_terrain').select('*').gte('date_debut', range.from).lte('date_debut', range.to + 'T23:59:59').order('date_debut', { ascending: false }),
    ]);
    setEspaces(esp.data || []);
    setReservations(res.data || []);
    setLoading(false);
  }, [client, dateMode, customRange]);

  useEffect(() => { load(); }, [load]);

  const filtered = reservations.filter(r => {
    if (filterEspace && String(r.espace_id) !== filterEspace) return false;
    if (filterStatutPai && r.statut_paiement !== filterStatutPai) return false;
    if (search && !r.client_nom?.toLowerCase().includes(search.toLowerCase()) && !r.client_contact?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalCA = filtered.reduce((s, r) => s + (r.montant_total || 0), 0);
  const totalPaye = filtered.reduce((s, r) => s + (r.montant_paye || 0), 0);
  const totalRestant = totalCA - totalPaye;

  function getEspaceName(id: number) { return espaces.find(e => e.id === id)?.nom || `Espace #${id}`; }
  function paiColor(statut: string) { if (statut === 'complet') return 'badge-success'; if (statut === 'partiel') return 'badge-warning'; return 'badge-danger'; }
  function paiLabel(statut: string) { if (statut === 'complet') return 'Payé'; if (statut === 'partiel') return 'Partiel'; return 'Non payé'; }

  const exportData = filtered.map(r => ({ Client: r.client_nom, Contact: r.client_contact || '', Espace: getEspaceName(r.espace_id), 'Début': formatDateTime(r.date_debut), 'Fin': formatDateTime(r.date_fin), 'Total (Ar)': r.montant_total, 'Payé (Ar)': r.montant_paye, 'Reste (Ar)': r.montant_total - r.montant_paye, Paiement: paiLabel(r.statut_paiement), Statut: statutLabel(r.statut) }));

  return (
    <div className="slide-up">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Terrain & Espaces</h1>
          <p className="page-subtitle">{filtered.length} réservation(s) · CA: {formatMoney(totalCA)} · Payé: {formatMoney(totalPaye)} · Reste: {formatMoney(totalRestant)}</p>
        </div>
        <div className="page-actions">
          <ExportMenu
            onExportCsv={() => exportCsv(exportData, 'terrain')}
            onExportPdf={() => exportPdf('Réservations Terrain', exportData, [{ header: 'Client', key: 'Client' }, { header: 'Espace', key: 'Espace' }, { header: 'Début', key: 'Début' }, { header: 'Total', key: 'Total (Ar)' }, { header: 'Paiement', key: 'Paiement' }], 'terrain')}
            onExportExcel={() => exportExcel(exportData, 'terrain', 'Terrain')}
          />
          <button className="btn btn-secondary btn-sm" onClick={load}><RefreshCw size={13} /></button>
        </div>
      </div>

      {/* KPI espaces */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {espaces.filter(e => e.actif).map(esp => (
          <div key={esp.uuid} className="card" style={{ flex: '1 1 160px', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{esp.type.toUpperCase()}</div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{esp.nom}</div>
            {esp.tarif_heure > 0 && <div style={{ fontSize: 12, color: 'var(--accent-cyan)' }}>{formatMoney(esp.tarif_heure)}/{esp.type_tarif || 'h'}</div>}
            <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 4 }}>
              {filtered.filter(r => r.espace_id === esp.id).length} réservation(s)
            </div>
          </div>
        ))}
      </div>

      <div className="stat-grid stat-grid-3 mb-4">
        <div className="stat-card violet"><div className="stat-icon violet"><Map size={18} /></div><div className="stat-value mono">{formatMoney(totalCA)}</div><div className="stat-label">Revenus terrain</div></div>
        <div className="stat-card success"><div className="stat-icon success"><Map size={18} /></div><div className="stat-value mono">{formatMoney(totalPaye)}</div><div className="stat-label">Montant encaissé</div></div>
        <div className="stat-card warning"><div className="stat-icon warning"><Map size={18} /></div><div className="stat-value mono">{formatMoney(totalRestant)}</div><div className="stat-label">Reste à encaisser</div></div>
      </div>

      <div className="filters-bar">
        <DateRangePicker mode={dateMode} customRange={customRange} onChange={(m, r) => { setDateMode(m); setCustomRange(r); }} />
        <div style={{ position: 'relative', flex: 1, minWidth: 150, maxWidth: 240 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="filter-input" style={{ paddingLeft: 30, width: '100%' }} placeholder="Client, contact..." value={search} onChange={e => setSearch(e.target.value)} id="search-terrain" />
        </div>
        <select className="filter-select" value={filterEspace} onChange={e => setFilterEspace(e.target.value)} id="filter-espace">
          <option value="">Tous les espaces</option>
          {espaces.map(e => <option key={e.uuid} value={String(e.id)}>{e.nom}</option>)}
        </select>
        <select className="filter-select" value={filterStatutPai} onChange={e => setFilterStatutPai(e.target.value)} id="filter-paiement-terrain">
          <option value="">Tous paiements</option>
          <option value="en_attente">Non payé</option>
          <option value="partiel">Partiel</option>
          <option value="complet">Payé complet</option>
        </select>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Contact</th>
              <th>Espace</th>
              <th>Début</th>
              <th>Fin</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th style={{ textAlign: 'right' }}>Payé</th>
              <th style={{ textAlign: 'right' }}>Reste</th>
              <th>Paiement</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={10}><div className="state-box"><div className="spinner" /></div></td></tr>
            : filtered.length === 0 ? <tr><td colSpan={10}><div className="state-box"><div className="state-icon">🏟️</div><div className="state-title">Aucune réservation</div></div></td></tr>
            : filtered.map(r => (
              <tr key={r.uuid}>
                <td style={{ fontWeight: 600 }}>{r.client_nom}</td>
                <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.client_contact || '—'}</td>
                <td><span className="badge badge-violet">{getEspaceName(r.espace_id)}</span></td>
                <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatDateTime(r.date_debut)}</td>
                <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatDateTime(r.date_fin)}</td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatMoney(r.montant_total)}</td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>{formatMoney(r.montant_paye)}</td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: r.montant_total > r.montant_paye ? 'var(--danger)' : 'var(--success)' }}>{formatMoney(r.montant_total - r.montant_paye)}</td>
                <td><span className={`badge ${paiColor(r.statut_paiement)}`}>{paiLabel(r.statut_paiement)}</span></td>
                <td><span className={`badge ${statutBadgeClass(r.statut)}`}>{statutLabel(r.statut)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
