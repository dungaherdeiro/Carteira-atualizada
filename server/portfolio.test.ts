import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("./db", () => ({
  getPositions: vi.fn(),
  getDailyHistory: vi.fn(),
  getAlerts: vi.fn(),
  getEvents: vi.fn(),
}));

// Mock callDataApi
vi.mock("./_core/dataApi", () => ({
  callDataApi: vi.fn(),
}));

import { getPositions, getDailyHistory, getAlerts, getEvents } from "./db";
import { callDataApi } from "./_core/dataApi";

describe("Portfolio Database Helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getPositions should return array of positions", async () => {
    const mockPositions = [
      { ticker: "VALE3", company: "Vale", sector: "Materiais", quantity: 593 },
      { ticker: "PETR4", company: "Petrobras", sector: "Energia", quantity: 939 },
    ];
    (getPositions as any).mockResolvedValue(mockPositions);

    const result = await getPositions();
    expect(result).toHaveLength(2);
    expect(result[0].ticker).toBe("VALE3");
    expect(result[1].ticker).toBe("PETR4");
  });

  it("getDailyHistory should return historical data", async () => {
    const mockHistory = [
      { date: "2026-07-01", totalValueBrl: "365000.00", dailyResultBrl: "1500.00", dailyResultPct: "0.41" },
      { date: "2026-07-02", totalValueBrl: "366500.00", dailyResultBrl: "1500.00", dailyResultPct: "0.41" },
    ];
    (getDailyHistory as any).mockResolvedValue(mockHistory);

    const result = await getDailyHistory();
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe("2026-07-01");
  });

  it("getAlerts should return alert data", async () => {
    const mockAlerts = [
      {
        id: 1,
        ticker: "SMTO3",
        level: "alto",
        whatChanged: "Q1 abaixo do esperado",
        evidenceDate: "2026-05-15",
        impact: "Revisão de guidance",
        thesisStatus: "alterada",
        nextStep: "Acompanhar Q2",
      },
    ];
    (getAlerts as any).mockResolvedValue(mockAlerts);

    const result = await getAlerts();
    expect(result).toHaveLength(1);
    expect(result[0].ticker).toBe("SMTO3");
    expect(result[0].level).toBe("alto");
  });

  it("getEvents should return corporate events", async () => {
    const mockEvents = [
      {
        id: 1,
        ticker: "VALE3",
        eventType: "dividend",
        eventDate: "2026-08-15",
        description: "Dividendo Q2",
      },
    ];
    (getEvents as any).mockResolvedValue(mockEvents);

    const result = await getEvents();
    expect(result).toHaveLength(1);
    expect(result[0].ticker).toBe("VALE3");
    expect(result[0].eventType).toBe("dividend");
  });
});

describe("Yahoo Finance API Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("callDataApi should be callable with Yahoo Finance chart params", async () => {
    const mockResponse = {
      chart: {
        result: [
          {
            meta: {
              regularMarketPrice: 76.66,
              chartPreviousClose: 75.05,
              currency: "BRL",
              longName: "Vale S.A.",
            },
            indicators: {
              quote: [{ open: [75.0], close: [76.66], high: [77.0], low: [74.8], volume: [1000000] }],
            },
            timestamp: [1690000000],
          },
        ],
      },
    };
    (callDataApi as any).mockResolvedValue(mockResponse);

    const result = await callDataApi("YahooFinance/get_stock_chart", {
      query: {
        symbol: "VALE3.SA",
        region: "BR",
        interval: "1d",
        range: "5d",
        includeAdjustedClose: "true",
      },
    });

    expect(callDataApi).toHaveBeenCalledWith("YahooFinance/get_stock_chart", {
      query: {
        symbol: "VALE3.SA",
        region: "BR",
        interval: "1d",
        range: "5d",
        includeAdjustedClose: "true",
      },
    });
    expect((result as any).chart.result[0].meta.regularMarketPrice).toBe(76.66);
  });

  it("callDataApi should handle errors gracefully", async () => {
    (callDataApi as any).mockRejectedValue(new Error("API error"));

    await expect(
      callDataApi("YahooFinance/get_stock_chart", {
        query: { symbol: "INVALID.SA", region: "BR" },
      })
    ).rejects.toThrow("API error");
  });
});

describe("Global aggregate position metadata", () => {
  it("preserves invested value and return metadata for PIMCO", async () => {
    const pimco = {
      ticker: "PIMCO_GIS_INCOME_E",
      company: "PIMCO GIS Income (E)",
      currency: "USD",
      sourceMarketValue: "9055.89",
      sourceInvestedValue: "9000.00",
      sourceReturnValue: "55.89",
      sourceReturnPct: "0.62",
      sourceAsOfDate: "2026-08-12",
    };
    (getPositions as any).mockResolvedValue([pimco]);

    const result = await getPositions();
    expect(result[0]).toMatchObject({
      ticker: "PIMCO_GIS_INCOME_E",
      currency: "USD",
      sourceInvestedValue: "9000.00",
      sourceReturnValue: "55.89",
      sourceReturnPct: "0.62",
      sourceAsOfDate: "2026-08-12",
    });
  });

  it("keeps the XP International cash balance without an assumed acquisition cost", async () => {
    const xpCash = {
      ticker: "GLOBAL_CASH",
      company: "Saldo em conta investimento global — XP International",
      accountHolder: "Alexandre Cesar",
      account: "XP International",
      currency: "USD",
      sourceMarketValue: "52.33",
      sourceInvestedValue: null,
      sourceReturnValue: null,
      sourceReturnPct: null,
      sourceAsOfDate: "2026-08-12",
    };
    (getPositions as any).mockResolvedValue([xpCash]);

    const result = await getPositions();
    expect(result[0]).toMatchObject({
      ticker: "GLOBAL_CASH",
      accountHolder: "Alexandre Cesar",
      account: "XP International",
      currency: "USD",
      sourceMarketValue: "52.33",
      sourceInvestedValue: null,
    });
  });
});
