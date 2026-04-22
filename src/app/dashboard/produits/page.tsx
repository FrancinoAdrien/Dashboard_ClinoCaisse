'use client';
import { useState, useEffect, useCallback } from 'react';
import { Package, AlertTriangle, Search, RefreshCw } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { formatMoney } from '@/lib/utils';
import { exportCsv, exportExcel, exportPdf } from '@/lib/export';
import ExportMenu from '@/components/ui/ExportMenu';

interface Produit {
  uuid: string; nom: string; reference?: string; description?: string;
  prix_vente_ttc: number; prix_achat: number; prix_gros: number;
  stock_actuel: number; stock_bar: number; stock_grossiste: number;
  stock_alerte: number; categorie_id?: number; fournisseur?: string;
  unite_base: string; actif: number; is_alcool: number; is_ingredient: number; is_prepared: number;
}
interface Categorie { id: number; nom: string; code: string; }

export default function ProduitsPage() {
  const client = getSupabaseClient();
  const [produits, setProduits] = useState<Produit[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterActif, setFilterActif] = useState('1');
  const [filterAlerte, setFilterAlerte] = useState(false);

  const load = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    const [p, c] = await Promise.all([
      client.from('produits').select('*').order('nom'),
      client.from('categories').select('id, nom, code').order('nom'),
    ]);
    setProduits(p.data || []);
    setCategories(c.data || []);
    setLoading(false);
  }, [client]);

  useEffect(() => { load(); }, [load]);

  const filtered = produits.filter(p => {
    if (filterActif !== '' && String(p.actif) !== filterActif) return false;
    if (filterCat && String(p.categorie_id) !== filterCat) return false;
    if (filterAlerte && !(p.stock_actuel >= 0 && p.stock_actuel <= p.stock_alerte)) return false;
    if (search && !p.nom.toLowerCase().includes(search.toLowerCase()) && !p.reference?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const alertCount = produits.filter(p => p.stock_actuel >= 0 && p.stock_actuel <= p.stock_alerte).length;

  const exportData = filtered.map(p => ({
    Nom: p.nom, Référence: p.reference || '', 'Prix vente (Ar)': p.prix_vente_ttc,
    'Prix achat (Ar)': p.prix_achat, 'Stock actuel': p.stock_actuel,
    'Stock bar': p.stock_bar, 'Stock grossiste': p.stock_grossiste,
    'Seuil alerte': p.stock_alerte, 'Unité': p.unite_base,
    Actif: p.actif ? 'Oui' : 'Non',
  }));

  const PDF_COLS = [
    { header: 'Nom', key: 'Nom' }, { header: 'Réf.', key: 'Référence' },
    { header: 'Prix vente', key: 'Prix vente (Ar)' }, { header: 'Stock', key: 'Stock actuel' },
    { header: 'Unité', key: 'Unité' }, { header: 'Actif', key: 'Actif' },
  ];

  function stockColor(p: Produit) {
    if (p.stock_actuel < 0) return 'var(--text-muted)';
    if (p.stock_actuel <= p.stock_alerte) return 'var(--danger)';
    if (p.stock_actuel <= p.stock_alerte * 1.5) return 'var(--warning)';
    return 'var(--success)';
  }

  return (
    <div className="slide-up">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Produits</h1>
          <p className="page-subtitle">{filtered.length} produit{filtered.length !== 1 ? 's' : ''} affiché{filtered.length !== 1 ? 's' : ''} {alertCount > 0 ? `• ⚠️ ${alertCount} alerte(s) stock` : ''}</p>
        </div>
        <div className="page-actions">
          <ExportMenu
            onExportCsv={() => exportCsv(exportData, 'produits')}
            onExportPdf={() => exportPdf('Catalogue Produits', exportData, PDF_COLS, 'produits')}
            onExportExcel={() => exportExcel(exportData, 'produits', 'Produits')}
          />
          <button className="btn btn-secondary btn-sm" onClick={load}><RefreshCw size={13} /></button>
        </div>
      </div>

      {alertCount > 0 && (
        <div style={{ background: 'var(--danger-dim)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--danger)', fontSize: 13 }}>
          <AlertTriangle size={16} />
          <strong>{alertCount} produit{alertCount > 1 ? 's' : ''}</strong> {alertCount > 1 ? 'sont' : 'est'} en dessous du seuil d'alerte.
          <button className="btn btn-sm" style={{ marginLeft: 'auto', background: 'var(--danger)', color: 'white', fontSize: 12 }} onClick={() => setFilterAlerte(true)}>Voir uniquement</button>
        </div>
      )}

      <div className="filters-bar">
        <div style={{ position: 'relative', flex: 1, minWidth: 180, maxWidth: 300 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="filter-input" style={{ paddingLeft: 30, width: '100%' }} placeholder="Chercher produit, référence..." value={search} onChange={e => setSearch(e.target.value)} id="search-produits" />
        </div>
        <select className="filter-select" value={filterCat} onChange={e => setFilterCat(e.target.value)} id="filter-categorie">
          <option value="">Toutes catégories</option>
          {categories.map((c, idx) => <option key={c.id || `cat-${idx}`} value={String(c.id)}>{c.nom}</option>)}
        </select>
        <select className="filter-select" value={filterActif} onChange={e => setFilterActif(e.target.value)} id="filter-actif">
          <option value="">Tous</option>
          <option value="1">Actifs</option>
          <option value="0">Inactifs</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: filterAlerte ? 'var(--danger)' : 'var(--text-secondary)' }}>
          <input type="checkbox" checked={filterAlerte} onChange={e => setFilterAlerte(e.target.checked)} id="filter-alerte-stock" />
          Alertes seulement
        </label>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Référence</th>
              <th style={{ textAlign: 'right' }}>Prix vente</th>
              <th style={{ textAlign: 'right' }}>Prix achat</th>
              <th style={{ textAlign: 'center' }}>Stock bar</th>
              <th style={{ textAlign: 'center' }}>Stock gros.</th>
              <th style={{ textAlign: 'center' }}>Seuil</th>
              <th>Unité</th>
              <th>Tags</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10}><div className="state-box"><div className="spinner" /></div></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={10}><div className="state-box"><div className="state-icon">📦</div><div className="state-title">Aucun produit</div></div></td></tr>
            ) : filtered.map(p => (
              <tr key={p.uuid}>
                <td style={{ fontWeight: 500 }}>{p.nom}</td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{p.reference || '—'}</td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatMoney(p.prix_vente_ttc)}</td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{formatMoney(p.prix_achat)}</td>
                <td style={{ textAlign: 'center', color: stockColor(p), fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  {p.stock_bar >= 0 ? p.stock_bar : '∞'}
                </td>
                <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  {p.stock_grossiste >= 0 ? p.stock_grossiste : '—'}
                </td>
                <td style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{p.stock_alerte || 0}</td>
                <td style={{ fontSize: 12 }}>{p.unite_base || 'Unité'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {p.is_alcool ? <span className="badge badge-warning" style={{ fontSize: 10 }}>🍺 Alcool</span> : null}
                    {p.is_ingredient ? <span className="badge badge-info" style={{ fontSize: 10 }}>🥗 Ingréd.</span> : null}
                    {p.is_prepared ? <span className="badge badge-violet" style={{ fontSize: 10 }}>👨‍🍳 Préparé</span> : null}
                  </div>
                </td>
                <td>
                  {p.actif ? <span className="badge badge-success">Actif</span> : <span className="badge badge-danger">Inactif</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
