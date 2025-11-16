import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export function formatSOL(lamports: number): string {
  return (lamports / LAMPORTS_PER_SOL).toFixed(4);
}

export function formatMarket(market: any): string {
  const yesOdds = market.totalLiquidity > 0 
    ? ((market.yesPool / market.totalLiquidity) * 100).toFixed(1) 
    : '50.0';
  const noOdds = market.totalLiquidity > 0 
    ? ((market.noPool / market.totalLiquidity) * 100).toFixed(1) 
    : '50.0';
  
  const closeDate = new Date(market.closeTime * 1000);
  const now = new Date();
  const isClosed = closeDate < now;
  
  return (
    `*Market #${market.marketId}*\n` +
    `${market.question}\n\n` +
    `💰 Total Pool: ${formatSOL(market.totalLiquidity)} SOL\n` +
    `📊 YES: ${formatSOL(market.yesPool)} (${yesOdds}%) | NO: ${formatSOL(market.noPool)} (${noOdds}%)\n` +
    `🕐 ${isClosed ? '🔒 Closed' : 'Closes'}: ${closeDate.toLocaleString()}\n` +
    `📌 Status: ${market.state}${market.outcome !== null ? ` | Outcome: ${market.outcome ? '✅ YES' : '❌ NO'}` : ''}`
  );
}

export function formatPosition(position: any, marketQuestion?: string): string {
  const side = position.side ? 'YES ✅' : 'NO ❌';
  
  return (
    `*Position*\n` +
    (marketQuestion ? `Q: ${marketQuestion}\n` : '') +
    `Market: \`${position.market.toString().slice(0, 16)}...\`\n` +
    `Side: ${side}\n` +
    `Amount: ${formatSOL(position.amount)} SOL\n` +
    `Entry Odds: ${(position.entryOdds / 10000).toFixed(2)}%\n` +
    `Status: ${position.claimed ? '✅ Claimed' : '⏳ Pending'}`
  );
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

export function parseQuestion(bytes: number[]): string {
  return Buffer.from(bytes).toString('utf8').replace(/\0/g, '').trim();
}
