import type { Metadata, Viewport } from 'next';
import { ToastProvider } from '@/components/shared/Toast';
import { ConnectivityBanner } from '@/components/shared/ConnectivityBanner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Jobab — AI Sales Agent',
  description: 'Merchant dashboard for your AI sales agent.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#FAF7F2',
};

// Tiny inline script that applies the saved theme before paint, so dark mode
// users don't see a light flash.
const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem('jobab-theme')||'light';document.body.classList.add('theme-'+t);}catch(e){document.body.classList.add('theme-light');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen overscroll-none">
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <ToastProvider>
          <ConnectivityBanner />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
