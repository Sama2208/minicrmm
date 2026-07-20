import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Trophy,
  RefreshCw,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/attribution")({
  component: AttributionPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type MetaInsightRow = {
  campaign_id: string;
  campaign_name: string;
  spend: number;
  impressions: number;
  clicks: number;
  cpm: number;
  cpc: number;
};

type LeadRow = {
  meta_campaign_id: string | null;
  status: string;
  created_at: string;
};

type MergedRow = {
  campaign_id: string;
  campaign_name: string;
  spend: number;
  lidlar: number;
  won: number;
  lost: number;
  qual: number;
  jarayonda: number;
  cpl: number;
  cost_per_won: number;
  conv_rate: number;
  qual_rate: number;
};

type SortCol = "spend" | "lidlar" | "won" | "lost" | "qual" | "cpl" | "costWon";

// ─── Status constants ─────────────────────────────────────────────────────────

const WON_STATUSES   = ["yotdi", "qatnadi"];
const QUAL_STATUSES  = ["yotishga_yozildi", "konsultatsiyada_boldi"];
const LOST_STATUSES  = ["sifatsiz_lid", "kotarmadi"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function today() { return new Date().toISOString().slice(0, 10); }
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function fmt(n: number, dec = 0) {
  return n.toLocaleString("uz-UZ", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtUSD(n: number) {
  return `$${fmt(n, 2)}`;
}
function pct(a: number, b: number) {
  return b ? ((a / b) * 100).toFixed(1) : "0.0";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function AttributionPage() {
  const [since, setSince] = useState(daysAgo(30));
  const [until, setUntil] = useState(today());
  const [refreshKey, setRefreshKey] = useState(0);
  const [campaignSearch, setCampaignSearch] = useState("");
  const [sortCol, setSortCol] = useState<SortCol>("spend");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
  };

  // 1. Meta Ads spend
  const adsQ = useQuery({
    queryKey: ["meta-ads-insights", since, until, refreshKey],
    queryFn: async () => {
      const res = await fetch(
        "https://uddkghraacwlflxrpcdq.supabase.co/functions/v1/meta-ads-insights",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ since, until }),
        }
      );
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      return ((json as { data?: MetaInsightRow[] })?.data ?? []) as MetaInsightRow[];
    },
    retry: 1,
  });

  // 2. CRM leads with campaign info
  const leadsQ = useQuery({
    queryKey: ["leads-attribution", since, until, refreshKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("meta_campaign_id, status, created_at")
        .gte("created_at", since)
        .lte("created_at", until + "T23:59:59");
      if (error) throw error;
      return (data ?? []) as LeadRow[];
    },
  });

  // 3. Merge
  const { rows, kpi, dailyWon } = useMemo(() => {
    const adData  = adsQ.data  ?? [];
    const crmData = leadsQ.data ?? [];

    const adMap = new Map<string, MetaInsightRow>();
    adData.forEach((r) => adMap.set(r.campaign_id, r));

    const crmMap = new Map<string, { lidlar: number; won: number; lost: number; qual: number; jarayonda: number }>();
    crmData.forEach((l) => {
      const cid = l.meta_campaign_id ?? "noma'lum";
      if (!crmMap.has(cid)) crmMap.set(cid, { lidlar: 0, won: 0, lost: 0, qual: 0, jarayonda: 0 });
      const r = crmMap.get(cid)!;
      r.lidlar++;
      if (WON_STATUSES.includes(l.status))   r.won++;
      else if (LOST_STATUSES.includes(l.status)) r.lost++;
      else if (QUAL_STATUSES.includes(l.status)) r.qual++;
      else r.jarayonda++;
    });

    const allIds = new Set([...adMap.keys(), ...crmMap.keys()]);
    const merged: MergedRow[] = [];

    allIds.forEach((cid) => {
      const ad  = adMap.get(cid);
      const crm = crmMap.get(cid) ?? { lidlar: 0, won: 0, lost: 0, qual: 0, jarayonda: 0 };
      const spend = ad?.spend ?? 0;
      const { lidlar, won, lost, qual, jarayonda } = crm;

      merged.push({
        campaign_id:   cid,
        campaign_name: ad?.campaign_name ?? cid,
        spend,
        lidlar,
        won,
        lost,
        qual,
        jarayonda,
        cpl:          lidlar ? spend / lidlar : 0,
        cost_per_won: won    ? spend / won    : 0,
        conv_rate:    parseFloat(pct(won, lidlar)),
        qual_rate:    parseFloat(pct(qual, lidlar)),
      });
    });

    merged.sort((a, b) => {
      const mult = sortDir === "desc" ? -1 : 1;
      switch (sortCol) {
        case "spend": return mult * (b.spend - a.spend);
        case "lidlar": return mult * (b.lidlar - a.lidlar);
        case "won": return mult * (b.won - a.won);
        case "lost": return mult * (b.lost - a.lost);
        case "qual": return mult * (b.qual - a.qual);
        case "cpl": {
          const aCpl = a.lidlar ? a.spend / a.lidlar : 0;
          const bCpl = b.lidlar ? b.spend / b.lidlar : 0;
          return mult * (bCpl - aCpl);
        }
        case "costWon": {
          const aCw = a.won ? a.spend / a.won : 0;
          const bCw = b.won ? b.spend / b.won : 0;
          return mult * (bCw - aCw);
        }
        default: return mult * (b.spend - a.spend);
      }
    });

    const totalSpend  = merged.reduce((s, r) => s + r.spend, 0);
    const totalLeads  = merged.reduce((s, r) => s + r.lidlar, 0);
    const totalWon    = merged.reduce((s, r) => s + r.won, 0);
    const totalLost   = merged.reduce((s, r) => s + r.lost, 0);
    const totalQual   = merged.reduce((s, r) => s + r.qual, 0);
    const totalIn     = merged.reduce((s, r) => s + r.jarayonda, 0);

    const kpi = {
      spend:       totalSpend,
      leads:       totalLeads,
      won:         totalWon,
      lost:        totalLost,
      qual:        totalQual,
      jarayonda:   totalIn,
      cpl:         totalLeads ? totalSpend / totalLeads : 0,
      cost_per_won: totalWon ? totalSpend / totalWon : 0,
      conv_rate:   parseFloat(pct(totalWon, totalLeads)),
      qual_rate:   parseFloat(pct(totalQual, totalLeads)),
    };

    const dayMap = new Map<string, number>();
    crmData
      .filter((l) => WON_STATUSES.includes(l.status))
      .forEach((l) => {
        const day = l.created_at.slice(0, 10);
        dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
      });
    const dailyWon = Array.from(dayMap.entries())
      .map(([day, count]) => ({ day, won: count }))
      .sort((a, b) => a.day.localeCompare(b.day));

    return { rows: merged, kpi, dailyWon };
  }, [adsQ.data, leadsQ.data, sortCol, sortDir]);

  const isLoading = adsQ.isLoading || leadsQ.isLoading;
  const adsError  = adsQ.error as Error | null;

  const filteredRows = useMemo(() => {
    if (!campaignSearch.trim()) return rows;
    const q = campaignSearch.toLowerCase();
    return rows.filter((r) => r.campaign_name.toLowerCase().includes(q));
  }, [rows, campaignSearch]);

  const SortIcon = ({ col }: { col: SortCol }) => {
    if (sortCol !== col) return <ArrowUpDown className="inline h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "desc"
      ? <ArrowDown className="inline h-3 w-3 ml-1" />
      : <ArrowUp className="inline h-3 w-3 ml-1" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">📊 Reklama Attribution</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Facebook Ads xarajat + CRM natijasi</p>
        </div>
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <Label className="text-xs">Boshlanish</Label>
            <Input type="date" value={since} onChange={(e) => setSince(e.target.value)} className="w-[150px] mt-1" />
          </div>
          <div>
            <Label className="text-xs">Tugash</Label>
            <Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} className="w-[150px] mt-1" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {[
              { label: "Bugun", days: 0 },
              { label: "7 kun", days: 7 },
              { label: "14 kun", days: 14 },
              { label: "30 kun", days: 30 },
              { label: "90 kun", days: 90 },
            ].map(({ label, days }) => (
              <Button
                key={label}
                variant="outline"
                size="sm"
                className="text-xs h-8 px-2.5"
                onClick={() => {
                  const d = days === 0 ? today() : daysAgo(days);
                  setSince(d);
                  setUntil(today());
                  setRefreshKey((k) => k + 1);
                }}
              >
                {label}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => setRefreshKey((k) => k + 1)} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Yangilash
          </Button>
        </div>
      </div>

      {/* Tabs (visual only) */}
      <div className="flex gap-1 border-b">
        {["Kampaniyalar", "Ad Sets", "Reklamalar"].map((tab, i) => (
          <button
            key={tab}
            disabled={i !== 0}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              i === 0
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground opacity-50 cursor-not-allowed"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Meta API error notice */}
      {adsError && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-700">
          ⚠️ Meta Ads ma'lumoti yuklanmadi: {adsError.message}. Faqat CRM ma'lumoti ko'rsatilmoqda.
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={DollarSign} label="Xarajat"  value={fmtUSD(kpi.spend)}       color="text-slate-700" bg="bg-slate-50" loading={isLoading} />
        <KpiCard icon={Users}      label="Lidlar"    value={fmt(kpi.leads)}           color="text-blue-700"  bg="bg-blue-50"  loading={isLoading} />
        <KpiCard icon={Trophy}     label="WON"       value={fmt(kpi.won)}             color="text-emerald-700" bg="bg-emerald-50" loading={isLoading} />
        <KpiCard icon={TrendingDown} label="LOST"   value={fmt(kpi.lost)}            color="text-red-700"   bg="bg-red-50"   loading={isLoading} />
        <KpiCard icon={DollarSign} label="CPL"      value={fmtUSD(kpi.cpl)}          color="text-violet-700" bg="bg-violet-50" loading={isLoading} />
        <KpiCard icon={TrendingUp} label="CONV.RATE" value={`${kpi.conv_rate}%`}     color="text-amber-700"  bg="bg-amber-50"  loading={isLoading} />
      </div>

      {/* Campaign table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kampaniyalar bo'yicha Attribution</CardTitle>
        </CardHeader>
        <div className="px-4 pb-3 pt-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Kampaniya nomi bo'yicha qidirish..."
              value={campaignSearch}
              onChange={(e) => setCampaignSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
        </div>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Yuklanmoqda...</div>
          ) : filteredRows.length === 0 && rows.length > 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              "{campaignSearch}" bo'yicha kampaniya topilmadi.
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Ma'lumot topilmadi. Sana oralig'ini o'zgartiring yoki reklamadan lid keling.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 text-xs">
                    <TableHead className="pl-4">KAMPANIYA</TableHead>
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("spend")}>
                      XARAJAT <SortIcon col="spend" />
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("lidlar")}>
                      LIDLAR <SortIcon col="lidlar" />
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("cpl")}>
                      CPL <SortIcon col="cpl" />
                    </TableHead>
                    <TableHead className="text-right text-emerald-600 cursor-pointer select-none" onClick={() => toggleSort("won")}>
                      WON <SortIcon col="won" />
                    </TableHead>
                    <TableHead className="text-right text-red-500 cursor-pointer select-none" onClick={() => toggleSort("lost")}>
                      LOST <SortIcon col="lost" />
                    </TableHead>
                    <TableHead className="text-right text-blue-600 cursor-pointer select-none" onClick={() => toggleSort("qual")}>
                      QUAL <SortIcon col="qual" />
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("costWon")}>
                      COST/WON <SortIcon col="costWon" />
                    </TableHead>
                    <TableHead className="text-right">CONV.RATE</TableHead>
                    <TableHead className="text-right pr-4">QUAL.RATE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((r) => (
                    <TableRow key={r.campaign_id} className="text-sm">
                      <TableCell className="pl-4 max-w-[200px]">
                        <div className="font-medium truncate" title={r.campaign_name}>
                          {r.campaign_name === "noma'lum"
                            ? <span className="text-muted-foreground italic">Noma'lum manba</span>
                            : r.campaign_name}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">{r.campaign_id}</div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{fmtUSD(r.spend)}</TableCell>
                      <TableCell className="text-right">{r.lidlar}</TableCell>
                      <TableCell className="text-right text-violet-600">{fmtUSD(r.cpl)}</TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">{r.won}</TableCell>
                      <TableCell className="text-right text-red-500">{r.lost}</TableCell>
                      <TableCell className="text-right text-blue-600">{r.qual}</TableCell>
                      <TableCell className="text-right">
                        {r.cost_per_won > 0
                          ? <span className="font-medium">{fmtUSD(r.cost_per_won)}</span>
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-semibold ${r.conv_rate >= 10 ? "text-emerald-600" : r.conv_rate >= 5 ? "text-amber-600" : "text-slate-600"}`}>
                          {r.conv_rate.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-4 text-slate-600">{r.qual_rate.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Won dynamics chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">WON dinamikasi (kunlik)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* KPI mini cards above chart */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {[
              { label: "WON", value: fmt(kpi.won), color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "LOST", value: fmt(kpi.lost), color: "text-red-500", bg: "bg-red-50" },
              { label: "JARAYONDA", value: fmt(kpi.jarayonda), color: "text-purple-600", bg: "bg-purple-50" },
              {
                label: "CONV.RATE",
                value: kpi.leads ? `${((kpi.won / kpi.leads) * 100).toFixed(1)}%` : "—",
                color: "text-blue-600",
                bg: "bg-blue-50",
              },
              {
                label: "COST/WON",
                value: kpi.won ? fmtUSD(kpi.spend / kpi.won) : "—",
                color: "text-orange-600",
                bg: "bg-orange-50",
              },
              { label: "JAMI LIDLAR", value: fmt(kpi.leads), color: "text-foreground", bg: "bg-muted" },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`${bg} rounded-lg px-3 py-2`}>
                <div className={`text-lg font-bold ${color}`}>{value}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">{label}</div>
              </div>
            ))}
          </div>

          {dailyWon.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Ma'lumot yo'q</div>
          ) : (
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <LineChart data={dailyWon}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v: number) => [`${v} sotuv`, "WON"]}
                    labelFormatter={(l) => `Sana: ${l}`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="won"
                    name="WON (sotuv)"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#10b981" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cost/Won card */}
      {kpi.won > 0 && kpi.spend > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="pt-5 pb-4">
              <div className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Bir sotuv qiymati (COST/WON)</div>
              <div className="text-3xl font-bold text-emerald-700 mt-1">{fmtUSD(kpi.cost_per_won)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Jami xarajat {fmtUSD(kpi.spend)} ÷ {kpi.won} sotuv
              </div>
            </CardContent>
          </Card>
          <Card className="border-violet-200 bg-violet-50/50">
            <CardContent className="pt-5 pb-4">
              <div className="text-xs text-violet-600 font-medium uppercase tracking-wide">Bir lid qiymati (CPL)</div>
              <div className="text-3xl font-bold text-violet-700 mt-1">{fmtUSD(kpi.cpl)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Jami xarajat {fmtUSD(kpi.spend)} ÷ {kpi.leads} lid
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── KpiCard ──────────────────────────────────────────────────────────────────

type KpiCardProps = {
  icon: React.FC<{ className?: string }>;
  label: string;
  value: string | number;
  color: string;
  bg: string;
  loading?: boolean;
};

function KpiCard({ icon: Icon, label, value, color, bg, loading }: KpiCardProps) {
  return (
    <Card className={`${bg} border-0 shadow-sm`}>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Icon className={`h-3.5 w-3.5 ${color}`} />
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
        </div>
        {loading ? (
          <div className="h-7 w-16 bg-slate-200 animate-pulse rounded mt-0.5" />
        ) : (
          <div className={`text-2xl font-bold ${color}`}>{value}</div>
        )}
      </CardContent>
    </Card>
  );
}
