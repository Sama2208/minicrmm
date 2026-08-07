import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  STATUS_BADGE,
  CONVERSION_STATUS,
  type LeadStatus,
  type LeadSource,
} from "@/lib/crm";

// Ads Manager timezone: America/Los_Angeles (GMT-07:00 yozda, GMT-08:00 qishda)
const toAdsDate = (utcStr: string): string =>
  new Date(utcStr).toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });

export const Route = createFileRoute("/_authenticated/hisobotlar")({ component: HisobotlarPage });

type Lead = {
  id: string;
  full_name: string;
  status: LeadStatus;
  source: LeadSource;
  assigned_to: string | null;
  next_followup_date: string | null;
  created_at: string;
  facebook_page_id: string | null;
  facebook_page_name: string | null;
};

function HisobotlarPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [operatorFilter, setOperatorFilter] = useState("all");
  const [facebookPageFilter, setFacebookPageFilter] = useState("all");

  const leadsQ = useQuery({
    queryKey: ["leads-report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, full_name, status, source, assigned_to, next_followup_date, created_at, facebook_page_id, facebook_page_name");
      if (error) throw error;
      return data as Lead[];
    },
  });

  const opsQ = useQuery({
    queryKey: ["operators"],
    queryFn: async () => {
      const { data, error } = await supabase.from("operators").select("id, full_name");
      if (error) throw error;
      return data as { id: string; full_name: string }[];
    },
  });

  const fbPagesQ = useQuery({
    queryKey: ["fb-pages-list-report"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("facebook_page_id, facebook_page_name")
        .not("facebook_page_id", "is", null);
      const seen = new Set<string>();
      return (data ?? []).filter((r) => {
        if (!r.facebook_page_id || seen.has(r.facebook_page_id)) return false;
        seen.add(r.facebook_page_id);
        return true;
      });
    },
  });

  const leads = useMemo(() => {
    const list = leadsQ.data ?? [];
    return list.filter((l) => {
      if (dateFrom && toAdsDate(l.created_at) < dateFrom) return false;
      if (dateTo && toAdsDate(l.created_at) > dateTo) return false;
      if (facebookPageFilter !== "all" && l.facebook_page_id !== facebookPageFilter) return false;
      return true;
    });
  }, [leadsQ.data, dateFrom, dateTo, facebookPageFilter]);

  const todayCallbacks = useMemo(() => {
    if (operatorFilter === "all") return [];
    const today = new Date().toISOString().split("T")[0];
    return (leadsQ.data ?? []).filter(
      (l) =>
        l.next_followup_date &&
        l.next_followup_date.split("T")[0] === today &&
        l.assigned_to === operatorFilter,
    );
  }, [leadsQ.data, operatorFilter]);

  const overdueCallbacks = useMemo(() => {
    if (operatorFilter === "all") return [];
    const today = new Date().toISOString().split("T")[0];
    return (leadsQ.data ?? []).filter(
      (l) =>
        l.next_followup_date &&
        l.next_followup_date.split("T")[0] < today &&
        l.assigned_to === operatorFilter,
    );
  }, [leadsQ.data, operatorFilter]);

  const total = leads.length;
  const converted = leads.filter((l) => l.status === CONVERSION_STATUS).length;
  const conversion = total ? Math.round((converted / total) * 1000) / 10 : 0;
  const activePipeline = leads.filter(
    (l) => !["yotishga_yozildi", "sifatsiz", "bekor_qilindi", "qayta_qongiroq_6_sifatsiz"].includes(l.status),
  ).length;

  const funnelData = STATUS_ORDER.map((s) => ({
    status: STATUS_LABEL[s],
    total: leads.filter((l) => l.status === s).length,
  }));


  const operatorData = (opsQ.data ?? []).map((o) => {
    const list = leads.filter((l) => l.assigned_to === o.id);
    const conv = list.filter((l) => l.status === CONVERSION_STATUS).length;
    return {
      name: o.full_name,
      total: list.length,
      converted: conv,
      rate: list.length ? Math.round((conv / list.length) * 1000) / 10 : 0,
    };
  });
  const maxRate = Math.max(0, ...operatorData.map((o) => o.rate));


  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs">Boshlanish sanasi</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[160px] mt-1" />
        </div>
        <div>
          <Label className="text-xs">Tugash sanasi</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[160px] mt-1" />
        </div>
        <div>
          <Label className="text-xs">Operator</Label>
          <Select value={operatorFilter} onValueChange={setOperatorFilter}>
            <SelectTrigger className="w-[180px] mt-1">
              <SelectValue placeholder="Operator" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barcha operatorlar</SelectItem>
              {(opsQ.data ?? []).map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(fbPagesQ.data ?? []).length > 1 && (
          <div>
            <Label className="text-xs">Facebook sahifa</Label>
            <Select value={facebookPageFilter} onValueChange={setFacebookPageFilter}>
              <SelectTrigger className="w-[200px] mt-1">
                <SelectValue placeholder="Facebook sahifa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha sahifalar</SelectItem>
                {(fbPagesQ.data ?? []).map((p) => (
                  <SelectItem key={p.facebook_page_id!} value={p.facebook_page_id!}>
                    {p.facebook_page_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {overdueCallbacks.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 flex items-start gap-3">
          <Phone className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
          <div>
            <div className="text-sm font-semibold text-red-700">O'tib ketgan qo'ng'iroqlar: {overdueCallbacks.length} ta</div>
            <div className="text-xs text-red-500 mt-0.5 line-clamp-1">{overdueCallbacks.map((l) => l.full_name).join(", ")}</div>
          </div>
        </div>
      )}
      {todayCallbacks.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 flex items-start gap-3">
          <Phone className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <div className="text-sm font-semibold text-amber-700">Bugun qayta qo'ng'iroq: {todayCallbacks.length} ta</div>
            <div className="text-xs text-amber-600 mt-0.5 line-clamp-1">{todayCallbacks.map((l) => l.full_name).join(", ")}</div>
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Jami lidlar" value={total} color="text-blue-600" />
        <KpiCard title="Yotishga yozilgan" value={converted} color="text-emerald-600" />
        <KpiCard title="Konversiya" value={`${conversion}%`} color="text-violet-600" />
        <KpiCard title="Faol pipeline" value={activePipeline} color="text-amber-600" />
      </div>

      {/* Kanban statuslar */}
      <div>
        <h2 className="text-base font-semibold text-slate-700 mb-3">Kanban ustunlari bo'yicha</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STATUS_ORDER.map((s) => {
            const count = leads.filter((l) => l.status === s).length;
            const pct = total ? Math.round((count / total) * 100) : 0;
            return (
              <div key={s} className={`rounded-lg p-4 ${STATUS_BADGE[s]}`}>
                <div className="text-xs font-medium mb-1">{STATUS_LABEL[s]}</div>
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-xs opacity-60 mt-0.5">{pct}% jami</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Funnel */}
      <Card>
        <CardHeader><CardTitle>Voronka — statuslar bo'yicha</CardTitle></CardHeader>
        <CardContent>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={funnelData} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="status" width={140} />
                <Tooltip />
                <Bar dataKey="total" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>




      {/* Operators */}
      <Card>
        <CardHeader><CardTitle>Operatorlar samaradorligi</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Operator</TableHead>
                <TableHead className="text-right">Jami lidlar</TableHead>
                <TableHead className="text-right">Aylangan</TableHead>
                <TableHead className="text-right">Konversiya %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operatorData.map((o) => (
                <TableRow key={o.name} className={o.rate === maxRate && maxRate > 0 ? "bg-emerald-50" : ""}>
                  <TableCell className="font-medium">
                    {o.name}
                    {o.rate === maxRate && maxRate > 0 && (
                      <span className="ml-2 text-xs bg-emerald-600 text-white px-1.5 py-0.5 rounded">Top</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{o.total}</TableCell>
                  <TableCell className="text-right">{o.converted}</TableCell>
                  <TableCell className="text-right font-semibold">{o.rate}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  );
}


// ─── KpiCard ──────────────────────────────────────────────────────────────────

function KpiCard({ title, value, color }: { title: string; value: number | string; color: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${color}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
