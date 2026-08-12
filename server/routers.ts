import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { callDataApi } from "./_core/dataApi";
import { getPositions, getDailyHistory, getAlerts, getEvents } from "./db";
import { calculateDailyPerformance, calculateWeight } from "./portfolioCalculations";

interface QuoteResult {
  ticker: string;
  currentPrice: number | null;
  previousClose: number | null;
  regularMarketDayHigh: number | null;
  regularMarketDayLow: number | null;
  currency: string | null;
  longName: string | null;
}

interface PositionWithQuote {
  id: number;
  ticker: string;
  company: string;
  sector: string;
  quantity: number;
  currency: "BRL" | "USD";
  accountHolder: string;
  account: string;
  assetClass: string;
  positionType: string;
  currentPrice: number | null;
  previousClose: number | null;
  nativeValue: number | null;
  marketValue: number | null;
  previousMarketValue: number | null;
  dailyChange: number | null;
  dailyChangePct: number | null;
  weight: number | null;
  averageBuyPrice: number | null;
  accumulatedReturn: number | null;
  accumulatedReturnPct: number | null;
  sourceReturnPct: number | null;
  sourceInvestedValue: number | null;
  sourceReturnValue: number | null;
  sourceAsOfDate: string | null;
}

interface SnapshotResult {
  positions: PositionWithQuote[];
  totalValue: number;
  totalValueBrl: number;
  totalValueUsd: number;
  totalValueNativeBrl: number;
  previousTotalValue: number;
  dailyResult: number;
  dailyResultPct: number;
  usdBrlRate: number | null;
  usdBrlRateStatus: "live" | "unavailable";
  topGainers: { ticker: string; company: string; dailyChangePct: number }[];
  topLosers: { ticker: string; company: string; dailyChangePct: number }[];
  sectorConcentration: { sector: string; value: number; weight: number }[];
  accountConcentration: { accountHolder: string; value: number; weight: number }[];
  currencyTotals: { currency: "BRL" | "USD"; nativeValue: number; brlValue: number | null; weight: number | null }[];
  timestamp: string;
}

const SNAPSHOT_CACHE_TTL_MS = 30_000;
let snapshotCache: { value: SnapshotResult; expiresAt: number } | null = null;

function emptyQuote(ticker: string): QuoteResult {
  return {
    ticker,
    currentPrice: null,
    previousClose: null,
    regularMarketDayHigh: null,
    regularMarketDayLow: null,
    currency: null,
    longName: null,
  };
}

async function fetchQuote(ticker: string): Promise<QuoteResult> {
  const symbol = `${ticker}.SA`;
  try {
    const response = await callDataApi("YahooFinance/get_stock_chart", {
      query: {
        symbol,
        region: "BR",
        interval: "1d",
        range: "5d",
        includeAdjustedClose: "true",
      },
    });
    const chart = (response as Record<string, unknown>)?.chart as Record<string, unknown> | undefined;
    const result = chart?.result as unknown[] | undefined;
    if (!result || result.length === 0) return emptyQuote(ticker);
    const data = result[0] as Record<string, unknown>;
    const meta = data.meta as Record<string, unknown> | undefined;
    return {
      ticker,
      currentPrice: typeof meta?.regularMarketPrice === "number" ? meta.regularMarketPrice : null,
      previousClose: typeof meta?.chartPreviousClose === "number" ? meta.chartPreviousClose : null,
      regularMarketDayHigh: typeof meta?.regularMarketDayHigh === "number" ? meta.regularMarketDayHigh : null,
      regularMarketDayLow: typeof meta?.regularMarketDayLow === "number" ? meta.regularMarketDayLow : null,
      currency: typeof meta?.currency === "string" ? meta.currency : null,
      longName: typeof meta?.longName === "string" ? meta.longName : null,
    };
  } catch (error) {
    console.error(`[YahooFinance] Failed to fetch ${symbol}:`, error);
    return emptyQuote(ticker);
  }
}

