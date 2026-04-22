import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ClinoCaisse Dashboard',
  description: 'Tableau de bord administrateur ClinoCaisse — Supabase Cloud',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
