import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { callDataApi } from "./_core/dataApi";
import {
  getPositions,
  getDailyHistory,
  getAlerts,
  getEvents,
} from "./db";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  ticker: string;
  company: string;
  sector: string;
  quantity: number;
  currentPrice: number | null;
  previousClose: number | null;
  marketValue: number | null;
  previousMarketValue: number | null;
  dailyChange: number | null;
  dailyChangePct: number | null;
  weight: number | null;
}

interface SnapshotResult {
  positions: PositionWithQuote[];
  totalValue: number;
  previousTotalValue: number;
  dailyResult: number;
  dailyResultPct: number;
  topGainers: { ticker: string; company: string; dailyChangePct: number }[];
  topLosers: { ticker: string; company: string; dailyChangePct: number }[];
  sectorConcentration: { sector: string; value: number; weight: number }[];
  timestamp: string;
}

// ─── Yahoo Finance helper ─────────────────────────────────────────────────────

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

    const chart = (response as Record<string, unknown>)?.chart as
      | Record<string, unknown>
      | undefined;
    const result = chart?.result as unknown[] | undefined;
    if (!result || result.length === 0) {
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

    const data = result[0] as Record<string, unknown>;
    const meta = data.meta as Record<string, unknown> | undefined;

    return {
      ticker,
      currentPrice: meta?.regularMarketPrice as number | null ?? null,
      previousClose: meta?.chartPreviousClose as number | null ?? null,
      regularMarketDayHigh: meta?.regularMarketDayHigh as number | null ?? null,
      regularMarketDayLow: meta?.regularMarketDayLow as number | null ?? null,
      currency: meta?.currency as string | null ?? null,
      longName: meta?.longName as string | null ?? null,
    };
  } catch (error) {
    console.error(`[YahooFinance] Failed to fetch ${symbol}:`, error);
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
}

// ─── Portfolio router ─────────────────────────────────────────────────────────

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
    // Busca cotações ao vivo do Yahoo Finance, cruza com posições do banco
    // e calcula valor total, resultado do dia e contribuições por ativo
    getSnapshot: publicProcedure.query(async () => {
      const positions = await getPositions();
      if (positions.length === 0) {
        return {
          positions: [],
          totalValue: 0,
          previousTotalValue: 0,
          dailyResult: 0,
          dailyResultPct: 0,
          topGainers: [],
          topLosers: [],
          sectorConcentration: [],
          timestamp: new Date().toISOString(),
        } satisfies SnapshotResult;
      }

      // Busca cotações em paralelo (lotes de 5 para não sobrecarregar)
      const quotes: QuoteResult[] = [];
      const batchSize = 5;
      for (let i = 0; i < positions.length; i += batchSize) {
        const batch = positions.slice(i, i + batchSize);
        const batchQuotes = await Promise.all(
          batch.map((p) => fetchQuote(p.ticker))
        );
        quotes.push(...batchQuotes);
      }

      const quoteMap = new Map(quotes.map((q) => [q.ticker, q]));

      let totalValue = 0;
      let previousTotalValue = 0;

      const positionsWithQuotes: PositionWithQuote[] = positions.map((pos) => {
        const quote = quoteMap.get(pos.ticker);
        const currentPrice = quote?.currentPrice ?? null;
        const previousClose = quote?.previousClose ?? null;
        const marketValue = currentPrice !== null ? currentPrice * pos.quantity : null;
        const previousMarketValue = previousClose !== null ? previousClose * pos.quantity : null;
        const dailyChange = marketValue !== null && previousMarketValue !== null
          ? marketValue - previousMarketValue
          : null;
        const dailyChangePct = previousClose !== null && previousClose > 0 && currentPrice !== null
          ? ((currentPrice - previousClose) / previousClose) * 100
          : null;

        if (marketValue !== null) totalValue += marketValue;
        if (previousMarketValue !== null) previousTotalValue += previousMarketValue;

        return {
          ticker: pos.ticker,
          company: pos.company,
          sector: pos.sector,
          quantity: pos.quantity,
          currentPrice,
          previousClose,
          marketValue,
          previousMarketValue,
          dailyChange,
          dailyChangePct,
          weight: null, // calculado depois
        };
      });

      // Calcula pesos
      const positionsWithWeight = positionsWithQuotes.map((p) => ({
        ...p,
        weight: totalValue > 0 && p.marketValue !== null
          ? (p.marketValue / totalValue) * 100
          : null,
      }));

      // Ranking de contribuições
      const sorted = [...positionsWithWeight]
        .filter((p) => p.dailyChangePct !== null)
        .sort((a, b) => (b.dailyChangePct ?? 0) - (a.dailyChangePct ?? 0));

      const topGainers = sorted.slice(0, 5).map((p) => ({
        ticker: p.ticker,
        company: p.company,
        dailyChangePct: p.dailyChangePct ?? 0,
      }));

      const topLosers = sorted.slice(-5).reverse().map((p) => ({
        ticker: p.ticker,
        company: p.company,
        dailyChangePct: p.dailyChangePct ?? 0,
      }));

      // Concentração setorial
      const sectorMap = new Map<string, number>();
      for (const p of positionsWithWeight) {
        if (p.marketValue !== null) {
          sectorMap.set(p.sector, (sectorMap.get(p.sector) ?? 0) + p.marketValue);
        }
      }
      const sectorConcentration = Array.from(sectorMap.entries())
        .map(([sector, value]) => ({
          sector,
          value,
          weight: totalValue > 0 ? (value / totalValue) * 100 : 0,
        }))
        .sort((a, b) => b.value - a.value);

      const dailyResult = totalValue - previousTotalValue;
      const dailyResultPct = previousTotalValue > 0
        ? (dailyResult / previousTotalValue) * 100
        : 0;

      return {
        positions: positionsWithWeight,
        totalValue,
        previousTotalValue,
        dailyResult,
        dailyResultPct,
        topGainers,
        topLosers,
        sectorConcentration,
        timestamp: new Date().toISOString(),
      } satisfies SnapshotResult;
    }),

    getPositions: publicProcedure.query(async () => {
      return await getPositions();
    }),

    getHistory: publicProcedure.query(async () => {
      return await getDailyHistory();
    }),

    getAlerts: publicProcedure.query(async () => {
      return await getAlerts();
    }),

    getEvents: publicProcedure.query(async () => {
      return await getEvents();
    }),
  }),
});

export type AppRouter = typeof appRouter;