async function fetchUsdBrlRate(): Promise<number | null> {
  try {
    const response = await callDataApi("YahooFinance/get_stock_chart", {
      query: {
        symbol: "BRL=X",
        region: "US",
        interval: "1d",
        range: "5d",
        includeAdjustedClose: "true",
      },
    });
    const chart = (response as Record<string, unknown>)?.chart as Record<string, unknown> | undefined;
    const result = chart?.result as unknown[] | undefined;
    const meta = result?.[0]
      ? ((result[0] as Record<string, unknown>).meta as Record<string, unknown> | undefined)
      : undefined;
    const rate = meta?.regularMarketPrice;
    return typeof rate === "number" && rate > 0 ? rate : null;
  } catch (error) {
    console.error("[YahooFinance] Failed to fetch USD/BRL:", error);
    return null;
  }
}

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  portfolio: router({
    getSnapshot: publicProcedure.query(async () => {
      if (snapshotCache && snapshotCache.expiresAt > Date.now()) {
        return snapshotCache.value;
      }
      const rawPositions = await getPositions();
      if (rawPositions.length === 0) {
        return {
          positions: [], totalValue: 0, totalValueBrl: 0, totalValueUsd: 0,
          totalValueNativeBrl: 0, previousTotalValue: 0, dailyResult: 0,
          dailyResultPct: 0, usdBrlRate: null, usdBrlRateStatus: "unavailable",
          topGainers: [], topLosers: [], sectorConcentration: [], accountConcentration: [],
          currencyTotals: [], timestamp: new Date().toISOString(),
        } satisfies SnapshotResult;
      }

      const quotedTickers: string[] = Array.from(new Set<string>(
        rawPositions
          .filter((p: any) => p.positionType === "quoted_b3" && p.currency === "BRL")
          .map((p: any) => String(p.ticker))
      ));
      const quotes = new Map<string, QuoteResult>();
      const batchSize = 5;
      for (let i = 0; i < quotedTickers.length; i += batchSize) {
        const batch = quotedTickers.slice(i, i + batchSize);
        const batchQuotes = await Promise.all(batch.map((ticker: string) => fetchQuote(ticker)));
        for (const quote of batchQuotes) quotes.set(quote.ticker, quote);
      }

      const hasUsd = rawPositions.some((p: any) => p.currency === "USD");
      const usdBrlRate = hasUsd ? await fetchUsdBrlRate() : null;
      const rateStatus = usdBrlRate !== null ? "live" : "unavailable";

      let totalValueBrl = 0;
      let totalValueUsd = 0;
      let totalValueNativeBrl = 0;

      const mapped = rawPositions
        .filter((pos: any) => pos.positionType !== "reconciliation")
        .map((pos: any): PositionWithQuote => {
          const quote = pos.positionType === "quoted_b3" ? quotes.get(pos.ticker) : undefined;
          const currentPrice = quote?.currentPrice ?? null;
          const previousClose = quote?.previousClose ?? null;
          const sourceValue = asNumber(pos.sourceMarketValue) ?? 0;
          const nativeValue = pos.positionType === "quoted_b3" && currentPrice !== null
            ? currentPrice * Number(pos.quantity)
            : sourceValue;
          const nativePreviousValue = pos.positionType === "quoted_b3" && previousClose !== null
            ? previousClose * Number(pos.quantity)
            : null;
          const marketValue = pos.currency === "USD"
            ? (usdBrlRate !== null ? nativeValue * usdBrlRate : null)
            : nativeValue;
          const previousMarketValue = pos.currency === "USD"
            ? (usdBrlRate !== null && nativePreviousValue !== null ? nativePreviousValue * usdBrlRate : null)
            : nativePreviousValue;
          const dailyChange = marketValue !== null && previousMarketValue !== null
            ? marketValue - previousMarketValue
            : null;
          const dailyChangePct = previousMarketValue !== null && previousMarketValue > 0 && dailyChange !== null
            ? (dailyChange / previousMarketValue) * 100
            : null;
          const averageBuyPrice = asNumber(pos.averageBuyPrice);
          const isQuoted = pos.positionType === "quoted_b3";
          const accumulatedReturn = isQuoted && currentPrice !== null && averageBuyPrice !== null && averageBuyPrice > 0
            ? (currentPrice - averageBuyPrice) * Number(pos.quantity)
            : null;
          const accumulatedReturnPct = isQuoted && currentPrice !== null && averageBuyPrice !== null && averageBuyPrice > 0
            ? ((currentPrice - averageBuyPrice) / averageBuyPrice) * 100
            : asNumber(pos.sourceReturnPct);

          if (pos.currency === "USD") totalValueUsd += nativeValue;
          else totalValueNativeBrl += nativeValue;
          if (marketValue !== null) totalValueBrl += marketValue;

          return {
            id: Number(pos.id), ticker: pos.ticker, company: pos.company, sector: pos.sector,
            quantity: Number(pos.quantity), currency: pos.currency, accountHolder: pos.accountHolder,
            account: pos.account, assetClass: pos.assetClass, positionType: pos.positionType,
            currentPrice, previousClose, nativeValue, marketValue, previousMarketValue,
            dailyChange, dailyChangePct, weight: null, averageBuyPrice, accumulatedReturn,
            accumulatedReturnPct,
            sourceReturnPct: asNumber(pos.sourceReturnPct),
            sourceInvestedValue: asNumber(pos.sourceInvestedValue),
            sourceReturnValue: asNumber(pos.sourceReturnValue),
            sourceAsOfDate: pos.sourceAsOfDate ?? null,
          };
        });

      const positions = mapped.map((p: PositionWithQuote) => ({
        ...p,
        weight: calculateWeight(p.marketValue, totalValueBrl),
      }));

      const sorted: PositionWithQuote[] = positions
        .filter((p: PositionWithQuote) => p.dailyChangePct !== null)
        .sort((a: PositionWithQuote, b: PositionWithQuote) => (b.dailyChangePct ?? 0) - (a.dailyChangePct ?? 0));
      const topGainers = sorted.slice(0, 5).map((p: PositionWithQuote) => ({ ticker: p.ticker, company: p.company, dailyChangePct: p.dailyChangePct ?? 0 }));
      const topLosers = sorted.slice(-5).reverse().map((p: PositionWithQuote) => ({ ticker: p.ticker, company: p.company, dailyChangePct: p.dailyChangePct ?? 0 }));

      const sectorMap = new Map<string, number>();
      const accountMap = new Map<string, number>();
      for (const p of positions) {
        if (p.marketValue === null) continue;
        sectorMap.set(p.sector, (sectorMap.get(p.sector) ?? 0) + p.marketValue);
        accountMap.set(p.accountHolder, (accountMap.get(p.accountHolder) ?? 0) + p.marketValue);
      }
      const sectorConcentration = Array.from(sectorMap.entries()).map(([sector, value]) => ({
        sector, value, weight: totalValueBrl > 0 ? (value / totalValueBrl) * 100 : 0,
      })).sort((a, b) => b.value - a.value);
      const accountConcentration = Array.from(accountMap.entries()).map(([accountHolder, value]) => ({
        accountHolder, value, weight: totalValueBrl > 0 ? (value / totalValueBrl) * 100 : 0,
      })).sort((a, b) => b.value - a.value);
      const currencyTotals = [
        { currency: "BRL" as const, nativeValue: totalValueNativeBrl, brlValue: totalValueNativeBrl, weight: totalValueBrl > 0 ? (totalValueNativeBrl / totalValueBrl) * 100 : null },
        { currency: "USD" as const, nativeValue: totalValueUsd, brlValue: usdBrlRate !== null ? totalValueUsd * usdBrlRate : null, weight: totalValueBrl > 0 && usdBrlRate !== null ? ((totalValueUsd * usdBrlRate) / totalValueBrl) * 100 : null },
      ].filter(item => item.nativeValue > 0);

      const dailyPerformance = calculateDailyPerformance(
        positions.map((p: PositionWithQuote) => ({ marketValue: p.marketValue, previousMarketValue: p.previousMarketValue }))
      );
      const previousTotalValue = dailyPerformance.previousTotal;
      const dailyResult = dailyPerformance.result;
      const dailyResultPct = dailyPerformance.resultPct;
      const snapshot = {
        positions, totalValue: totalValueBrl, totalValueBrl, totalValueUsd, totalValueNativeBrl,
        previousTotalValue, dailyResult, dailyResultPct, usdBrlRate,
        usdBrlRateStatus: rateStatus, topGainers, topLosers, sectorConcentration,
        accountConcentration, currencyTotals, timestamp: new Date().toISOString(),
      } satisfies SnapshotResult;
      snapshotCache = { value: snapshot, expiresAt: Date.now() + SNAPSHOT_CACHE_TTL_MS };
      return snapshot;
    }),

    getPositions: publicProcedure.query(async () => getPositions()),
    getHistory: publicProcedure.query(async () => getDailyHistory()),
    getAlerts: publicProcedure.query(async () => getAlerts()),
    getEvents: publicProcedure.query(async () => getEvents()),
  }),
});

export type AppRouter = typeof appRouter;
