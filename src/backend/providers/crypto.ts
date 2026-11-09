/**
 * Crypto Asset Simulation Desk
 * Simulated market prices, portfolio analytics, and educational simulated execution.
 * Clearly isolates simulated balances from real banking and mobile money rails.
 */

import { CryptoAsset, CryptoPosition } from '../types';
import { db } from '../db';

export class CryptoSimulationService {
  private static liveMarkets: Map<string, CryptoAsset> = new Map([
    [
      'BTC',
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        priceUsd: 89240.0,
        change24h: 3.42,
        high24h: 90150.0,
        low24h: 86800.0,
        sparkline: [86800, 87400, 87100, 88200, 88900, 89400, 89240],
        isSimulated: true,
      },
    ],
    [
      'ETH',
      {
        symbol: 'ETH',
        name: 'Ethereum',
        priceUsd: 3420.0,
        change24h: -1.15,
        high24h: 3510.0,
        low24h: 3380.0,
        sparkline: [3480, 3490, 3450, 3410, 3390, 3430, 3420],
        isSimulated: true,
      },
    ],
    [
      'USDT',
      {
        symbol: 'USDT',
        name: 'Tether USD',
        priceUsd: 1.0,
        change24h: 0.01,
        high24h: 1.001,
        low24h: 0.999,
        sparkline: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
        isSimulated: true,
      },
    ],
  ]);

  static getMarkets(): CryptoAsset[] {
    return Array.from(this.liveMarkets.values());
  }

  static getPortfolio(): {
    positions: CryptoPosition[];
    totalPortfolioValueUsd: number;
    totalPnlUsd: number;
    overallPnlPercent: number;
    isSimulated: true;
  } {
    const positions = Array.from(db.cryptoPositions.values());
    let totalValue = 0;
    let totalPnl = 0;
    let totalCost = 0;

    for (const pos of positions) {
      const market = this.liveMarkets.get(pos.symbol);
      const currentPrice = market ? market.priceUsd : pos.averageBuyPriceUsd;
      pos.currentValueUsd = Math.round(pos.amount * currentPrice * 100) / 100;
      const costBasis = pos.amount * pos.averageBuyPriceUsd;
      pos.pnlUsd = Math.round((pos.currentValueUsd - costBasis) * 100) / 100;
      pos.pnlPercent = costBasis > 0 ? Math.round((pos.pnlUsd / costBasis) * 10000) / 100 : 0;

      totalValue += pos.currentValueUsd;
      totalPnl += pos.pnlUsd;
      totalCost += costBasis;
    }

    return {
      positions,
      totalPortfolioValueUsd: Math.round(totalValue * 100) / 100,
      totalPnlUsd: Math.round(totalPnl * 100) / 100,
      overallPnlPercent: totalCost > 0 ? Math.round((totalPnl / totalCost) * 10000) / 100 : 0,
      isSimulated: true,
    };
  }

  /**
   * Execute simulated trade
   */
  static executeSimulatedTrade(
    symbol: 'BTC' | 'ETH' | 'USDT',
    side: 'BUY' | 'SELL',
    amountUsd: number
  ): CryptoPosition {
    const market = this.liveMarkets.get(symbol);
    if (!market) throw new Error(`Unknown crypto asset ${symbol}`);

    const existing = db.cryptoPositions.get(symbol) || {
      symbol,
      amount: 0,
      averageBuyPriceUsd: market.priceUsd,
      currentValueUsd: 0,
      pnlUsd: 0,
      pnlPercent: 0,
      isSimulated: true,
    };

    const tokenUnits = amountUsd / market.priceUsd;

    if (side === 'BUY') {
      const prevCost = existing.amount * existing.averageBuyPriceUsd;
      const newCost = prevCost + amountUsd;
      existing.amount += tokenUnits;
      existing.averageBuyPriceUsd = newCost / existing.amount;
    } else {
      if (existing.amount < tokenUnits) {
        throw new Error(`Insufficient simulated ${symbol} balance to sell.`);
      }
      existing.amount -= tokenUnits;
    }

    existing.currentValueUsd = existing.amount * market.priceUsd;
    db.cryptoPositions.set(symbol, existing);

    return existing;
  }
}
