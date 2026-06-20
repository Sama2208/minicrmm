import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, Legend,
} from "recharts";
import {
  STATUS_LABEL, STATUS_ORDER, STATUS_BADGE, SOURCE_LABEL, SOURCE_LIST, SOURCE_COLOR,
  CONVERSION_STATUS,
  type LeadStatus, type LeadSource,
} from "@/lib/crm";

export const Route = createFileRoute("/_authenticated/hisobotlar")({ component: HisobotlarPage });

type Lead = {
  id: string;
  status: LeadStatus;
  source: LeadSource;
  assigned_to: string | null;
  created_at: string;
};

function HisobotlarPage() {

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const leadsQ = useQuery({
    queryKey: ["leads-report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, status, source, assigned_to, created_at");
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

  const leads = useMemo(() => {
    const list = leadsQ.data ?? [];
    return list.filter((l) => {
      if (dateFrom && new Date(l.created_at) < new Date(dateFrom)) return false;
      if (dateTo && new Date(l.created_at) > new Date(dateTo + "T23:59:59")) return false;
      return true;
    });
  }, [leadsQ.data, dateFrom, dateTo]);

  const total = leads.length;
  const converted = leads.filter((l) => l.status === CONVERSION_STATUS).length;
  const conversion = total ? Math.round((converted / total) * 1000) / 10 : 0;
  const activePipeline = leads.filter(
    (l) => !["yotishga_yozildi", "sifatsiz_lid", "kotarmadi"].includes(l.status)
  ).length;

  const funnelData = STATUS_ORDER.map((s) => ({
    status: STATUS_LABEL[s],
    total: leads.filter((l) => l.status === s).length,
  }));

  const sourceData = SOURCE_LIST.map((s) => {
    const list = leads.filter((l) => l.source === s);
    const conv = list.filter((l) => l.status === CONVERSION_STATUS).length;
    return {
      source: SOURCE_LABEL[s],
      total: list.length,
      converted: conv,
    };
  });

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

  // Daily trend
  const dailyData = useMemo(() => {
    const map = new Map<string, Record<string, number | string>>();
    leads.forEach((l) => {
      const day = l.created_at.slice(0, 10);
      if (!map.has(day)) {
        const row: Record<string, number | string> = { day };
        SOURCE_LIST.forEach((s) => (row[s] = 0));
        map.set(day, row);
      }
      const row = map.get(day)!;
      row[l.source] = (row[l.source] as number) + 1;
    });
    return Array.from(map.values()).sort((a, b) =>
      String(a.day).localeCompare(String(b.day))
    );
  }, [leads]);

  return (
    <div className="space-y-6">
      {/* Date filter */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs">Boshlanish sanasi</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[160px] mt-1" />
        </div>
        <div>
          <Label className="text-xs">Tugash sanasi</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[160px] mt-1" />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Jami lidlar" value={total} color="text-blue-600" />
        <KpiCard title="Yotishga yozilgan" value={converted} color="text-emerald-600" />
        <KpiCard title="Konversiya" value={`${conversion}%`} color="text-violet-600" />
        <KpiCard title="Faol pipeline" value={activePipeline} color="text-amber-600" />
      </div>

      {/* Kanban ustunlari bo'yicha */}
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

      {/* Source */}
      <Card>
        <CardHeader><CardTitle>Manba bo'yicha lidlar</CardTitle></CardHeader>
        <CardContent>
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={sourceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="source" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" name="Jami" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="converted" name="Aylangan" fill="#10b981" radius={[4, 4, 0, 0]} />
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

      {/* Daily trend */}
      <Card>
        <CardHeader><CardTitle>Kunlik trend — manba bo'yicha</CardTitle></CardHeader>
        <CardContent>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                {SOURCE_LIST.map((s) => (
                  <Line key={s} type="monotone" dataKey={s} name={SOURCE_LABEL[s]} stroke={SOURCE_COLOR[s]} strokeWidth={2} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

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
