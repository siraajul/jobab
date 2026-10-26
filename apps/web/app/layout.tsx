import type { Metadata, Viewport } from 'next';
import { ToastProvider } from '@/components/shared/Toast';
import { ConnectivityBanner } from '@/components/shared/ConnectivityBanner';
import { THEME_BOOT_SCRIPT } from '@/lib/theme';
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="theme-light" suppressHydrationWarning>
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
