'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, ShoppingCart, Package, BarChart3, DollarSign,
  Users, CalendarCheck, Map, BookOpen, Settings,
  ChevronLeft, ChevronRight, Menu, X,
  RefreshCw, LogOut, Database, ChevronDown, User,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { clearAdminSession, clearDbCredentials } from '@/lib/auth';
import { getInitials as gi } from '@/lib/utils';
import { getSupabaseClient } from '@/lib/supabase';

const NAV = [
  { href: '/dashboard', label: 'Vue d\'ensemble', icon: LayoutDashboard },
  { href: '/dashboard/ventes', label: 'Ventes', icon: ShoppingCart },
  { href: '/dashboard/produits', label: 'Produits', icon: Package },
  { href: '/dashboard/stock', label: 'Stock & Ajustements', icon: BarChart3 },
  { href: '/dashboard/finances', label: 'État Financier', icon: DollarSign },
  { href: '/dashboard/employes', label: 'Employés', icon: Users },
  { href: '/dashboard/reservations', label: 'Réservations', icon: CalendarCheck },
  { href: '/dashboard/terrain', label: 'Terrain & Espaces', icon: Map },
  { href: '/dashboard/journal', label: 'Journal d\'activité', icon: BookOpen },
  { href: '/dashboard/parametres', label: 'Paramètres', icon: Settings },
];

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Vue d\'ensemble',
  '/dashboard/ventes': 'Ventes',
  '/dashboard/produits': 'Produits',
  '/dashboard/stock': 'Stock & Ajustements',
  '/dashboard/finances': 'État Financier',
  '/dashboard/employes': 'Employés',
  '/dashboard/reservations': 'Réservations',
  '/dashboard/terrain': 'Terrain & Espaces',
  '/dashboard/journal': 'Journal d\'activité',
  '/dashboard/parametres': 'Paramètres',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { admin, dbLabel, loading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    async function fetchLogo() {
      const client = getSupabaseClient();
      if (!client) return;
      const { data } = await client.from('parametres').select('valeur').eq('cle', 'entreprise.logo').single();
      if (data?.valeur) setCompanyLogo(data.valeur);
    }
    fetchLogo();
  }, []);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );

  if (!admin) return null;

  function handleLogoutAdmin() {
    clearAdminSession();
    router.replace('/pin');
  }

  function handleLogoutDb() {
    clearDbCredentials();
    router.replace('/connect');
  }

  function handleLogoutAll() {
    clearDbCredentials();
    router.replace('/connect');
  }

  const initials = gi(admin.nom, admin.prenom) || admin.nom?.slice(0, 2)?.toUpperCase() || 'AD';
  const pageTitle = PAGE_TITLES[pathname] || 'Dashboard';

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 99, backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            {companyLogo ? (
              <img src={companyLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 4 }} />
            ) : (
              '🏪'
            )}
          </div>
          {!collapsed && <span className="sidebar-logo-text">ClinoCaisse</span>}
          <button
            className="btn btn-ghost btn-icon"
            style={{ marginLeft: 'auto', display: 'none' }}
            onClick={() => setMobileOpen(false)}
            id="btn-close-sidebar"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(item => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                id={`nav-${item.href.replace('/dashboard', '').replace('/', '') || 'home'}`}
                className={`nav-item ${active ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="nav-icon" />
                <span className="nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button
            id="btn-toggle-sidebar"
            className="nav-item"
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Développer' : 'Réduire'}
          >
            {collapsed ? <ChevronRight className="nav-icon" /> : <ChevronLeft className="nav-icon" />}
            <span className="nav-label">Réduire</span>
          </button>
        </div>
      </aside>

      {/* Header */}
      <header className={`header ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="header-left">
          <button
            id="btn-hamburger"
            className="hamburger-btn btn btn-icon"
            onClick={() => setMobileOpen(o => !o)}
          >
            <Menu size={20} />
          </button>
          <span className="header-page-title">{pageTitle}</span>
        </div>

        <div className="header-right">
          {/* DB Indicator */}
          <div className="db-indicator" title="Base de données connectée">
            <div className="db-dot" />
            <span>{dbLabel}</span>
          </div>

          {/* Admin dropdown */}
          <div className="admin-menu" ref={dropdownRef}>
            <button
              id="btn-admin-menu"
              className="admin-btn"
              onClick={() => setDropdownOpen(o => !o)}
            >
              <div className="admin-avatar">{initials}</div>
              <span>{admin.nom}</span>
              <ChevronDown size={13} style={{ transition: 'transform 0.2s', transform: dropdownOpen ? 'rotate(180deg)' : 'none' }} />
            </button>

            {dropdownOpen && (
              <div className="dropdown">
                <div style={{ padding: '8px 12px 10px', borderBottom: '1px solid var(--border)', marginBottom: 6 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{admin.nom} {admin.prenom || ''}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{admin.role}</div>
                </div>
                <button
                  id="btn-change-admin"
                  className="dropdown-item"
                  onClick={() => { setDropdownOpen(false); handleLogoutAdmin(); }}
                >
                  <User size={14} />
                  Changer d'administrateur
                </button>
                <button
                  id="btn-change-db"
                  className="dropdown-item"
                  onClick={() => { setDropdownOpen(false); handleLogoutDb(); }}
                >
                  <Database size={14} />
                  Changer de base de données
                </button>
                <div className="dropdown-divider" />
                <button
                  id="btn-logout-all"
                  className="dropdown-item danger"
                  onClick={() => { setDropdownOpen(false); handleLogoutAll(); }}
                >
                  <LogOut size={14} />
                  Déconnexion totale
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className={`main-content ${collapsed ? 'sidebar-collapsed' : ''}`}>
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav">
        <div className="mobile-nav-items">
          {NAV.slice(0, 5).map(item => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mobile-nav-item ${pathname === item.href ? 'active' : ''}`}
              >
                <Icon />
                <span>{item.label.split(' ')[0]}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
