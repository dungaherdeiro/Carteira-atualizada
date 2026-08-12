export interface DailyPerformancePoint {
  marketValue: number | null;
  previousMarketValue: number | null;
}

export interface DailyPerformance {
  currentTotal: number;
  previousTotal: number;
  result: number;
  resultPct: number;
}

/**
 * Calcula a variação diária do consolidado sem transformar posições sem
 * fechamento anterior em resultado do dia. Essas posições entram na base
 * atual e só passam a contribuir para a variação quando houver comparação.
 */
export function calculateDailyPerformance(points: DailyPerformancePoint[]): DailyPerformance {
  let currentTotal = 0;
  let previousTotal = 0;
  let result = 0;

  for (const point of points) {
    const current = point.marketValue;
    const previous = point.previousMarketValue;

    if (current !== null) currentTotal += current;

    if (previous !== null) {
      previousTotal += previous;
      if (current !== null) result += current - previous;
    } else if (current !== null) {
      previousTotal += current;
    }
  }

  return {
    currentTotal,
    previousTotal,
    result,
    resultPct: previousTotal > 0 ? (result / previousTotal) * 100 : 0,
  };
}

export function calculateWeight(value: number | null, total: number): number | null {
  return value !== null && total > 0 ? (value / total) * 100 : null;
}
