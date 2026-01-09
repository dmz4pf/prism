/**
 * Test script to verify Chainlink price feeds are working
 *
 * Run with: node scripts/test-chainlink.mjs
 */

import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

// Chainlink Aggregator ABI (minimal)
const CHAINLINK_ABI = [
  {
    name: 'latestRoundData',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'roundId', type: 'uint80' },
      { name: 'answer', type: 'int256' },
      { name: 'startedAt', type: 'uint256' },
      { name: 'updatedAt', type: 'uint256' },
      { name: 'answeredInRound', type: 'uint80' },
    ],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    name: 'description',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
];

// Base Sepolia Chainlink feeds
const FEEDS = {
  ethUsd: '0x6BD67d3aFB59A01272981DF4e3Bedd07ab75C38B',
  wstethEth: '0xb6B9B952F45F3eC54E8b7564997a9e5903168569',
  cbethEth: '0x38578df08eaba5b0719453f44ec3Bda58C297703',
  weethEth: '0xFfFbfe763d1CB66ACf77595a88050af4E92F465E',
};

async function main() {
  console.log('🔗 Testing Chainlink Price Feeds on Base Sepolia\n');
  console.log('='.repeat(60));

  const client = createPublicClient({
    chain: baseSepolia,
    transport: http('https://sepolia.base.org'),
  });

  for (const [name, address] of Object.entries(FEEDS)) {
    try {
      console.log(`\n📊 Testing ${name} feed...`);
      console.log(`   Address: ${address}`);

      // Get description
      const description = await client.readContract({
        address,
        abi: CHAINLINK_ABI,
        functionName: 'description',
      });
      console.log(`   Description: ${description}`);

      // Get decimals
      const decimals = await client.readContract({
        address,
        abi: CHAINLINK_ABI,
        functionName: 'decimals',
      });
      console.log(`   Decimals: ${decimals}`);

      // Get latest price
      const roundData = await client.readContract({
        address,
        abi: CHAINLINK_ABI,
        functionName: 'latestRoundData',
      });

      const [roundId, answer, startedAt, updatedAt, answeredInRound] = roundData;
      const price = Number(answer) / 10 ** decimals;
      const updatedDate = new Date(Number(updatedAt) * 1000);

      console.log(`   Price: ${price.toFixed(name === 'ethUsd' ? 2 : 6)}`);
      console.log(`   Updated: ${updatedDate.toISOString()}`);
      console.log(`   ✅ SUCCESS`);
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✨ Test complete!\n');
}

main().catch(console.error);
