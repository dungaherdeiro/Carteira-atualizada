import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { trpc } from "@/lib/trpc";
import { startLogin } from "@/const";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  CalendarDays,
  Bell,
  PieChart as PieChartIcon,
  Trophy,
  Info,
  Activity,
  Globe2,
  Layers3,
  UsersRound,
  Landmark,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Cell,
  Pie,
  PieChart,
  Tooltip,
} from "recharts";
import type { ChartConfig } from "@/components/ui/chart";

// ─── Formatting helpers ──────────────────────────────────────────────────────

function formatBrl(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatNative(value: number | null | undefined, currency: "BRL" | "USD"): string {
  return currency === "USD" ? formatUsd(value) : formatBrl(value);
}

function positionTypeLabel(positionType: string): string {
  const labels: Record<string, string> = {
    quoted_b3: "B3",
    aggregate_brl: "Agregado BRL",
    aggregate_usd: "Agregado USD",
    fund: "Fundo",
    fii: "FII",
    fixed_income: "Renda fixa",
  };
  return labels[positionType] ?? positionType;
}

function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

// ─── Chart configs ────────────────────────────────────────────────────────────

const evolutionChartConfig: ChartConfig = {
  totalValue: {
    label: "Valor Total",
    color: "oklch(0.75 0.13 75)",
  },
};

const SECTOR_COLORS = [
  "oklch(0.75 0.13 75)",
  "oklch(0.68 0.16 145)",
  "oklch(0.62 0.20 250)",
  "oklch(0.58 0.22 25)",
  "oklch(0.68 0.15 300)",
  "oklch(0.70 0.12 200)",
  "oklch(0.60 0.16 100)",
  "oklch(0.75 0.10 30)",
];

const EVENT_TYPE_LABELS: Record<string, string> = {
  earnings: "Resultados",
  dividend: "Dividendo",
  assembly: "Assembleia",
  other: "Outro",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  earnings: "bg-blue-500/15 text-blue-300 border-blue-500/25",
  dividend: "bg-green-500/15 text-green-300 border-green-500/25",
  assembly: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  other: "bg-gray-500/15 text-gray-300 border-gray-500/25",
};

const ALERT_LEVEL_STYLES: Record<string, string> = {
  alto: "border-l-red-500/50 bg-red-500/5",
  médio: "border-l-amber-500/50 bg-amber-500/5",
  baixo: "border-l-blue-500/50 bg-blue-500/5",
};

const ALERT_LEVEL_BADGE: Record<string, string> = {
  alto: "border-red-500/25 text-red-300",
  médio: "border-amber-500/25 text-amber-300",
  baixo: "border-blue-500/25 text-blue-300",
};

const THESIS_STYLES: Record<string, string> = {
  intacta: "text-gain",
  alterada: "text-amber-300",
  rompida: "text-loss",
};

// ─── Dashboard Component ─────────────────────────────────────────────────────

export default function Dashboard() {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Activity className="h-8 w-8 text-primary animate-pulse" />
          <span className="text-sm text-muted-foreground">Carregando painel...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-3">
              <Wallet className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-semibold tracking-tight">
                Painel da Carteira
              </h1>
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              O acesso ao painel da carteira requer autenticação. Continue para iniciar o login.
            </p>
          </div>
          <Button
            onClick={() => startLogin()}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Entrar
          </Button>
        </div>
        <div className="flex items-center justify-center gap-2 mt-8">
          <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <p className="text-[11px] text-muted-foreground text-center">
            Análise baseada em dados públicos, não recomendação de compra/venda.
          </p>
        </div>
      </div>
    );
  }

  return <DashboardContent />;
}

