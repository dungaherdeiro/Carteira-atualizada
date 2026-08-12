import { describe, expect, it } from "vitest";
import { calculateDailyPerformance, calculateWeight } from "./portfolioCalculations";

describe("portfolio consolidated calculations", () => {
  it("calculates current, previous and daily result in BRL", () => {
    const result = calculateDailyPerformance([
      { marketValue: 1_200, previousMarketValue: 1_150 },
      { marketValue: 800, previousMarketValue: 820 },
    ]);

    expect(result.currentTotal).toBe(2_000);
    expect(result.previousTotal).toBe(1_970);
    expect(result.result).toBe(30);
    expect(result.resultPct).toBeCloseTo(1.5228, 3);
  });

  it("does not treat a position without previous close as daily performance", () => {
    const result = calculateDailyPerformance([
      { marketValue: 900, previousMarketValue: null },
      { marketValue: 1_100, previousMarketValue: 1_000 },
    ]);

    expect(result.currentTotal).toBe(2_000);
    expect(result.previousTotal).toBe(1_900);
    expect(result.result).toBe(100);
    expect(result.resultPct).toBeCloseTo(5.2631, 3);
  });

  it("calculates position weight only when the consolidated total is positive", () => {
    expect(calculateWeight(250, 1_000)).toBe(25);
    expect(calculateWeight(null, 1_000)).toBeNull();
    expect(calculateWeight(250, 0)).toBeNull();
  });
});
