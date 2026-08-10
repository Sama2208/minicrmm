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

      <OperatorControlSection />

    </div>
  );
}

// ─── Operatorlar nazorati ──────────────────────────────────────────────────────

type OperatorControl = {
  operator_id: string;
  operator: string;
  jami_lid: number;
  javobsiz: number;
  eng_uzoq_daq: number;
  bugun_harakat: number;
  ort_javob_daq: number;
  tez_javob_foiz: number;
  yotdi: number;
};

type WaitingLead = {
  id: string;
  full_name: string;
  phone: string | null;
  operator: string | null;
  kutish_daq: number;
  facebook_page_name: string | null;
};

type DailySla = {
  kun: string;
  kelgan: number;
  tez_javob: number;
  javobsiz: number;
};

function durText(min: number): string {
  if (min < 60) return `${min} daq`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} soat ${min % 60} daq`;
  return `${Math.floor(h / 24)} kun ${h % 24} soat`;
}

function OperatorControlSection() {
  const ctrlQ = useQuery({
    queryKey: ["v_operator_control"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_operator_control" as never)
        .select("*");
      if (error) throw error;
      return (data ?? []) as unknown as OperatorControl[];
    },
    refetchInterval: 60000,
  });

  const waitQ = useQuery({
    queryKey: ["v_waiting_leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_waiting_leads" as never)
        .select("*")
        .order("kutish_daq", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as unknown as WaitingLead[];
    },
    refetchInterval: 60000,
  });

  const slaQ = useQuery({
    queryKey: ["v_daily_sla"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_daily_sla" as never)
        .select("*")
        .order("kun", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as DailySla[];
    },
  });

  const rows = [...(ctrlQ.data ?? [])].sort((a, b) =>
    a.operator.localeCompare(b.operator, undefined, { numeric: true }),
  );
  const waiting = waitQ.data ?? [];
  const daily = (slaQ.data ?? []).map((d) => ({
    ...d,
    kunLabel: d.kun.slice(5),
    kechikkan: d.kelgan - d.tez_javob,
  }));

  const jamiJavobsiz = rows.reduce((a, r) => a + Number(r.javobsiz || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-700">
          👁 Operatorlar nazorati
        </h2>
        <span className="text-xs text-slate-400">
          Yakshanba hisobga olinmaydi · har daqiqada yangilanadi
        </span>
      </div>

      {jamiJavobsiz > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <div className="text-sm font-semibold text-red-700">
            Jami {jamiJavobsiz} ta lidga hali aloqa qilinmagan
          </div>
        </div>
      )}

      {/* 1-blok: svetofor */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Bugungi holat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {rows.map((r) => {
              const kritik = Number(r.javobsiz) >= 5 || Number(r.eng_uzoq_daq) >= 120;
              const ogoh = Number(r.javobsiz) > 0;
              const dot = kritik ? "bg-red-500" : ogoh ? "bg-amber-500" : "bg-emerald-500";
              const bg = kritik ? "bg-red-50 border-red-200" : ogoh ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200";
              return (
                <div
                  key={r.operator_id}
                  className={`flex flex-wrap items-center gap-x-6 gap-y-1 border rounded-lg px-3 py-2.5 ${bg}`}
                >
                  <div className="flex items-center gap-2 min-w-[110px]">
                    <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                    <span className="text-sm font-semibold text-slate-800">
                      Operator {r.operator}
                    </span>
                  </div>
                  <div className="text-xs">
                    <span className="text-slate-500">Javobsiz: </span>
                    <span className={`font-bold ${Number(r.javobsiz) > 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {r.javobsiz}
                    </span>
                  </div>
                  <div className="text-xs">
                    <span className="text-slate-500">Eng uzoq: </span>
                    <span className="font-semibold text-slate-700">
                      {Number(r.eng_uzoq_daq) > 0 ? durText(Number(r.eng_uzoq_daq)) : "—"}
                    </span>
                  </div>
                  <div className="text-xs">
                    <span className="text-slate-500">Bugun harakat: </span>
                    <span className={`font-bold ${Number(r.bugun_harakat) === 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {Number(r.bugun_harakat) === 0 ? "0 ❌" : `${r.bugun_harakat} ✅`}
                    </span>
                  </div>
                  <div className="text-xs">
                    <span className="text-slate-500">Jami lid: </span>
                    <span className="font-semibold text-slate-700">{r.jami_lid}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 2-blok: javob tezligi */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Javob tezligi</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Operator</TableHead>
                <TableHead className="text-right">O'rtacha javob</TableHead>
                <TableHead className="text-right">10 daq ichida</TableHead>
                <TableHead className="text-right">Yotdi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.operator_id}>
                  <TableCell className="font-medium">Operator {r.operator}</TableCell>
                  <TableCell className="text-right">
                    {Number(r.ort_javob_daq) > 0 ? durText(Number(r.ort_javob_daq)) : "—"}
                  </TableCell>
                  <TableCell className={`text-right font-semibold ${Number(r.tez_javob_foiz) >= 50 ? "text-emerald-600" : "text-red-500"}`}>
                    {r.tez_javob_foiz}%
                  </TableCell>
                  <TableCell className="text-right">{r.yotdi}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 3-blok: eng uzoq kutayotganlar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">
            Eng uzoq kutayotgan lidlar
            {waiting.length > 0 && (
              <span className="ml-2 text-xs font-normal text-red-500">
                {waiting.length} ta ko'rsatilmoqda
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {waiting.length === 0 ? (
            <div className="text-sm text-emerald-600 py-6 text-center">
              ✅ Barcha lidlarga aloqa qilingan
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ism</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead className="text-right">Kutmoqda</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waiting.map((w) => (
                  <TableRow key={w.id} className={w.kutish_daq >= 120 ? "bg-red-50" : w.kutish_daq >= 20 ? "bg-amber-50" : ""}>
                    <TableCell className="font-medium">{w.full_name}</TableCell>
                    <TableCell className="text-slate-600 text-sm">{w.phone ?? "—"}</TableCell>
                    <TableCell className="text-sm">{w.operator ? `Operator ${w.operator}` : "—"}</TableCell>
                    <TableCell className={`text-right font-bold ${w.kutish_daq >= 120 ? "text-red-600" : "text-amber-600"}`}>
                      {durText(w.kutish_daq)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 4-blok: 14 kunlik grafik */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Oxirgi 14 kun — javob tezligi</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="kunLabel" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="tez_javob" name="10 daq ichida javob" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="kechikkan" name="Kechikkan" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
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
