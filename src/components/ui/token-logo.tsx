'use client';

import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

// Token logo URLs from reliable CDNs
const TOKEN_LOGOS: Record<string, string> = {
  // Native & Major Tokens
  ETH: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
  WETH: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',

  // Stablecoins
  USDC: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
  USDT: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
  DAI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EescdeCB5BE33D8/logo.png',

  // Liquid Staking Tokens
  stETH: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84/logo.png',
  wstETH: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0/logo.png',
  cbETH: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xBe9895146f7AF43049ca1c1AE358B0541Ea49704/logo.png',
  rETH: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xae78736Cd615f374D3085123A210448E74Fc6393/logo.png',

  // Yield-Bearing Stables
  sDAI: 'https://assets.coingecko.com/coins/images/32254/standard/sdai.png',
  sUSDe: 'https://assets.coingecko.com/coins/images/35675/standard/susde.png',
  USDe: 'https://assets.coingecko.com/coins/images/33613/standard/usde.png',
  USDY: 'https://assets.coingecko.com/coins/images/31500/standard/usdy.png',

  // Aave aTokens (simplified - using underlying)
  aUSDC: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
  aDAI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EeadcCB5BE33D8/logo.png',
  aStETH: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84/logo.png',
  asDAI: 'https://assets.coingecko.com/coins/images/32254/standard/sdai.png',

  // WBTC
  WBTC: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png',

  // Other DeFi tokens
  AAVE: 'https://assets.coingecko.com/coins/images/12645/standard/aave-token-round.png',
  COMP: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xc00e94Cb662C3520282E6f5717214004A7f26888/logo.png',
  LDO: 'https://assets.coingecko.com/coins/images/13573/standard/Lido_DAO.png',
};

// Protocol logos
const PROTOCOL_LOGOS: Record<string, string> = {
  Aave: 'https://assets.coingecko.com/coins/images/12645/standard/aave-token-round.png',
  Compound: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xc00e94Cb662C3520282E6f5717214004A7f26888/logo.png',
  Lido: 'https://assets.coingecko.com/coins/images/13573/standard/Lido_DAO.png',
  Spark: 'https://assets.coingecko.com/coins/images/29523/standard/spark.png',
  Morpho: 'https://assets.coingecko.com/coins/images/29837/standard/morpho.jpeg',
  Ethena: 'https://assets.coingecko.com/coins/images/33613/standard/usde.png',
  Ondo: 'https://assets.coingecko.com/coins/images/26580/standard/ONDO.png',
  Coinbase: 'https://assets.coingecko.com/coins/images/18688/standard/cbeth.png',
  RocketPool: 'https://assets.coingecko.com/coins/images/2090/standard/rocket_pool_%28RPL%29.png',
};

interface TokenLogoProps {
  symbol: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showFallback?: boolean;
}

const SIZE_MAP = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 40,
};

export function TokenLogo({ symbol, size = 'md', className, showFallback = true }: TokenLogoProps) {
  const [hasError, setHasError] = React.useState(false);
  const logoUrl = TOKEN_LOGOS[symbol.toUpperCase()];
  const dimension = SIZE_MAP[size];

  // Reset error state when symbol changes
  React.useEffect(() => {
    setHasError(false);
  }, [symbol]);

  if (!logoUrl || hasError) {
    if (!showFallback) return null;

    // Fallback: show initials in a colored circle
    return (
      <div
        className={cn(
          'rounded-full bg-slate-700 flex items-center justify-center text-white font-bold',
          className
        )}
        style={{ width: dimension, height: dimension, fontSize: dimension * 0.4 }}
      >
        {symbol.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <div
      className={cn('relative rounded-full overflow-hidden flex-shrink-0', className)}
      style={{ width: dimension, height: dimension }}
    >
      <Image
        src={logoUrl}
        alt={`${symbol} logo`}
        width={dimension}
        height={dimension}
        className="object-cover"
        onError={() => setHasError(true)}
        unoptimized // Use unoptimized for external URLs
      />
    </div>
  );
}

interface ProtocolLogoProps {
  protocol: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showFallback?: boolean;
}

export function ProtocolLogo({ protocol, size = 'md', className, showFallback = true }: ProtocolLogoProps) {
  const [hasError, setHasError] = React.useState(false);

  // Try to match protocol name (case-insensitive)
  const normalizedProtocol = Object.keys(PROTOCOL_LOGOS).find(
    (key) => key.toLowerCase() === protocol.toLowerCase()
  );
  const logoUrl = normalizedProtocol ? PROTOCOL_LOGOS[normalizedProtocol] : null;
  const dimension = SIZE_MAP[size];

  // Reset error state when protocol changes
  React.useEffect(() => {
    setHasError(false);
  }, [protocol]);

  if (!logoUrl || hasError) {
    if (!showFallback) return null;

    return (
      <div
        className={cn(
          'rounded-full bg-slate-700 flex items-center justify-center text-white font-bold',
          className
        )}
        style={{ width: dimension, height: dimension, fontSize: dimension * 0.35 }}
      >
        {protocol.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <div
      className={cn('relative rounded-full overflow-hidden flex-shrink-0', className)}
      style={{ width: dimension, height: dimension }}
    >
      <Image
        src={logoUrl}
        alt={`${protocol} logo`}
        width={dimension}
        height={dimension}
        className="object-cover"
        onError={() => setHasError(true)}
        unoptimized
      />
    </div>
  );
}

// Token with name display
interface TokenDisplayProps {
  symbol: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}

export function TokenDisplay({ symbol, name, size = 'md', showName = true, className }: TokenDisplayProps) {
  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <TokenLogo symbol={symbol} size={size} />
      <div className="flex flex-col">
        <span className={cn('font-medium text-white', textSizes[size])}>
          {symbol}
        </span>
        {showName && name && (
          <span className="text-xs text-gray-400">{name}</span>
        )}
      </div>
    </div>
  );
}

// Protocol with name display
interface ProtocolDisplayProps {
  protocol: string;
  action?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ProtocolDisplay({ protocol, action, size = 'md', className }: ProtocolDisplayProps) {
  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <ProtocolLogo protocol={protocol} size={size} />
      <div className="flex flex-col">
        <span className={cn('font-medium text-white', textSizes[size])}>
          {protocol}
        </span>
        {action && (
          <span className="text-xs text-gray-400 capitalize">{action}</span>
        )}
      </div>
    </div>
  );
}

// Export the logo maps for external use
export { TOKEN_LOGOS, PROTOCOL_LOGOS };
