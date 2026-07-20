import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
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
} from "recharts";
import {
  RefreshCw,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
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

const WON_STATUSES  = ["yotdi", "qatnadi"];
const QUAL_STATUSES = ["yotishga_yozildi", "konsultatsiyada_boldi"];
const LOST_STATUSES = ["sifatsiz_lid", "kotarmadi"];

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
  const [since, setSince] = useState(today());
  const [until, setUntil] = useState(today());
  const [refreshKey, setRefreshKey] = useState(0);
  const [campaignSearch, setCampaignSearch] = useState("");
  const [sortCol, setSortCol] = useState<SortCol>("spend");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [activePeriod, setActivePeriod] = useState("Bugun");

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
  };

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

    const activeRows = merged.filter(
      (r) => r.spend > 0 && r.campaign_id !== "noma'lum"
    );

    const totalSpend  = activeRows.reduce((s, r) => s + r.spend, 0);
    const totalLeads  = activeRows.reduce((s, r) => s + r.lidlar, 0);
    const totalWon    = activeRows.reduce((s, r) => s + r.won, 0);
    const totalLost   = activeRows.reduce((s, r) => s + r.lost, 0);
    const totalQual   = activeRows.reduce((s, r) => s + r.qual, 0);
    const totalIn     = activeRows.reduce((s, r) => s + r.jarayonda, 0);

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

    return { rows: activeRows, kpi, dailyWon };
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

  const leadsCount = leadsQ.data?.length ?? 0;

  return (
    <div className="space-y-4">
      {/* BLOK 1: SARLAVHA */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lead Analytics</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-gray-900 text-white px-3 py-1.5 rounded-full text-sm font-medium">
            <span className="text-green-400">⬛</span>
            CRM ulangan · {leadsCount} ta lead
          </div>
          <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white rounded-full px-4">
            ⚙️ CRM sozlamalari
          </Button>
        </div>
      </div>

      {/* BLOK 2: FILTER QATORI */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <div className="border rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white flex items-center gap-1.5 cursor-default">
          act_3356671387908032
          <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
        </div>
        <div className="flex items-center border rounded-lg overflow-hidden bg-white">
          {[
            { label: "Bugun", days: 0 },
            { label: "7 kun", days: 7 },
            { label: "14 kun", days: 14 },
            { label: "30 kun", days: 30 },
            { label: "90 kun", days: 90 },
          ].map(({ label, days }) => (
            <button
              key={label}
              onClick={() => {
                const d = days === 0 ? today() : daysAgo(days);
                setSince(d);
                setUntil(today());
                setRefreshKey((k) => k + 1);
                setActivePeriod(label);
              }}
              className={`px-3 py-1.5 text-sm transition-colors ${
                activePeriod === label
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={isLoading}
          className="border rounded-lg"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {adsError && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-700">
          ⚠️ Meta Ads ma'lumoti yuklanmadi: {adsError.message}. Faqat CRM ma'lumoti ko'rsatilmoqda.
        </div>
      )}

      {/* BLOK 3: TABS */}
      <div className="flex gap-0 border-b border-gray-200 mb-0">
        {[
          { label: "Campaigns", count: rows.length },
          { label: "Ad sets", count: 0 },
          { label: "Ads", count: 0 },
        ].map(({ label, count }, i) => (
          <button
            key={label}
            disabled={i !== 0}
            className={`px-4 py-2.5 text-sm font-medium flex items-center gap-1.5 border-b-2 -mb-px transition-colors ${
              i === 0
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-400 cursor-not-allowed"
            }`}
          >
            {label}
            {count > 0 && (
              <span className={`text-xs ${i === 0 ? "text-blue-600" : "text-gray-400"}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* BLOK 4: JADVAL QISMI */}
      <div className="flex items-center justify-between px-0 py-3">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Kampaniya qidiring..."
            value={campaignSearch}
            onChange={(e) => setCampaignSearch(e.target.value)}
            className="pl-8 h-9 text-sm border-gray-200 rounded-lg"
          />
        </div>
        <span className="text-xs text-gray-400 italic">
          Sort: ustun sarlavhasiga bosing
        </span>
      </div>

      <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 border-b border-gray-100">
                <TableHead className="w-10 pl-4">
                  <input type="checkbox" className="rounded border-gray-300" />
                </TableHead>
                <TableHead
                  className="text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none"
                  onClick={() => toggleSort("lidlar")}
                >
                  KAMPANIYA <SortIcon col="lidlar" />
                </TableHead>
                <TableHead
                  className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right cursor-pointer select-none"
                  onClick={() => toggleSort("spend")}
                >
                  XARAJAT <SortIcon col="spend" />
                </TableHead>
                <TableHead
                  className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right cursor-pointer select-none"
                  onClick={() => toggleSort("lidlar")}
                >
                  LIDLAR <SortIcon col="lidlar" />
                </TableHead>
                <TableHead
                  className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right cursor-pointer select-none"
                  onClick={() => toggleSort("cpl")}
                >
                  CPL <SortIcon col="cpl" />
                </TableHead>
                <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("lidlar")}>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">ACT ↑</span>
                    <div className="w-full h-0.5 bg-blue-500 mt-1 rounded-full" />
                  </div>
                </TableHead>
                <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("won")}>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">WON ↑</span>
                    <div className="w-full h-0.5 bg-green-500 mt-1 rounded-full" />
                  </div>
                </TableHead>
                <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("lost")}>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-semibold text-red-500 uppercase tracking-wide">LOST ↑</span>
                    <div className="w-full h-0.5 bg-red-500 mt-1 rounded-full" />
                  </div>
                </TableHead>
                <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("qual")}>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">QUAL ↑</span>
                    <div className="w-full h-0.5 bg-purple-500 mt-1 rounded-full" />
                  </div>
                </TableHead>
                <TableHead
                  className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right cursor-pointer select-none"
                  onClick={() => toggleSort("costWon")}
                >
                  COST/WON <SortIcon col="costWon" />
                </TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right cursor-pointer select-none">
                  CONV.RATE ↑
                </TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right pr-4 cursor-pointer select-none">
                  QUAL.RATE ↑
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((r) => (
                <TableRow key={r.campaign_id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <TableCell className="pl-4">
                    <input type="checkbox" className="rounded border-gray-300" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-400 inline-block shrink-0" />
                      <span className="font-medium text-gray-900 text-sm">{r.campaign_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm text-gray-700 font-mono">
                    {r.spend > 0 ? fmtUSD(r.spend) : "$0.00"}
                  </TableCell>
                  <TableCell className="text-right text-sm text-gray-700">
                    {r.lidlar}
                  </TableCell>
                  <TableCell className="text-right text-sm text-gray-500">
                    {r.lidlar && r.spend > 0 ? fmtUSD(r.spend / r.lidlar) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-bold text-blue-600">{r.lidlar}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={r.won > 0 ? "font-bold text-green-600" : "text-gray-300"}>
                      {r.won}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={r.lost > 0 ? "font-bold text-red-500" : "text-gray-300"}>
                      {r.lost}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={r.qual > 0 ? "font-bold text-purple-600" : "text-gray-300"}>
                      {r.qual}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {r.won > 0 && r.spend > 0 ? (
                      <span className="font-medium text-gray-800">{fmtUSD(r.spend / r.won)}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    <span className={r.conv_rate > 0 ? "font-semibold text-gray-800" : "text-gray-400"}>
                      {r.conv_rate.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm pr-4">
                    <span className={r.qual_rate > 0 ? "font-semibold text-purple-600" : "text-gray-400"}>
                      {r.qual_rate.toFixed(1)}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}

              {filteredRows.length > 0 && (
                <TableRow className="bg-gray-50/80 border-t border-gray-200">
                  <TableCell className="pl-4" />
                  <TableCell>
                    <span className="text-sm text-gray-500 font-medium">
                      Jami ({filteredRows.length} kampaniya)
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold text-gray-800 font-mono">
                    {fmtUSD(kpi.spend)}
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold text-gray-800">
                    {kpi.leads}
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold text-gray-800 font-mono">
                    {kpi.leads && kpi.spend > 0 ? fmtUSD(kpi.spend / kpi.leads) : "$0.00"}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-bold text-blue-600">{kpi.leads}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-bold text-green-600">{kpi.won}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-bold text-red-500">{kpi.lost}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-bold text-purple-600">{kpi.qual}</span>
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold text-gray-800">
                    {kpi.won > 0 && kpi.spend > 0 ? fmtUSD(kpi.spend / kpi.won) : "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold text-gray-800">
                    {kpi.conv_rate.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold text-purple-600 pr-4">
                    {kpi.qual_rate.toFixed(1)}%
                  </TableCell>
                </TableRow>
              )}

              {filteredRows.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={12} className="py-16 text-center text-sm text-gray-400">
                    {campaignSearch
                      ? `"${campaignSearch}" bo'yicha kampaniya topilmadi`
                      : "Tanlangan davrda faol kampaniya topilmadi"}
                  </TableCell>
                </TableRow>
              )}

              {isLoading && (
                <>
                  {[1, 2, 3].map((i) => (
                    <TableRow key={i} className="border-b border-gray-50">
                      {[...Array(12)].map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-gray-100 animate-pulse rounded w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* BLOK 5: WON DINAMIKASI */}
      <div className="mt-6 bg-white border border-gray-100 rounded-xl p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900">Won dinamikasi — kunlar bo'yicha</h2>
          <p className="text-xs text-gray-400 mt-0.5">Kunlik won soni · tanlangan sana oralig'i</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-5">
          {[
            {
              label: "WON",
              value: kpi.won,
              sub: "Tanlangan davr",
              color: "text-green-600",
              icon: "✓",
              iconColor: "text-green-500",
            },
            {
              label: "LOST",
              value: kpi.lost,
              sub: "Tanlangan davr",
              color: "text-red-500",
              icon: "✕",
              iconColor: "text-red-400",
            },
            {
              label: "JARAYONDA",
              value: kpi.jarayonda,
              sub: "Hozirgi holat",
              color: "text-blue-600",
              icon: "◷",
              iconColor: "text-blue-400",
            },
            {
              label: "CONV.RATE",
              value: kpi.leads ? `${((kpi.won / kpi.leads) * 100).toFixed(1)}%` : "0.0%",
              sub: "Won / Jami",
              color: "text-orange-500",
              icon: "↗",
              iconColor: "text-orange-400",
            },
            {
              label: "COST/WON",
              value: kpi.won > 0 ? fmtUSD(kpi.spend / kpi.won) : "—",
              sub: "O'rtacha",
              color: "text-gray-700",
              icon: "$",
              iconColor: "text-gray-400",
            },
            {
              label: "DEAL TIME",
              value: "—",
              sub: "O'rtacha",
              color: "text-gray-500",
              icon: "◷",
              iconColor: "text-gray-300",
            },
          ].map(({ label, value, sub, color, icon, iconColor }) => (
            <div key={label} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{label}</span>
                <span className={`text-sm ${iconColor}`}>{icon}</span>
              </div>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>
            </div>
          ))}
        </div>

        {dailyWon.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-sm text-gray-400">
            Chart uchun ma'lumot yo'q
          </div>
        ) : (
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={dailyWon}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <Tooltip
                  formatter={(v: number) => [`${v} sotuv`, "WON"]}
                  labelFormatter={(l) => `Sana: ${l}`}
                  contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="won"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#10b981", strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
