import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import { toast } from "sonner";
import {
  STATUS_LABEL,
  STATUS_BADGE,
  STATUS_ORDER,
  SOURCE_LABEL,
  formatDate,
  type LeadStatus,
  type LeadSource,
} from "@/lib/crm";

export const Route = createFileRoute("/_authenticated/mening-lidlarim")({
  component: MeningLidlarimPage,
});

type Lead = {
  id: string;
  full_name: string;
  phone: string | null;
  region: string | null;
  problem_type: string | null;
  source: LeadSource;
  source_detail: string | null;
  status: LeadStatus;
  notes: string | null;
  appointment_date: string | null;
  created_at: string;
};

function MeningLidlarimPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const leadsQ = useQuery({
    queryKey: ["my-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Lead[];
    },
  });

  const filtered = useMemo(() => {
    return (leadsQ.data ?? []).filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (search) {
        const s = search.trim();
        const sLow = s.toLowerCase();
        const isDigits = /^\d+$/.test(s);
        const digits1 = (l.phone ?? "").replace(/\D/g, "");
        const matchesName = l.full_name.toLowerCase().includes(sLow);
        const matchesPhone = isDigits ? digits1.endsWith(s) : (l.phone ?? "").includes(sLow);
        if (!matchesName && !matchesPhone) return false;
      }
      return true;
    });
  }, [leadsQ.data, statusFilter, search]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LeadStatus }) => {
      const { error } = await supabase.from("leads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-leads"] });
      toast.success("Status yangilandi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selected =
    filtered.find((l) => l.id === selectedId) ?? leadsQ.data?.find((l) => l.id === selectedId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Ism, telefon yoki oxirgi 2-4 raqam..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha statuslar</SelectItem>
            {STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ism</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Viloyat</TableHead>
              <TableHead>Muammo tavsifi</TableHead>
              <TableHead>Manba</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Konsultatsiya</TableHead>
              <TableHead>Yaratilgan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leadsQ.isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Yuklanmoqda...
                </TableCell>
              </TableRow>
            )}
            {!leadsQ.isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Sizga biriktirilgan lidlar yo'q
                </TableCell>
              </TableRow>
            )}
            {filtered.map((l) => (
              <TableRow key={l.id} className="cursor-pointer" onClick={() => setSelectedId(l.id)}>
                <TableCell className="font-medium">{l.full_name}</TableCell>
                <TableCell>{l.phone ?? "—"}</TableCell>
                <TableCell>{l.region ?? "—"}</TableCell>
                <TableCell>{l.problem_type ?? "—"}</TableCell>
                <TableCell>{SOURCE_LABEL[l.source]}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={l.status}
                    onValueChange={(v) =>
                      updateStatus.mutate({ id: l.id, status: v as LeadStatus })
                    }
                  >
                    <SelectTrigger
                      className={`h-8 w-[200px] text-xs font-medium ${STATUS_BADGE[l.status]}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_ORDER.map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>{formatDate(l.appointment_date)}</TableCell>
                <TableCell>{formatDate(l.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <DetailSheet lead={selected ?? null} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function DetailSheet({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [notes, setNotes] = useState("");
  const [appt, setAppt] = useState("");

  useMemo(() => {
    setNotes(lead?.notes ?? "");
    setAppt(lead?.appointment_date ?? "");
  }, [lead?.id]); // eslint-disable-line

  const save = useMutation({
    mutationFn: async () => {
      if (!lead) return;
      const { error } = await supabase
        .from("leads")
        .update({ notes: notes || null, appointment_date: appt || null })
        .eq("id", lead.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-leads"] });
      toast.success("Saqlandi");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Sheet open={!!lead} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {lead && (
          <>
            <SheetHeader>
              <SheetTitle>{lead.full_name}</SheetTitle>
              <SheetDescription>
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs ${STATUS_BADGE[lead.status]}`}
                >
                  {STATUS_LABEL[lead.status]}
                </span>
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 p-4">
              <Row label="Telefon" value={lead.phone ?? "—"} />
              <Row label="Viloyat" value={lead.region ?? "—"} />
              <Row label="Muammo tavsifi" value={lead.problem_type ?? "—"} />
              <Row label="Manba" value={SOURCE_LABEL[lead.source]} />
              <Row label="Yaratilgan" value={formatDate(lead.created_at)} />
              <div>
                <Label>Konsultatsiya sanasi</Label>
                <Input
                  type="date"
                  value={appt}
                  onChange={(e) => setAppt(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Izoh</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={5}
                  className="mt-1"
                />
              </div>
              <Button
                onClick={() => save.mutate()}
                disabled={save.isPending}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                Saqlash
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm border-b pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
