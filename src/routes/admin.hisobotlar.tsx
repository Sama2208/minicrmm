import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { STATUS_LABEL, STATUS_ORDER, SOURCE_LABEL, type LeadStatus, type LeadSource } from "@/lib/crm";

export const Route = createFileRoute("/admin/hisobotlar")({
  ssr: false,
  component: () => <AdminHisobotlarPage />,
});

type Lead = { id: string; status: LeadStatus; source: LeadSource; assigned_to: string | null; created_at: string };

function AdminHisobotlarPage() {
  const leadsQ = useQuery({
    queryKey: ["admin-report-leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("id, status, source, assigned_to, created_at");
      if (error) throw error;
      return data as Lead[];
    },
  });

  const stats = useMemo(() => {
    const list = leadsQ.data ?? [];
    const byStatus = STATUS_ORDER.map((s) => ({ name: STATUS_LABEL[s], value: list.filter((l) => l.status === s).length }));
    const bySource: { name: string; value: number }[] = [];
    const sourceMap = new Map<string, number>();
    list.forEach((l) => sourceMap.set(l.source, (sourceMap.get(l.source) ?? 0) + 1));
    sourceMap.forEach((v, k) => bySource.push({ name: SOURCE_LABEL[k as LeadSource] ?? k, value: v }));
    return { total: list.length, byStatus, bySource };
  }, [leadsQ.data]);

  return (
    <AdminShell title="Hisobotlar">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card><CardHeader><CardTitle className="text-sm text-slate-500">Jami lidlar</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{stats.total}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-slate-500">Yangi</CardTitle></CardHeader><CardContent className="text-3xl font-bold text-emerald-600">{stats.byStatus.find((s) => s.name === STATUS_LABEL["yangi"])?.value ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-slate-500">Manbalar</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{stats.bySource.length}</CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Status bo'yicha</CardTitle></CardHeader>
          <CardContent style={{ height: 300 }}>
            <ResponsiveContainer><BarChart data={stats.byStatus}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip />
              <Bar dataKey="value" fill="#10b981" />
            </BarChart></ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Manba bo'yicha</CardTitle></CardHeader>
          <CardContent style={{ height: 300 }}>
            <ResponsiveContainer><BarChart data={stats.bySource}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart></ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
