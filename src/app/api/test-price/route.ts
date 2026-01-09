/**
 * Test API for Live Prices
 *
 * GET /api/test-price?symbol=ETH
 *
 * Use this to verify that live price fetching is working correctly.
 */

import { NextRequest, NextResponse } from 'next/server';
import { livePriceService } from '@/services/live-prices';

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol') || 'ETH';

  try {
    const startTime = Date.now();
    const price = await livePriceService.getTokenPrice(symbol);
    const fetchTime = Date.now() - startTime;

    const cacheStatus = livePriceService.getCacheStatus();

    return NextResponse.json({
      success: true,
      symbol,
      price: {
        usd: price.priceUsd,
        eth: price.priceEth,
        source: price.source,
        isStale: price.isStale,
        updatedAt: new Date(price.updatedAt).toISOString(),
      },
      meta: {
        fetchTimeMs: fetchTime,
        cache: {
          size: cacheStatus.size,
          isExpired: cacheStatus.isExpired,
          lastFetch: cacheStatus.lastFetch?.toISOString() || null,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[test-price] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        symbol,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/test-price/all - Get all prices at once
 */
export async function POST() {
  try {
    const startTime = Date.now();
    const prices = await livePriceService.getAllPrices();
    const fetchTime = Date.now() - startTime;

    const cacheStatus = livePriceService.getCacheStatus();

    return NextResponse.json({
      success: true,
      prices: Object.fromEntries(
        Object.entries(prices).map(([symbol, price]) => [
          symbol,
          {
            usd: price.priceUsd,
            eth: price.priceEth,
            source: price.source,
            isStale: price.isStale,
          },
        ])
      ),
      meta: {
        fetchTimeMs: fetchTime,
        cache: {
          size: cacheStatus.size,
          isExpired: cacheStatus.isExpired,
          entries: cacheStatus.entries,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[test-price] Error fetching all prices:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
