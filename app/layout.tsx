import './style.css';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import AuthGate from '../components/AuthGate';

export const metadata: Metadata = {
  title: 'Apptimate Work Tracker',
  description: 'Google Sheets powered client work tracking',
  icons: {
    icon: [
      { url: '/logo-color.png', type: 'image/png' },
    ],
    shortcut: '/logo-color.png',
    apple: '/logo-color.png',
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo-color.png" type="image/png" />
      </head>
      <body>
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
