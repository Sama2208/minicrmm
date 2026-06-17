import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { STATUS_LABEL, STATUS_ORDER, SOURCE_LABEL, CAN_VISIT_LABEL, CAN_VISIT_BADGE } from "@/lib/crm";

export const Route = createFileRoute("/admin/leads")({
  ssr: false,
  component: () => <AdminLeadsPage />,
});

type Lead = {
  id: string;
  full_name: string;
  phone: string | null;
  nomer_asosiy: string | null;
  status: keyof typeof STATUS_LABEL;
  source: keyof typeof SOURCE_LABEL;
  region: string | null;
  can_visit_clinic: keyof typeof CAN_VISIT_LABEL | null;
  created_at: string;
  assigned_to: string | null;
};

function AdminLeadsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");

  const leadsQ = useQuery({
    queryKey: ["admin-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, full_name, phone, nomer_asosiy, status, source, region, can_visit_clinic, created_at, assigned_to")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Lead[];
    },
  });

  const opsQ = useQuery({
    queryKey: ["admin-ops"],
    queryFn: async () => {
      const { data, error } = await supabase.from("operators").select("id, full_name");
      if (error) throw error;
      return data as { id: string; full_name: string }[];
    },
  });

  const opMap = useMemo(() => {
    const m = new Map<string, string>();
    (opsQ.data ?? []).forEach((o) => m.set(o.id, o.full_name));
    return m;
  }, [opsQ.data]);

  const filtered = useMemo(() => {
    const list = leadsQ.data ?? [];
    return list.filter((l) => {
      if (status !== "all" && l.status !== status) return false;
      if (q) {
        const s = q.toLowerCase();
        if (!l.full_name.toLowerCase().includes(s) &&
            !(l.phone ?? "").includes(q) &&
            !(l.nomer_asosiy ?? "").includes(q)) return false;
      }
      return true;
    });
  }, [leadsQ.data, q, status]);

  return (
    <AdminShell title="Lidlar">
      <div className="flex flex-wrap gap-3 mb-4">
        <Input placeholder="Qidirish (ism yoki tel)..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha statuslar</SelectItem>
            {STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto text-sm text-slate-500 self-center">Jami: {filtered.length}</div>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 text-center font-semibold">№</TableHead>
              <TableHead>Ism</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Raqam 2</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Manba</TableHead>
              <TableHead>Hudud</TableHead>
              <TableHead>Kela olasizmi?</TableHead>
              <TableHead>Operator</TableHead>
              <TableHead>Sana</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leadsQ.isLoading ? (
              <TableRow><TableCell colSpan={10} className="text-center text-slate-500 py-8">Yuklanmoqda...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center text-slate-500 py-8">Lidlar topilmadi</TableCell></TableRow>
            ) : filtered.map((l, idx) => (
              <TableRow key={l.id}>
                <TableCell className="text-center text-slate-600 font-medium">{idx + 1}</TableCell>
                <TableCell className="font-medium">{l.full_name}</TableCell>
                <TableCell>{l.phone ?? "—"}</TableCell>
                <TableCell>{l.nomer_asosiy ?? "—"}</TableCell>
                <TableCell><Badge variant="outline">{STATUS_LABEL[l.status] ?? l.status}</Badge></TableCell>
                <TableCell>{SOURCE_LABEL[l.source] ?? l.source}</TableCell>
                <TableCell>{l.region ?? "—"}</TableCell>
                <TableCell>
                  {l.can_visit_clinic ? (
                    <span className={CAN_VISIT_BADGE[l.can_visit_clinic]}>{CAN_VISIT_LABEL[l.can_visit_clinic]}</span>
                  ) : "—"}
                </TableCell>
                <TableCell>{l.assigned_to ? opMap.get(l.assigned_to) ?? "—" : "—"}</TableCell>
                <TableCell>{new Date(l.created_at).toLocaleDateString("uz-UZ")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AdminShell>
  );
}
