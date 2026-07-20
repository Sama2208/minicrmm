import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { DollarSign, Eye, MousePointer, TrendingUp, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hisobot")({
  component: HisobotPage,
});

const EDGE_URL = "https://uddkghraacwlflxrpcdq.supabase.co/functions/v1/meta-ads-insights";
const AD_ACCOUNT_ID = "act_3356671387908032";

function today() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

interface CampaignInsight {
  campaign_id: string;
  campaign_name: string;
  spend: number;
  impressions: number;
  clicks: number;
  cpm: number;
  cpc: number;
  ctr?: number;
}

type Period = "Haftalik" | "Oylik" | "Choraklik";

const PERIODS: { label: Period; days: number }[] = [
  { label: "Haftalik", days: 7 },
  { label: "Oylik", days: 30 },
  { label: "Choraklik", days: 90 },
];

function HisobotPage() {
  const [period, setPeriod] = useState<Period>("Oylik");
  const [refreshKey, setRefreshKey] = useState(0);

  const selectedDays = PERIODS.find((p) => p.label === period)?.days ?? 30;
  const since = daysAgo(selectedDays);
  const until = today();

  const { data, isLoading, error } = useQuery({
    queryKey: ["hisobot-ads", since, until, refreshKey],
    queryFn: async () => {
      const res = await fetch(EDGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adAccountId: AD_ACCOUNT_ID, since, until }),
      });
      if (!res.ok) throw new Error("API xatosi: " + res.status);
      const json = await res.json();
      return (json.data ?? []) as CampaignInsight[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const campaigns = data ?? [];

  const kpi = useMemo(() => {
    const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
    const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0);
    const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
    const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    return { totalSpend, totalImpressions, totalClicks, avgCpc };
  }, [campaigns]);

  const chartData = useMemo(() => {
    return [...campaigns]
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 8)
      .map((c) => ({
        name: c.campaign_name.length > 20 ? c.campaign_name.slice(0, 20) + "…" : c.campaign_name,
        spend: c.spend,
      }));
  }, [campaigns]);

  const sortedCampaigns = useMemo(
    () => [...campaigns].sort((a, b) => b.spend - a.spend),
    [campaigns]
  );

  function fmtNum(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Hisobot</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Meta Ads — {since} dan {until} gacha
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={isLoading}
          className="gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Yangilash
        </Button>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1 border-b">
        {PERIODS.map(({ label }) => (
          <button
            key={label}
            onClick={() => setPeriod(label)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              period === label
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-slate-50 border-0 shadow-sm">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <DollarSign className="h-3.5 w-3.5 text-slate-700" />
              <span className="text-xs text-muted-foreground font-medium">JAMI XARAJAT</span>
            </div>
            <div className="text-2xl font-bold text-slate-700">${kpi.totalSpend.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-0 shadow-sm">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Eye className="h-3.5 w-3.5 text-blue-700" />
              <span className="text-xs text-muted-foreground font-medium">IMPRESSIONLAR</span>
            </div>
            <div className="text-2xl font-bold text-blue-700">{fmtNum(kpi.totalImpressions)}</div>
          </CardContent>
        </Card>
        <Card className="bg-violet-50 border-0 shadow-sm">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <MousePointer className="h-3.5 w-3.5 text-violet-700" />
              <span className="text-xs text-muted-foreground font-medium">CLICKLAR</span>
            </div>
            <div className="text-2xl font-bold text-violet-700">{fmtNum(kpi.totalClicks)}</div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-0 shadow-sm">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-700" />
              <span className="text-xs text-muted-foreground font-medium">O'RTACHA CPC</span>
            </div>
            <div className="text-2xl font-bold text-emerald-700">${kpi.avgCpc.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {campaigns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kampaniyalar bo'yicha xarajat</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, "Xarajat"]} />
                  <Bar dataKey="spend" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kampaniyalar</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Yuklanmoqda…</div>
          ) : error ? (
            <div className="py-12 text-center text-sm text-red-600">
              Ma'lumot yuklashda xatolik. Yangilash tugmasini bosing.
            </div>
          ) : campaigns.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Ushbu davr uchun ma'lumot topilmadi.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 text-xs">
                    <TableHead className="pl-4">KAMPANIYA NOMI</TableHead>
                    <TableHead className="text-right">XARAJAT</TableHead>
                    <TableHead className="text-right">IMPRESSIONLAR</TableHead>
                    <TableHead className="text-right">CLICKLAR</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                    <TableHead className="text-right">CPC</TableHead>
                    <TableHead className="text-right pr-4">CPM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCampaigns.map((c) => {
                    const ctr = c.ctr != null
                      ? Number(c.ctr).toFixed(2)
                      : c.impressions > 0
                        ? ((c.clicks / c.impressions) * 100).toFixed(2)
                        : null;
                    return (
                      <TableRow key={c.campaign_id} className="text-sm">
                        <TableCell className="pl-4 font-medium max-w-[280px] truncate" title={c.campaign_name}>
                          {c.campaign_name}
                        </TableCell>
                        <TableCell className="text-right font-medium">${c.spend.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{c.impressions.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{c.clicks.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{ctr != null ? `${ctr}%` : "—"}</TableCell>
                        <TableCell className="text-right">${c.cpc.toFixed(2)}</TableCell>
                        <TableCell className="text-right pr-4">${c.cpm.toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
