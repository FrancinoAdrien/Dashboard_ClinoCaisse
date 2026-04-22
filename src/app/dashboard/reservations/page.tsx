'use client';
import { useState, useEffect, useCallback } from 'react';
import { CalendarCheck, RefreshCw, Search } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { formatDate, formatDateTime, statutLabel, statutBadgeClass, getDateRange, DateRange } from '@/lib/utils';
import { exportCsv, exportPdf, exportExcel } from '@/lib/export';
import DateRangePicker from '@/components/ui/DateRangePicker';
import ExportMenu from '@/components/ui/ExportMenu';

type DateMode = 'today' | 'week' | 'month' | 'custom';

interface Reservation { uuid: string; client_nom: string; date_reservation: string; nb_personnes: number; evenement?: string; table_numero?: number; tables_json?: string; statut: string; }

export default function ReservationsPage() {
  const client = getSupabaseClient();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateMode, setDateMode] = useState<DateMode>('week');
  const [customRange, setCustomRange] = useState<DateRange>(getDateRange('week'));
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('');

  const load = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    const range = getDateRange(dateMode, customRange);
    let q = client.from('reservations').select('*').gte('date_reservation', range.from).lte('date_reservation', range.to + 'T23:59:59').order('date_reservation');
    if (filterStatut) q = q.eq('statut', filterStatut);
    const { data } = await q;
    setReservations(data || []);
    setLoading(false);
  }, [client, dateMode, customRange, filterStatut]);

  useEffect(() => { load(); }, [load]);

  const filtered = reservations.filter(r => !search || r.client_nom?.toLowerCase().includes(search.toLowerCase()) || r.evenement?.toLowerCase().includes(search.toLowerCase()));

  const enAttente = filtered.filter(r => r.statut === 'en_attente').length;
  const confirmee = filtered.filter(r => r.statut === 'confirmee').length;

  const exportData = filtered.map(r => ({ Client: r.client_nom, Date: formatDate(r.date_reservation), Personnes: r.nb_personnes, Événement: r.evenement || '', Table: r.table_numero || '', Statut: statutLabel(r.statut) }));
  const PDF_COLS = [{ header: 'Client', key: 'Client' }, { header: 'Date', key: 'Date' }, { header: 'Pers.', key: 'Personnes' }, { header: 'Événement', key: 'Événement' }, { header: 'Statut', key: 'Statut' }];

  return (
    <div className="slide-up">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Réservations</h1>
          <p className="page-subtitle">{filtered.length} réservation(s) · {enAttente} en attente · {confirmee} confirmée(s)</p>
        </div>
        <div className="page-actions">
          <ExportMenu
            onExportCsv={() => exportCsv(exportData, 'reservations')}
            onExportPdf={() => exportPdf('Réservations Tables', exportData, PDF_COLS, 'reservations')}
            onExportExcel={() => exportExcel(exportData, 'reservations', 'Réservations')}
          />
          <button className="btn btn-secondary btn-sm" onClick={load}><RefreshCw size={13} /></button>
        </div>
      </div>

      {enAttente > 0 && (
        <div style={{ background: 'var(--warning-dim)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius-md)', padding: '10px 16px', marginBottom: 16, fontSize: 13, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <CalendarCheck size={16} />
          <strong>{enAttente}</strong> réservation(s) en attente de confirmation.
        </div>
      )}

      <div className="filters-bar">
        <DateRangePicker mode={dateMode} customRange={customRange} onChange={(m, r) => { setDateMode(m); setCustomRange(r); }} />
        <div style={{ position: 'relative', flex: 1, minWidth: 160, maxWidth: 260 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="filter-input" style={{ paddingLeft: 30, width: '100%' }} placeholder="Client, événement..." value={search} onChange={e => setSearch(e.target.value)} id="search-reservations" />
        </div>
        <select className="filter-select" value={filterStatut} onChange={e => setFilterStatut(e.target.value)} id="filter-statut-reserv">
          <option value="">Tous statuts</option>
          <option value="en_attente">En attente</option>
          <option value="confirmee">Confirmée</option>
          <option value="annulee">Annulée</option>
          <option value="terminee">Terminée</option>
        </select>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Date réservation</th>
              <th style={{ textAlign: 'center' }}>Personnes</th>
              <th>Événement</th>
              <th>Table(s)</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6}><div className="state-box"><div className="spinner" /></div></td></tr>
            : filtered.length === 0 ? <tr><td colSpan={6}><div className="state-box"><div className="state-icon">📅</div><div className="state-title">Aucune réservation</div></div></td></tr>
            : filtered.map(r => {
              let tables = r.table_numero ? `Table ${r.table_numero}` : '—';
              if (r.tables_json) { try { const t = JSON.parse(r.tables_json); if (Array.isArray(t) && t.length > 0) tables = t.map((x: any) => `T${x}`).join(', '); } catch {} }
              return (
                <tr key={r.uuid}>
                  <td style={{ fontWeight: 600 }}>{r.client_nom}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatDateTime(r.date_reservation)}</td>
                  <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{r.nb_personnes}</td>
                  <td style={{ fontSize: 12 }}>{r.evenement || '—'}</td>
                  <td><span className="badge badge-muted">{tables}</span></td>
                  <td><span className={`badge ${statutBadgeClass(r.statut)}`}>{statutLabel(r.statut)}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
