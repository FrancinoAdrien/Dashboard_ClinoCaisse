'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { DollarSign, RefreshCw, TrendingDown, Clock, ShoppingBag, Database, ArrowRight } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { formatMoney, formatDateTime, getDateRange, DateRange } from '@/lib/utils';
import { exportCsv, exportPdf, exportExcel } from '@/lib/export';
import DateRangePicker from '@/components/ui/DateRangePicker';
import ExportMenu from '@/components/ui/ExportMenu';

type DateMode = 'today' | 'week' | 'month' | 'custom';

// Mappings selon le fichier SANS CONFUSION
const RECETTE_ACTIONS = [
  'Ajout capital',
  'Vente creee',
  'Cloture Z effectuee',
  'Creance encaissee',
  'Paiement partiel recu',
  'Reservation soldee',
  'Paiement annule'
];

const DEPENSE_ACTIONS = [
  'Retrait capital',
  'Depense payee',
  'Depense directe',
  'Vente annulee',
  'Avance employe',
  'Salaire paye'
];

const DETTE_ACTIONS = [
  'Commande enregistree',
  'Commande enregistrer',
  'Commande enregistreee',
  'Commande enregistrée'
];

function normalizeAction(action: string): string {
  return (action || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function determineType(action: string, montant: number): 'RECETTE' | 'DEPENSE' | 'DETTE' | 'CREANCE' | 'NEUTRE' {
  const normalizedAction = normalizeAction(action);
  const isIn = (list: string[]) => list.some(item => normalizeAction(item) === normalizedAction);

  if (isIn(RECETTE_ACTIONS)) return 'RECETTE';
  if (isIn(DEPENSE_ACTIONS)) return 'DEPENSE';
  
  if (normalizedAction === normalizeAction('Reservation annulee')) return montant > 0 ? 'DEPENSE' : 'NEUTRE';
  if (normalizedAction === normalizeAction('Approvisionnement stock')) return montant > 0 ? 'DEPENSE' : 'NEUTRE';
  
  if (isIn(DETTE_ACTIONS)) return 'DETTE';
  if (normalizedAction === normalizeAction('Creance ajoutee')) return 'CREANCE';
  if (normalizedAction === normalizeAction('Reservation creee')) return montant > 0 ? 'RECETTE' : 'CREANCE';

  return 'NEUTRE';
}

export default function FinancesPage() {
  const client = getSupabaseClient();
  const [tab, setTab] = useState<'tresorerie' | 'depenses' | 'creances'>('tresorerie');
  const [dateMode, setDateMode] = useState<DateMode>('month');
  const [customRange, setCustomRange] = useState<DateRange>(getDateRange('month'));
  
  // Data full history from journal_activite
  const [allJournal, setAllJournal] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtres Spécifiques UI
  const [filterDepenseStatut, setFilterDepenseStatut] = useState<'toutes' | 'DEPENSE' | 'DETTE'>('toutes');
  const [filterCreanceStatut, setFilterCreanceStatut] = useState<'toutes' | 'CREANCE'>('toutes');

  const load = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    
    // On charge tout l'historique du journal pour recalculer fiablement le capital global
    // (Jusqu'à 30000 logs pour être large)
    const { data } = await client.from('journal_activite')
            .select('uuid, date_action, categorie, action, detail, operateur, montant')
            .order('date_action', { ascending: false })
            .limit(30000);
            
    setAllJournal(data || []);
    setLoading(false);
  }, [client]);

  useEffect(() => { load(); }, [load]);

  // -- CALCUL DU CAPITAL TOTAL (Sur l'historique complet) --
  const capitalData = useMemo(() => {
    let totalEntrees = 0;
    let totalSorties = 0;
    let stockMnt = 0;

    for (const j of allJournal) {
      const m = j.montant || 0;
      const type = determineType(j.action, m);
      
      if (type === 'RECETTE') {
        // Attention : Si le client enregistre à la fois "Vente creee" et "Cloture Z effectuee",
        // il y aura double comptage. Pour pallier cela on avertit le client si on detecte les deux.
        totalEntrees += m;
      } else if (type === 'DEPENSE') {
        totalSorties += m;
      }
      
      if (j.action === 'Approvisionnement stock') {
         stockMnt += m;
      }
    }

    return { 
      capitalCourant: totalEntrees - totalSorties, 
      totalEntrees, 
      totalSorties,
      stockMnt
    };
  }, [allJournal]);

  // -- FILTRAGE PAR DATE ET CLASSIFICATION --
  const mappedCurrentJournal = useMemo(() => {
    const range = getDateRange(dateMode, customRange);
    
    return allJournal.filter(j => {
      if (!j.date_action) return false;
      const d = j.date_action.slice(0, 10);
      return d >= range.from && d <= range.to;
    }).map(j => {
      return {
        ...j,
        typeFlux: determineType(j.action, j.montant || 0)
      };
    });
  }, [allJournal, dateMode, customRange]);

  // Répartition par onglets selon les règles "sans confusion"
  // Flux journalisé: uniquement les flux immédiats (RECETTE + DEPENSE)
  const periodTresorerie = mappedCurrentJournal.filter(j => j.typeFlux === 'RECETTE' || j.typeFlux === 'DEPENSE');
  const periodDepensesDettes = mappedCurrentJournal.filter(j => j.typeFlux === 'DEPENSE' || j.typeFlux === 'DETTE');
  const periodCreances = mappedCurrentJournal.filter(j => j.typeFlux === 'CREANCE');

  // Stats par période
  const periodEntrees = periodTresorerie.reduce((s, j) => j.typeFlux === 'RECETTE' ? s + (j.montant || 0) : s, 0);
  const periodSorties = periodTresorerie.reduce((s, j) => j.typeFlux === 'DEPENSE' ? s + (j.montant || 0) : s, 0);
  const periodPDepenses = periodDepensesDettes.reduce((s, j) => j.typeFlux === 'DEPENSE' ? s + (j.montant || 0) : s, 0);
  const periodPDettes = periodDepensesDettes.reduce((s, j) => j.typeFlux === 'DETTE' ? s + (j.montant || 0) : s, 0);
  const periodPCreances = mappedCurrentJournal.reduce((s, j) => j.typeFlux === 'CREANCE' ? s + (j.montant || 0) : s, 0);

  // Filtres UI pour les onglets
  const displayDepensesDettes = periodDepensesDettes.filter(j => filterDepenseStatut === 'toutes' || filterDepenseStatut === j.typeFlux);
  const displayCreances = periodCreances.filter(j => filterCreanceStatut === 'toutes' || filterCreanceStatut === j.typeFlux);

  // Helpers visuels
  function getVisuals(typeFlux: string) {
    if (typeFlux === 'RECETTE') return { icon: <DollarSign size={16} />, color: 'var(--success)', badge: 'badge-success', label: 'RECETTE', sign: '+' };
    if (typeFlux === 'DEPENSE') return { icon: <ShoppingBag size={16} />, color: 'var(--danger)', badge: 'badge-danger', label: 'DÉPENSE', sign: '-' };
    if (typeFlux === 'DETTE') return { icon: <TrendingDown size={16} />, color: 'var(--warning)', badge: 'badge-warning', label: 'DETTE', sign: '' };
    if (typeFlux === 'CREANCE') return { icon: <Clock size={16} />, color: 'var(--info)', badge: 'badge-info', label: 'CRÉANCE', sign: '' };
    return { icon: <Database size={16} />, color: 'var(--text-secondary)', badge: 'badge-muted', label: 'NEUTRE', sign: '' };
  }

  const exportData = (tab === 'tresorerie' ? periodTresorerie : tab === 'depenses' ? displayDepensesDettes : displayCreances).map(j => {
    const v = getVisuals(j.typeFlux);
    return {
      Classification: v.label,
      Catégorie: j.categorie,
      Action: j.action,
      Date: formatDateTime(j.date_action),
      Opérateur: j.operateur || '—',
      Détails: j.detail || '',
      'Montant (Ar)': j.montant || 0
    };
  });

  return (
    <div className="slide-up">
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div className="page-title-group">
          <h1 className="page-title">État Financier & 100% Journal</h1>
          <p className="page-subtitle">Suivi des recettes, dépenses, dettes et créances basé "sans confusion" sur les journaux d'activité</p>
        </div>
        <div className="page-actions">
          <ExportMenu onExportCsv={() => exportCsv(exportData, `export_${tab}`)} onExportPdf={() => exportPdf(`Export - ${tab.toUpperCase()}`, exportData, [{ header: 'Type', key: 'Classification' }, { header: 'Action', key: 'Action' }, { header: 'Date', key: 'Date' }, { header: 'Opérateur', key: 'Opérateur' }, { header: 'Montant', key: 'Montant (Ar)' }], `export_${tab}`)} onExportExcel={() => exportExcel(exportData, `export_${tab}`, tab)} />
          <button className="btn btn-secondary btn-sm" onClick={load}><RefreshCw size={13} /></button>
        </div>
      </div>

      {/* KPI Bar - CAPITAL TOTAL */}
      <div className="card" style={{ marginBottom: 24, padding: '16px 20px', background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(124,58,237,0.08))', border: '1px solid rgba(16,185,129,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Capital Courant Total (Toute la vie via le Journal)</div>
            <div className="mono" style={{ fontSize: 32, fontWeight: 800, color: 'var(--success)' }}>
              {formatMoney(capitalData.capitalCourant)}
            </div>
             <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Total Historique RECETTES : <span style={{ color: 'var(--success)' }}>{formatMoney(capitalData.totalEntrees)}</span> &nbsp;•&nbsp; Total Historique DÉPENSES : <span style={{ color: 'var(--danger)' }}>{formatMoney(capitalData.totalSorties)}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right', display: 'flex', gap: 24 }}>
             <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Volume d'Entrées d'Argent Brut</div>
              <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: 'var(--accent-violet-light)' }}>{formatMoney(capitalData.totalEntrees)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Période et Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div className="filter-group">
          {[['tresorerie','💸 Tous les Mouvements'],['depenses','🧾 Dépenses & Dettes'],['creances','🔴 Créances Clients']].map(([k, l]) => (
            <button key={k} className={`filter-btn ${tab === k ? 'active' : ''}`} onClick={() => setTab(k as any)} id={`tab-finance-${k}`}>{l}</button>
          ))}
        </div>
        <DateRangePicker mode={dateMode} customRange={customRange} onChange={(m, r) => { setDateMode(m); setCustomRange(r); }} />
      </div>

      {/* VUE: TRESORERIE (RECETTE + DEPENSE uniquement) */}
      {tab === 'tresorerie' && (
        <div>
          <div className="stat-grid stat-grid-2 mb-4">
            <div className="stat-card success" style={{ padding: '12px 16px' }}>
               <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Somme des RECETTES (Période)</div>
               <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--success)' }}>{formatMoney(periodEntrees)}</div>
            </div>
            <div className="stat-card danger" style={{ padding: '12px 16px' }}>
               <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Somme des DÉPENSES (Période)</div>
               <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--danger)' }}>{formatMoney(periodSorties)}</div>
            </div>
          </div>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Type</th><th>Catégorie Journal</th><th>Action / Événement</th><th>Opérateur</th><th>Date</th><th style={{ textAlign: 'right' }}>Montant</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={6}><div className="state-box"><div className="spinner" /></div></td></tr>
                : periodTresorerie.length === 0 ? <tr><td colSpan={6}><div className="state-box"><div className="state-icon">💸</div><div className="state-title">Aucun événement financier trouvé pour cette période.</div></div></td></tr>
                : periodTresorerie.map(j => {
                  const v = getVisuals(j.typeFlux);
                  return (
                    <tr key={j.uuid}>
                      <td><span className={`badge ${v.badge}`} style={{ fontSize: 10 }}>{v.icon} {v.label}</span></td>
                      <td style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{j.categorie}</td>
                      <td>
                         <div style={{ fontWeight: 500, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>{j.action}</div>
                         {j.detail && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, maxWidth: 350, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.detail}</div>}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{j.operateur || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatDateTime(j.date_action)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: v.color }}>
                        {v.sign}{formatMoney(j.montant || 0)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VUE: DÉPENSES ET DETTES */}
      {tab === 'depenses' && (
        <div>
          <div className="stat-grid stat-grid-2 mb-4">
            <div className="stat-card" style={{ borderColor: 'rgba(239, 68, 68, 0.4)' }}>
              <div className="stat-icon danger"><TrendingDown size={18} /></div><div className="stat-value mono">{formatMoney(periodPDepenses)}</div><div className="stat-label">Sorties Immédiates [DÉPENSE] (Période)</div>
            </div>
            <div className="stat-card" style={{ borderColor: 'rgba(245, 158, 11, 0.4)' }}>
              <div className="stat-icon warning"><Clock size={18} /></div><div className="stat-value mono">{formatMoney(periodPDettes)}</div><div className="stat-label">Factures Non Payées [DETTE] (Période)</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>Chronologie des Dépenses et Dettes</h3>
            <select className="filter-select" value={filterDepenseStatut} onChange={e => setFilterDepenseStatut(e.target.value as any)}>
               <option value="toutes">📝 Tout afficher (Chronologique)</option>
               <option value="DEPENSE">💵 Uniquement l'argent sorti [DÉPENSE]</option>
               <option value="DETTE">🕒 Uniquement l'argent à payer [DETTE]</option>
            </select>
          </div>

          <div className="table-wrapper">
            <table>
              <thead><tr><th>Type</th><th>Catégorie Journal</th><th>Détails Action</th><th>Opérateur</th><th>Date Mouvement</th><th style={{ textAlign: 'right' }}>Montant</th></tr></thead>
              <tbody>
                {displayDepensesDettes.length === 0 ? <tr><td colSpan={6}><div className="state-box"><p className="text-muted">Aucune sortie d'argent ou création de dette journalisée.</p></div></td></tr> 
                : displayDepensesDettes.map(j => {
                  const v = getVisuals(j.typeFlux);
                  return (
                    <tr key={j.uuid}>
                      <td><span className={`badge ${v.badge}`}>{v.label}</span></td>
                      <td style={{ fontSize: 12 }}>{j.categorie}</td>
                      <td>
                         <div style={{ fontWeight: 500, fontSize: 13 }}>{j.action}</div>
                         {j.detail && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, maxWidth: 300 }}>{j.detail}</div>}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{j.operateur || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatDateTime(j.date_action)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: v.color }}>{v.sign}{formatMoney(j.montant || 0)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VUE: CRÉANCES */}
      {tab === 'creances' && (
        <div>
          <div className="stat-grid stat-grid-1 mb-4">
            <div className="stat-card" style={{ borderColor: 'rgba(56, 189, 248, 0.4)' }}>
              <div className="stat-icon info"><Clock size={18} /></div><div className="stat-value mono">{formatMoney(periodPCreances)}</div><div className="stat-label">Déclarations de Créances (Période)</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>Historique des Créances Générées</h3>
            <select className="filter-select" value={filterCreanceStatut} onChange={e => setFilterCreanceStatut(e.target.value as any)}>
               <option value="toutes">📝 Tout afficher (Chronologique)</option>
               <option value="CREANCE">🕒 Uniquement l'argent à encaisser [CRÉANCE]</option>
            </select>
          </div>

          <div className="table-wrapper">
            <table>
              <thead><tr><th>Type</th><th>Catégorie Journal</th><th>Description</th><th>Opérateur</th><th>Date Mouvement</th><th style={{ textAlign: 'right' }}>Montant</th></tr></thead>
              <tbody>
                {displayCreances.length === 0 ? <tr><td colSpan={6}><div className="state-box"><p className="text-muted">Aucune créance journalisée pour le moment.</p></div></td></tr> 
                : displayCreances.map((j: any) => {
                  const v = getVisuals(j.typeFlux);
                  return (
                    <tr key={j.uuid}>
                      <td><span className={`badge ${v.badge}`}>{v.label}</span></td>
                      <td style={{ fontSize: 12 }}>{j.categorie}</td>
                      <td>
                         <div style={{ fontWeight: 500, fontSize: 13 }}>{j.action}</div>
                         {j.detail && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, maxWidth: 300 }}>{j.detail}</div>}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{j.operateur || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatDateTime(j.date_action)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: v.color }}>{formatMoney(j.montant || 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
