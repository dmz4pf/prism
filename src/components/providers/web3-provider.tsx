'use client';

import { RainbowKitProvider, darkTheme, type Theme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider } from '@tanstack/react-query';
import { config } from '@/lib/wagmi';
import { queryClient } from '@/lib/query-client';

import '@rainbow-me/rainbowkit/styles.css';

// Custom dark theme with darker colors matching app background
const baseTheme = darkTheme({
  accentColor: '#2563EB',
  accentColorForeground: 'white',
  borderRadius: 'medium',
  fontStack: 'system',
  overlayBlur: 'small',
});

const customDarkTheme: Theme = {
  ...baseTheme,
  colors: {
    ...baseTheme.colors,
    modalBackground: '#0A0A0F',
    modalBorder: '#1a1a24',
    modalText: '#ffffff',
    modalTextSecondary: '#9ca3af',
    actionButtonBorder: '#1a1a24',
    actionButtonBorderMobile: '#1a1a24',
    actionButtonSecondaryBackground: '#111118',
    closeButton: '#9ca3af',
    closeButtonBackground: '#1a1a24',
    connectButtonBackground: '#0A0A0F',
    connectButtonBackgroundError: '#dc2626',
    connectButtonInnerBackground: '#111118',
    connectButtonText: '#ffffff',
    connectButtonTextError: '#ffffff',
    generalBorder: '#1a1a24',
    generalBorderDim: '#0f0f14',
    menuItemBackground: '#111118',
    profileForeground: '#0A0A0F',
    selectedOptionBorder: '#2563EB',
    standby: '#2563EB',
  },
  shadows: {
    ...baseTheme.shadows,
    connectButton: '0 4px 12px rgba(0, 0, 0, 0.3)',
    dialog: '0 8px 32px rgba(0, 0, 0, 0.5)',
    profileDetailsAction: '0 2px 6px rgba(0, 0, 0, 0.2)',
    selectedOption: '0 0 0 1px #2563EB',
    selectedWallet: '0 0 0 1px #2563EB',
    walletLogo: '0 2px 8px rgba(0, 0, 0, 0.2)',
  },
};

interface Web3ProviderProps {
  children: React.ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={customDarkTheme}
          modalSize="wide"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
