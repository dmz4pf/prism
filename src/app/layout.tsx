import type { Metadata } from 'next';
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Web3Provider } from '@/components/providers/web3-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { MotionProvider } from '@/components/providers/motion-provider';
import { SidebarProvider } from '@/contexts/sidebar-context';
import { SettingsProvider } from '@/contexts/settings-context';
import { ToastProvider } from '@/components/ui/toast-provider';
import { LiquidationMonitor } from '@/components/lending/liquidation-monitor';
import { Toaster } from 'sonner';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Sidebar } from '@/components/layout/sidebar';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PRISM - DeFi Yield Aggregator',
  description: 'Maximize your DeFi yields with PRISM. Compare, deposit, and track yields across Aave, Lido, Ethena, and more on Base.',
  keywords: ['DeFi', 'yield', 'aggregator', 'Base', 'Aave', 'Lido', 'Ethena', 'staking'],
  openGraph: {
    title: 'PRISM - DeFi Yield Aggregator',
    description: 'Maximize your DeFi yields with PRISM',
    type: 'website',
    url: 'https://prism.fi',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PRISM - DeFi Yield Aggregator',
    description: 'Maximize your DeFi yields with PRISM',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} font-body antialiased bg-background text-white min-h-screen`}
      >
        <ThemeProvider>
          <MotionProvider>
            <Web3Provider>
              <SidebarProvider>
                <SettingsProvider>
                  <ToastProvider>
                    <div className="flex min-h-screen">
                    {/* Sidebar - conditionally rendered inside component */}
                    <Sidebar />

                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col">
                      {/* Header */}
                      <Header />

                      {/* Page Content */}
                      <main className="flex-1">{children}</main>

                      {/* Footer */}
                      <Footer />
                    </div>
                  </div>
                    {/* Liquidation Alerts (monitors health factor) */}
                    <LiquidationMonitor />
                    {/* Sonner Toaster for liquidation alerts */}
                    <Toaster
                      position="bottom-right"
                      expand={false}
                      richColors
                      closeButton
                      theme="dark"
                      toastOptions={{
                        style: {
                          background: 'rgba(15, 23, 42, 0.95)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          backdropFilter: 'blur(8px)',
                        },
                      }}
                    />
                  </ToastProvider>
                </SettingsProvider>
              </SidebarProvider>
            </Web3Provider>
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
