'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  ShoppingCart, Package, AlertTriangle, CalendarCheck,
  TrendingUp, TrendingDown, DollarSign, Users, RefreshCw,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { getSupabaseClient } from '@/lib/supabase';
import { formatMoney, formatDateTime, modePaymentLabel } from '@/lib/utils';
import { useRealtime } from '@/hooks/useRealtime';

interface KPI {
  caJour: number;
  caMois: number;
  nbVentesJour: number;
  stockAlertes: number;
  reservationsJour: number;
  nbEmployes: number;
}

interface SalePoint { date: string; total: number; nb: number; }
interface PayMode { name: string; value: number; }
interface RecentSale { uuid: string; numero_ticket: string; date_vente: string; total_ttc: number; mode_paiement: string; nom_caissier: string; }

const COLORS = ['#7C3AED', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B949E'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || 'var(--text-primary)', fontWeight: 600 }}>
          {formatMoney(p.value)}
        </p>
      ))}
    </div>
  );
};

export default function DashboardHome() {
  const client = getSupabaseClient();
  const [kpi, setKpi] = useState<KPI>({ caJour: 0, caMois: 0, nbVentesJour: 0, stockAlertes: 0, reservationsJour: 0, nbEmployes: 0 });
  const [salesChart, setSalesChart] = useState<SalePoint[]>([]);
  const [payModes, setPayModes] = useState<PayMode[]>([]);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!client) return;
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

    const [ventesJour, ventesMois, produits, employes, reserv, recent] = await Promise.all([
      client.from('ventes').select('total_ttc, mode_paiement').gte('date_vente', today).eq('statut', 'valide'),
      client.from('ventes').select('total_ttc').gte('date_vente', monthStart).eq('statut', 'valide'),
      client.from('produits').select('stock_actuel, stock_alerte').eq('actif', 1).gte('stock_alerte', 0),
      client.from('employes').select('uuid').eq('actif', 1),
      client.from('reservations').select('uuid').eq('statut', 'en_attente'),
      client.from('ventes').select('uuid, numero_ticket, date_vente, total_ttc, mode_paiement, nom_caissier').eq('statut', 'valide').order('date_vente', { ascending: false }).limit(8),
    ]);

    const caJour = (ventesJour.data || []).reduce((s: number, v: any) => s + (v.total_ttc || 0), 0);
    const caMois = (ventesMois.data || []).reduce((s: number, v: any) => s + (v.total_ttc || 0), 0);
    const nbVentesJour = (ventesJour.data || []).length;
    const stockAlertes = (produits.data || []).filter((p: any) => p.stock_actuel >= 0 && p.stock_actuel <= p.stock_alerte).length;

    // Pay modes pie
    const modeMap: Record<string, number> = {};
    (ventesJour.data || []).forEach((v: any) => {
      const m = modePaymentLabel(v.mode_paiement || 'CASH');
      modeMap[m] = (modeMap[m] || 0) + (v.total_ttc || 0);
    });
    const payModesData = Object.entries(modeMap).map(([name, value]) => ({ name, value }));

    setKpi({ caJour, caMois, nbVentesJour, stockAlertes, reservationsJour: (reserv.data || []).length, nbEmployes: (employes.data || []).length });
    setPayModes(payModesData);
    setRecentSales(recent.data || []);

    // 7-day chart
    const days: SalePoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const ds_end = ds + 'T23:59:59';
      const { data } = await client.from('ventes').select('total_ttc').gte('date_vente', ds).lte('date_vente', ds_end).eq('statut', 'valide');
      const total = (data || []).reduce((s: number, v: any) => s + (v.total_ttc || 0), 0);
      days.push({ date: d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }), total, nb: (data || []).length });
    }
    setSalesChart(days);
    setLoading(false);
  }, [client]);

  useEffect(() => { load(); }, [load]);
  useRealtime('ventes', load);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
        <p className="text-muted">Chargement du tableau de bord...</p>
      </div>
    </div>
  );

  return (
    <div className="slide-up">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Vue d'ensemble</h1>
          <p className="page-subtitle">Tableau de bord en temps réel</p>
        </div>
        <div className="page-actions">
          <div className="realtime-badge"><div className="realtime-dot" /> Temps réel</div>
          <button className="btn btn-secondary btn-sm" onClick={load} id="btn-refresh-home">
            <RefreshCw size={13} /> Actualiser
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stat-grid stat-grid-4 mb-6">
        <div className="stat-card violet">
          <div className="stat-icon violet"><DollarSign size={18} /></div>
          <div className="stat-value mono">{formatMoney(kpi.caJour)}</div>
          <div className="stat-label">Chiffre d'affaires aujourd'hui</div>
        </div>
        <div className="stat-card cyan">
          <div className="stat-icon cyan"><TrendingUp size={18} /></div>
          <div className="stat-value mono">{formatMoney(kpi.caMois)}</div>
          <div className="stat-label">CA ce mois</div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon success"><ShoppingCart size={18} /></div>
          <div className="stat-value mono">{kpi.nbVentesJour}</div>
          <div className="stat-label">Ventes aujourd'hui</div>
        </div>
        <div className={`stat-card ${kpi.stockAlertes > 0 ? 'danger' : 'success'}`}>
          <div className={`stat-icon ${kpi.stockAlertes > 0 ? 'danger' : 'success'}`}><AlertTriangle size={18} /></div>
          <div className="stat-value mono">{kpi.stockAlertes}</div>
          <div className="stat-label">Alertes stock</div>
        </div>
      </div>

      <div className="stat-grid stat-grid-2 mb-6">
        <div className="stat-card warning">
          <div className="stat-icon warning"><CalendarCheck size={18} /></div>
          <div className="stat-value mono">{kpi.reservationsJour}</div>
          <div className="stat-label">Réservations en attente</div>
        </div>
        <div className="stat-card cyan">
          <div className="stat-icon cyan"><Users size={18} /></div>
          <div className="stat-value mono">{kpi.nbEmployes}</div>
          <div className="stat-label">Employés actifs</div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid-3-1">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><TrendingUp size={15} /> Ventes — 7 derniers jours</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesChart} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={v => formatMoney(v, '')} width={60} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="total" stroke="#7C3AED" strokeWidth={2.5} dot={{ fill: '#7C3AED', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><DollarSign size={15} /> Modes de paiement</h3>
          </div>
          {payModes.length === 0 ? (
            <div className="state-box" style={{ padding: 20 }}>
              <p className="text-muted" style={{ fontSize: 12 }}>Aucune vente aujourd'hui</p>
            </div>
          ) : (
            <div className="chart-container" style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={payModes} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {payModes.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatMoney(v)} />
                  <Legend iconSize={10} formatter={(v) => <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Recent sales */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title"><ShoppingCart size={15} /> Dernières ventes</h3>
          <a href="/dashboard/ventes" className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>Voir tout →</a>
        </div>
        <div className="table-wrapper" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Date/Heure</th>
                <th>Caissier</th>
                <th>Mode</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>Aucune vente</td></tr>
              ) : recentSales.map(v => (
                <tr key={v.uuid}>
                  <td><span className="mono" style={{ fontSize: 12, color: 'var(--accent-cyan)' }}>{v.numero_ticket}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatDateTime(v.date_vente)}</td>
                  <td>{v.nom_caissier || '—'}</td>
                  <td><span className="badge badge-muted">{modePaymentLabel(v.mode_paiement)}</span></td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatMoney(v.total_ttc)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
