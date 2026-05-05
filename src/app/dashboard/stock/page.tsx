'use client';
import { useState, useEffect, useCallback } from 'react';
import { Package, RefreshCw, Search, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { formatMoney, formatDateTime, getDateRange, DateRange } from '@/lib/utils';
import { exportCsv, exportExcel, exportPdf } from '@/lib/export';
import DateRangePicker from '@/components/ui/DateRangePicker';
import ExportMenu from '@/components/ui/ExportMenu';

type DateMode = 'today' | 'week' | 'month' | 'custom';

// Actions du journal considérées comme mouvements stock
const STOCK_ACTIONS = [
  'Approvisionnement stock',
  'Ajustement stock',
  'Correction stock',
  'Inventaire stock',
  'Stock ajuste',
  'Stock corrige',
];

function isStockAction(action: string): boolean {
  if (!action) return false;
  const a = action.trim().toLowerCase();
  return (
    STOCK_ACTIONS.some(s => s.toLowerCase() === a) ||
    a.includes('stock') ||
    a.includes('approvisionnement') ||
    a.includes('inventaire')
  );
}

interface JournalEntry {
  uuid: string;
  date_action: string;
  categorie: string;
  action: string;
  detail: string;
  operateur: string;
  montant: number;
}

export default function StockPage() {
  const client = getSupabaseClient();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateMode, setDateMode] = useState<DateMode>('month');
  const [customRange, setCustomRange] = useState<DateRange>(getDateRange('month'));
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    const range = getDateRange(dateMode, customRange);
    const { data } = await client
      .from('journal_activite')
      .select('uuid, date_action, categorie, action, detail, operateur, montant')
      .gte('date_action', range.from)
      .lte('date_action', range.to + 'T23:59:59')
      .order('date_action', { ascending: false })
      .limit(2000);

    // Filtrer uniquement les entrées stock
    const stockData = (data || []).filter((j: JournalEntry) =>
      isStockAction(j.action) || (j.categorie || '').toLowerCase().includes('stock')
    );
    setEntries(stockData);
    setLoading(false);
  }, [client, dateMode, customRange]);

  useEffect(() => { load(); }, [load]);

  const filtered = entries.filter(e =>
    !search ||
    e.action?.toLowerCase().includes(search.toLowerCase()) ||
    e.detail?.toLowerCase().includes(search.toLowerCase()) ||
    e.operateur?.toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const totalAppros = filtered.reduce((s, e) => s + (e.montant > 0 ? e.montant : 0), 0);
  const nbMovements = filtered.length;

  const exportData = filtered.map(e => ({
    Date: formatDateTime(e.date_action),
    Catégorie: e.categorie || '',
    Action: e.action || '',
    Détail: e.detail || '',
    Opérateur: e.operateur || '—',
    'Montant (Ar)': e.montant || 0,
  }));

  const PDF_COLS = [
    { header: 'Date', key: 'Date' },
    { header: 'Action', key: 'Action' },
    { header: 'Détail', key: 'Détail' },
    { header: 'Opérateur', key: 'Opérateur' },
    { header: 'Montant', key: 'Montant (Ar)' },
  ];

  return (
    <div className="slide-up">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Stock & Approvisionnement</h1>
          <p className="page-subtitle">Mouvements de stock enregistrés dans le journal d'activité</p>
        </div>
        <div className="page-actions">
          <ExportMenu
            onExportCsv={() => exportCsv(exportData, 'stock_mouvements')}
            onExportPdf={() => exportPdf('Stock & Approvisionnement', exportData, PDF_COLS, 'stock_mouvements')}
            onExportExcel={() => exportExcel(exportData, 'stock_mouvements', 'Stock')}
          />
          <button className="btn btn-secondary btn-sm" onClick={load} id="btn-refresh-stock">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stat-grid stat-grid-2 mb-6">
        <div className="stat-card success">
          <div className="stat-icon success"><BarChart3 size={18} /></div>
          <div className="stat-value mono">{nbMovements}</div>
          <div className="stat-label">Mouvements (Période)</div>
        </div>
        <div className="stat-card violet">
          <div className="stat-icon violet"><TrendingUp size={18} /></div>
          <div className="stat-value mono">{formatMoney(totalAppros)}</div>
          <div className="stat-label">Valeur approvisionnements (Période)</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar" style={{ marginBottom: 16 }}>
        <DateRangePicker
          mode={dateMode}
          customRange={customRange}
          onChange={(m, r) => { setDateMode(m); setCustomRange(r); }}
        />
        <div style={{ position: 'relative', flex: 1, minWidth: 160, maxWidth: 320 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            id="search-stock"
            className="filter-input"
            style={{ paddingLeft: 30, width: '100%' }}
            placeholder="Chercher action, détail, opérateur..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Action</th>
              <th>Détail</th>
              <th>Opérateur</th>
              <th style={{ textAlign: 'right' }}>Montant</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5}><div className="state-box"><div className="spinner" /></div></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5}>
                <div className="state-box">
                  <div className="state-icon">📦</div>
                  <div className="state-title">Aucun mouvement de stock trouvé</div>
                  <div className="state-subtitle">Changez la période ou les filtres</div>
                </div>
              </td></tr>
            ) : filtered.map(e => (
              <tr key={e.uuid}>
                <td style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  {formatDateTime(e.date_action)}
                </td>
                <td>
                  <span className="badge badge-info" style={{ fontSize: 11 }}>
                    <Package size={11} /> {e.action || '—'}
                  </span>
                </td>
                <td style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.detail || '—'}
                </td>
                <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {e.operateur || '—'}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: e.montant > 0 ? 'var(--success)' : e.montant < 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                  {e.montant !== 0 ? formatMoney(e.montant) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && !loading && (
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>
          {filtered.length} mouvement{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