function DashboardContent() {
  const snapshot = trpc.portfolio.getSnapshot.useQuery();
  const history = trpc.portfolio.getHistory.useQuery();
  const alerts = trpc.portfolio.getAlerts.useQuery();
  const events = trpc.portfolio.getEvents.useQuery();

  const isLoading = snapshot.isLoading;

  const snapshotData = snapshot.data;
  const historyData = (history.data ?? []).slice().reverse().map((h: any) => ({
    date: h.date,
    totalValue: parseFloat(h.totalValueBrl),
  }));
  const alertsData = alerts.data ?? [];
  const eventsData = (events.data ?? []).slice().reverse();

  const totalValue = snapshotData?.totalValue ?? 0;
  const dailyResult = snapshotData?.dailyResult ?? 0;
  const dailyResultPct = snapshotData?.dailyResultPct ?? 0;
  const isGain = dailyResult >= 0;
  const currencyTotals = snapshotData?.currencyTotals ?? [];
  const accountConcentration = snapshotData?.accountConcentration ?? [];
  const brlTotal = snapshotData?.totalValueNativeBrl ?? 0;
  const usdTotal = snapshotData?.totalValueUsd ?? 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <header className="border-b border-border bg-card/40 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center justify-between px-6 lg:px-8 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 border border-primary/20">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight leading-tight">
                Painel da Carteira Principal
              </h1>
              <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                {snapshotData?.positions.length ?? 0} posições · B3 + carteira global · Yahoo Finance
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {snapshotData && (
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-gain animate-pulse" />
                <span className="text-[11px] text-muted-foreground hidden sm:inline tabular-nums">
                  {new Date(snapshotData.timestamp).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ─── Main content ───────────────────────────────────────── */}
      <main className="flex-1 px-4 lg:px-8 py-6 space-y-5 max-w-[1440px] mx-auto w-full">
        {/* ─── Hero: Valor Total + Resultado do Dia ─────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Valor Total — card dominante */}
          <Card className="lg:col-span-2 bg-card border-border card-glow overflow-hidden">
            <CardContent className="pt-6 pb-6">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-12 w-56" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <Wallet className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Valor Consolidado em BRL
                    </span>
                  </div>
                    <div className="text-5xl font-bold tracking-tight tabular-nums leading-none">
                    {formatBrl(totalValue)}
                  </div>
                  <div className="mt-4 flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Ativos:</span>
                      <span className="font-medium tabular-nums">{snapshotData?.positions.length ?? 0}</span>
                    </div>
                    <div className="h-3 w-px bg-border" />
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Valor anterior:</span>
                      <span className="font-medium tabular-nums">{formatBrl(snapshotData?.previousTotalValue)}</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Resultado do Dia */}
          <Card className="bg-card border-border card-elevated">

            <CardContent className="pt-6 pb-6">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-40" />
                  <Skeleton className="h-5 w-24" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    {isGain ? (
                      <TrendingUp className="h-4 w-4 text-gain" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-loss" />
                    )}
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Resultado do Dia
                    </span>
                  </div>
                  <div
                    className={`text-3xl font-bold tracking-tight tabular-nums leading-none ${
                      isGain ? "text-gain" : "text-loss"
                    }`}
                  >
                    {formatBrl(dailyResult)}
                  </div>
                  <div
                    className={`mt-3 text-xl font-medium tabular-nums ${
                      isGain ? "text-gain" : "text-loss"
                    }`}
                  >
                    {formatPct(dailyResultPct)}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ─── Moedas, contas e câmbio ───────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider">
                <Globe2 className="h-4 w-4 text-primary" />
                Exposição por moeda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                  <span className="text-sm text-muted-foreground">Brasil · BRL</span>
                </div>
                <div className="text-right">
                  <div className="font-mono font-semibold tabular-nums">{formatBrl(brlTotal)}</div>
                  <div className="text-[11px] text-muted-foreground tabular-nums">
                    {(currencyTotals.find((item: any) => item.currency === "BRL")?.weight ?? 0).toFixed(1)}%
                  </div>
                </div>
              </div>
              <Separator className="bg-border" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
                  <span className="text-sm text-muted-foreground">Global · USD</span>
                </div>
                <div className="text-right">
                  <div className="font-mono font-semibold tabular-nums">{formatUsd(usdTotal)}</div>
                  <div className="text-[11px] text-muted-foreground tabular-nums">
                    {formatBrl(snapshotData?.currencyTotals.find((item: any) => item.currency === "USD")?.brlValue)} · {(currencyTotals.find((item: any) => item.currency === "USD")?.weight ?? 0).toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="rounded-md bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground flex items-center justify-between">
                <span>USD/BRL de referência</span>
                <span className="font-mono tabular-nums">{snapshotData?.usdBrlRate ? `R$ ${snapshotData.usdBrlRate.toFixed(4)}` : "indisponível"}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider">
                <UsersRound className="h-4 w-4 text-primary" />
                Patrimônio por titular
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {accountConcentration.map((account: any) => (
                  <div key={`${account.accountHolder}-${account.account ?? ""}-${account.currency ?? ""}`} className="rounded-lg border border-border bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground truncate" title={account.accountHolder}>{account.accountHolder}</div>
                    <div className="mt-1 font-mono font-semibold tabular-nums">{formatBrl(account.value)}</div>
                    <div className="mt-1 text-[11px] text-primary tabular-nums">{account.weight.toFixed(1)}% do consolidado</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
                <Landmark className="h-3.5 w-3.5 text-primary" />
                Totais em BRL; posições em USD convertidas pela taxa de referência exibida ao lado.
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── Gráfico de Evolução Histórica ────────────────────── */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider">
              <TrendingUp className="h-4 w-4 text-primary" />
              Evolução Histórica
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-1">A série histórica disponível antecede a unificação; o consolidado atual está em formação.</p>
          </CardHeader>
          <CardContent>
            {history.isLoading ? (
              <Skeleton className="h-[220px] w-full rounded-md" />
            ) : historyData.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                Sem dados históricos disponíveis ainda.
              </div>
            ) : (
              <ChartContainer config={evolutionChartConfig} className="h-[220px] w-full">
                <AreaChart data={historyData} margin={{ left: 8, right: 8, top: 4, bottom: 4 }}>
                  <defs>
                    <linearGradient id="colorTotalValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.75 0.13 75)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="oklch(0.75 0.13 75)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.006 260)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "oklch(0.58 0.008 260)", fontSize: 11 }}
                    axisLine={{ stroke: "oklch(0.28 0.006 260)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "oklch(0.58 0.008 260)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                    width={56}
                  />
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="border border-border bg-popover rounded-lg px-3 py-2 text-xs shadow-xl">
                          <div className="text-muted-foreground mb-1">{payload[0].payload.date}</div>
                          <div className="font-mono font-semibold tabular-nums">
                            {formatBrl(payload[0].value)}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="totalValue"
                    stroke="oklch(0.75 0.13 75)"
                    strokeWidth={2}
                    fill="url(#colorTotalValue)"
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* ─── Tabela de Posições ───────────────────────────────── */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider">
              <Wallet className="h-4 w-4 text-primary" />
              Posições da Carteira · {snapshotData?.positions.length ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-md" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto -mx-2">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Ticker</TableHead>
                      <TableHead className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Empresa / conta</TableHead>
                      <TableHead className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Moeda / tipo</TableHead>
                      <TableHead className="text-muted-foreground text-xs font-medium uppercase tracking-wider text-right">Qtd.</TableHead>
                      <TableHead className="text-muted-foreground text-xs font-medium uppercase tracking-wider text-right">Cotação origem</TableHead>
                      <TableHead className="text-muted-foreground text-xs font-medium uppercase tracking-wider text-right">Valor BRL</TableHead>
                      <TableHead className="text-muted-foreground text-xs font-medium uppercase tracking-wider text-right">Var. Dia</TableHead>
                      <TableHead className="text-muted-foreground text-xs font-medium uppercase tracking-wider text-right">Rentab. Acum.</TableHead>
                      <TableHead className="text-muted-foreground text-xs font-medium uppercase tracking-wider text-right">Peso</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(snapshotData?.positions ?? [])
                      .sort((a: any, b: any) => (b.marketValue ?? 0) - (a.marketValue ?? 0))
                      .map((pos: any) => {
                        const gain = (pos.dailyChangePct ?? 0) >= 0;
                        return (
                          <TableRow
                            key={`${pos.id}-${pos.account}-${pos.ticker}`}
                            className="border-border hover:bg-accent/20 transition-colors"
                          >
                            <TableCell className="font-mono font-semibold text-sm py-2.5">
                              {pos.ticker}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground py-2.5">
                              <div className="text-foreground/90">{pos.company}</div>
                              <div className="text-[10px] mt-0.5 truncate max-w-[180px]" title={pos.account}>{pos.account}</div>
                              {pos.sourceInvestedValue !== null && pos.sourceInvestedValue !== undefined && (
                                <div className="text-[10px] mt-1 text-primary tabular-nums">
                                  Aplicado {formatNative(pos.sourceInvestedValue, pos.currency)} · rendimento {formatNative(pos.sourceReturnValue, pos.currency)}
                                  {pos.sourceAsOfDate ? ` · ${new Date(`${pos.sourceAsOfDate}T12:00:00`).toLocaleDateString("pt-BR")}` : ""}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="py-2.5">
                              <div className="flex items-center gap-1.5">
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border">{pos.currency}</Badge>
                                <span className="text-[10px] text-muted-foreground">{positionTypeLabel(pos.positionType)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-sm py-2.5">
                              {pos.quantity.toLocaleString("pt-BR")}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-sm py-2.5 font-mono">
                              {formatNative(pos.currentPrice, pos.currency)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-sm py-2.5 font-medium">
                              <div>{formatBrl(pos.marketValue)}</div>
                              {pos.currency === "USD" && <div className="text-[10px] text-muted-foreground">{formatUsd(pos.nativeValue)}</div>}
                              {pos.sourceReturnPct !== null && pos.sourceReturnPct !== undefined && (
                                <div className={`text-[10px] tabular-nums ${(pos.sourceReturnPct ?? 0) >= 0 ? "text-gain" : "text-loss"}`}>
                                  {formatPct(pos.sourceReturnPct)} na origem
                                </div>
                              )}
                            </TableCell>
                            <TableCell
                              className={`text-right tabular-nums text-sm py-2.5 font-medium font-mono ${
                                gain ? "text-gain" : "text-loss"
                              }`}
                            >
                              {formatPct(pos.dailyChangePct)}
                            </TableCell>
                            <TableCell
                              className={`text-right tabular-nums text-sm py-2.5 font-medium font-mono ${
                                (pos.accumulatedReturnPct ?? 0) >= 0 ? "text-gain" : "text-loss"
                              }`}
                            >
                              {formatPct(pos.accumulatedReturnPct)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-sm py-2.5 text-muted-foreground">
                              {pos.weight !== null ? `${pos.weight.toFixed(1)}%` : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Ranking de Contribuições + Concentração Setorial ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Ranking */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider">
                <Trophy className="h-4 w-4 text-primary" />
                Ranking de Contribuições
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[200px] w-full rounded-md" />
              ) : (
                <div className="space-y-4">
                  {/* Top Gainers */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-3.5 w-3.5 text-gain" />
                      <span className="text-xs font-medium text-gain uppercase tracking-wider">Maiores Altas</span>
                    </div>
                    <div className="space-y-1">
                      {(snapshotData?.topGainers ?? []).map((g, i) => (
                        <div
                          key={`${g.ticker}-${g.company ?? ""}-${i}`}
                          className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-accent/20 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-[11px] text-muted-foreground w-4 tabular-nums">{i + 1}</span>
                            <span className="font-mono font-semibold text-sm">{g.ticker}</span>
                            <span className="text-xs text-muted-foreground hidden sm:inline truncate max-w-[120px]">
                              {g.company}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gain tabular-nums font-mono">
                            {formatPct(g.dailyChangePct)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator className="bg-border" />

                  {/* Top Losers */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="h-3.5 w-3.5 text-loss" />
                      <span className="text-xs font-medium text-loss uppercase tracking-wider">Maiores Baixas</span>
                    </div>
                    <div className="space-y-1">
                      {(snapshotData?.topLosers ?? []).map((l, i) => (
                        <div
                          key={`${l.ticker}-${l.company ?? ""}-${i}`}
                          className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-accent/20 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-[11px] text-muted-foreground w-4 tabular-nums">{i + 1}</span>
                            <span className="font-mono font-semibold text-sm">{l.ticker}</span>
                            <span className="text-xs text-muted-foreground hidden sm:inline truncate max-w-[120px]">
                              {l.company}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-loss tabular-nums font-mono">
                            {formatPct(l.dailyChangePct)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Concentração Setorial */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider">
                <PieChartIcon className="h-4 w-4 text-primary" />
                Concentração Setorial
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[240px] w-full rounded-md" />
              ) : (snapshotData?.sectorConcentration ?? []).length === 0 ? (
                <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
                  Sem dados setoriais disponíveis.
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <ChartContainer
                    config={{ value: { label: "Valor", color: "oklch(0.75 0.13 75)" } }}
                    className="h-[180px] w-full max-w-[280px]"
                  >
                    <PieChart>
                      <Pie
                        data={snapshotData?.sectorConcentration ?? []}
                        dataKey="value"
                        nameKey="sector"
                        cx="50%"
                        cy="50%"
                        outerRadius={75}
                        innerRadius={38}
                        paddingAngle={2}
                        stroke="oklch(0.17 0.006 260)"
                        strokeWidth={2}
                      >
                        {(snapshotData?.sectorConcentration ?? []).map((_, i) => (
                          <Cell
                            key={i}
                            fill={SECTOR_COLORS[i % SECTOR_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }: any) => {
                          if (!active || !payload?.length) return null;
                          const item = payload[0];
                          return (
                            <div className="border border-border bg-popover rounded-lg px-3 py-2 text-xs shadow-xl">
                              <div className="font-medium mb-0.5">{item.payload.sector}</div>
                              <div className="text-muted-foreground font-mono tabular-nums">
                                {formatBrl(item.payload.value)} · {item.payload.weight.toFixed(1)}%
                              </div>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ChartContainer>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 w-full text-xs">
                    {(snapshotData?.sectorConcentration ?? []).map((s, i) => (
                      <div key={`${s.sector}-${s.value ?? 0}`} className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: SECTOR_COLORS[i % SECTOR_COLORS.length] }}
                        />
                        <span className="text-muted-foreground truncate flex-1">{s.sector}</span>
                        <span className="font-medium tabular-nums">{s.weight.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ─── Alertas Materiais ───────────────────────────────── */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider">
              <Bell className="h-4 w-4 text-primary" />
              Alertas Materiais
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.isLoading ? (
              <Skeleton className="h-[120px] w-full rounded-md" />
            ) : alertsData.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                Nenhum alerta material registrado.
              </div>
            ) : (
              <div className="space-y-3">
                {alertsData.map((alert: any) => (
                  <Alert
                    key={alert.id}
                    className={`border-l-4 ${ALERT_LEVEL_STYLES[alert.level] ?? ALERT_LEVEL_STYLES.baixo}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-mono font-bold text-sm">{alert.ticker}</span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] uppercase ${ALERT_LEVEL_BADGE[alert.level] ?? ALERT_LEVEL_BADGE.baixo}`}
                          >
                            {alert.level}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            {alert.evidenceDate}
                          </span>
                        </div>
                        <AlertDescription className="text-sm space-y-1">
                          <div>
                            <span className="text-muted-foreground text-xs">Mudança: </span>
                            {alert.whatChanged}
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Impacto: </span>
                            {alert.impact}
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Tese: </span>
                            <span className={THESIS_STYLES[alert.thesisStatus] ?? ""}>
                              {alert.thesisStatus}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Próximo passo: </span>
                            {alert.nextStep}
                          </div>
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Calendário de Eventos Corporativos ──────────────── */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider">
              <CalendarDays className="h-4 w-4 text-primary" />
              Calendário de Eventos Corporativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {events.isLoading ? (
              <Skeleton className="h-[120px] w-full rounded-md" />
            ) : eventsData.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                Nenhum evento corporativo próximo.
              </div>
            ) : (
              <div className="space-y-1.5">
                {eventsData.map((event: any) => {
                  const [year, month, day] = event.eventDate.split("-");
                  return (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-accent/20 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center min-w-[48px] shrink-0">
                        <span className="text-lg font-bold tabular-nums leading-none">
                          {day}
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase">
                          {month}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono font-semibold text-sm">{event.ticker}</span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] uppercase ${EVENT_TYPE_COLORS[event.eventType] ?? EVENT_TYPE_COLORS.other}`}
                          >
                            {EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* ─── Disclaimer Fixo ─────────────────────────────────────── */}
      <footer className="border-t border-border bg-card/60 backdrop-blur-md">
        <div className="px-6 py-2.5 flex items-center justify-center gap-2">
          <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <p className="text-[11px] text-muted-foreground text-center">
            Análise baseada em dados públicos, não recomendação de compra/venda.
          </p>
        </div>
      </footer>
    </div>
  );
}
