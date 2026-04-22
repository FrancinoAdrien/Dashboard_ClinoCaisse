export function formatMoney(amount: number | null | undefined, devise = 'Ar'): string {
  if (amount == null || isNaN(amount)) return `0 ${devise}`;
  return `${Number(amount).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${devise}`;
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return dateStr; }
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return dateStr; }
}

export function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch { return dateStr; }
}

export function getInitials(nom: string, prenom?: string): string {
  const n = (nom || '').trim();
  const p = (prenom || '').trim();
  if (p) return `${n[0] || ''}${p[0] || ''}`.toUpperCase();
  const parts = n.split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return n.slice(0, 2).toUpperCase();
}

export type DateRange = { from: string; to: string };

export function getDateRange(mode: 'today' | 'week' | 'month' | 'custom', custom?: DateRange): DateRange {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (mode === 'today') {
    const today = fmt(now);
    return { from: today, to: today };
  }
  if (mode === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { from: fmt(start), to: fmt(end) };
  }
  if (mode === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: fmt(start), to: fmt(end) };
  }
  return custom || { from: fmt(now), to: fmt(now) };
}

export function modePaymentLabel(mode: string): string {
  const map: Record<string, string> = {
    CASH: 'Espèces',
    MVOLA: 'MVola',
    ORANGE: 'Orange Money',
    AIRTEL: 'Airtel Money',
    CARTE: 'Carte',
    AUTRE: 'Autre',
    COMPTE: 'Compte',
  };
  return map[mode?.toUpperCase()] || mode || '—';
}

export function statutLabel(statut: string): string {
  const map: Record<string, string> = {
    valide: 'Validé',
    annule: 'Annulé',
    en_attente: 'En attente',
    confirmee: 'Confirmée',
    en_cours: 'En cours',
    terminee: 'Terminée',
    payee: 'Payée',
    non_paye: 'Non payé',
    partiel: 'Partiel',
    complet: 'Complet',
  };
  return map[statut?.toLowerCase()] || statut || '—';
}

export function statutBadgeClass(statut: string): string {
  const map: Record<string, string> = {
    valide: 'badge-success',
    confirmee: 'badge-success',
    terminee: 'badge-success',
    payee: 'badge-success',
    complet: 'badge-success',
    annule: 'badge-danger',
    non_paye: 'badge-danger',
    en_attente: 'badge-warning',
    en_cours: 'badge-info',
    partiel: 'badge-warning',
  };
  return map[statut?.toLowerCase()] || 'badge-muted';
}
