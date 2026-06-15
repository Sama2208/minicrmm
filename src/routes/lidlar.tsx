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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import {
  STATUS_LABEL,
  STATUS_BADGE,
  STATUS_ORDER,
  SOURCE_LABEL,
  SOURCE_LIST,
  formatDate,
  type LeadStatus,
  type LeadSource,
} from "@/lib/crm";

export const Route = createFileRoute("/lidlar")({ component: LidlarPage });

type Lead = {
  id: string;
  full_name: string;
  phone: string | null;
  source: LeadSource;
  source_detail: string | null;
  service_interest: string | null;
  status: LeadStatus;
  assigned_to: string | null;
  notes: string | null;
  next_followup_date: string | null;
  last_contact_at: string | null;
  created_at: string;
};

type Operator = { id: string; full_name: string; is_active: boolean };

function LidlarPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [operatorFilter, setOperatorFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const leadsQ = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Lead[];
    },
  });

  const opsQ = useQuery({
    queryKey: ["operators"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operators")
        .select("id, full_name, is_active")
        .order("full_name");
      if (error) throw error;
      return data as Operator[];
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
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (sourceFilter !== "all" && l.source !== sourceFilter) return false;
      if (operatorFilter !== "all" && l.assigned_to !== operatorFilter) return false;
      if (dateFrom && new Date(l.created_at) < new Date(dateFrom)) return false;
      if (dateTo && new Date(l.created_at) > new Date(dateTo + "T23:59:59")) return false;
      if (search) {
        const s = search.toLowerCase();
        if (
          !l.full_name.toLowerCase().includes(s) &&
          !(l.phone ?? "").toLowerCase().includes(s)
        )
          return false;
      }
      return true;
    });
  }, [leadsQ.data, statusFilter, sourceFilter, operatorFilter, dateFrom, dateTo, search]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LeadStatus }) => {
      const { error } = await supabase.from("leads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Status yangilandi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selected = filtered.find((l) => l.id === selectedId) ?? leadsQ.data?.find((l) => l.id === selectedId);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Ism yoki telefon bo'yicha qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha statuslar</SelectItem>
            {STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Manba" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha manbalar</SelectItem>
            {SOURCE_LIST.map((s) => (
              <SelectItem key={s} value={s}>{SOURCE_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={operatorFilter} onValueChange={setOperatorFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Operator" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha operatorlar</SelectItem>
            {(opsQ.data ?? []).map((o) => (
              <SelectItem key={o.id} value={o.id}>{o.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-[150px]"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-[150px]"
        />
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4" /> Yangi lid
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ism</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Manba</TableHead>
              <TableHead>Xizmat</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Operator</TableHead>
              <TableHead>Yaratilgan</TableHead>
              <TableHead>Keyingi aloqa</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leadsQ.isLoading && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Yuklanmoqda...</TableCell></TableRow>
            )}
            {!leadsQ.isLoading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Lidlar topilmadi</TableCell></TableRow>
            )}
            {filtered.map((l) => (
              <TableRow
                key={l.id}
                className="cursor-pointer"
                onClick={() => setSelectedId(l.id)}
              >
                <TableCell className="font-medium">{l.full_name}</TableCell>
                <TableCell>{l.phone ?? "—"}</TableCell>
                <TableCell>{SOURCE_LABEL[l.source]}</TableCell>
                <TableCell>{l.service_interest ?? "—"}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={l.status}
                    onValueChange={(v) => updateStatus.mutate({ id: l.id, status: v as LeadStatus })}
                  >
                    <SelectTrigger className={`h-8 w-[180px] text-xs font-medium ${STATUS_BADGE[l.status]}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_ORDER.map((s) => (
                        <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>{l.assigned_to ? opMap.get(l.assigned_to) ?? "—" : "—"}</TableCell>
                <TableCell>{formatDate(l.created_at)}</TableCell>
                <TableCell>{formatDate(l.next_followup_date)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <LeadDetailSheet
        lead={selected ?? null}
        operators={opsQ.data ?? []}
        onClose={() => setSelectedId(null)}
      />
      <CreateLeadDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        operators={opsQ.data ?? []}
      />
    </div>
  );
}

function LeadDetailSheet({
  lead,
  operators,
  onClose,
}: {
  lead: Lead | null;
  operators: Operator[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [notes, setNotes] = useState("");
  const [followup, setFollowup] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("");

  // Reset on lead change
  useMemoSync(lead?.id, () => {
    setNotes(lead?.notes ?? "");
    setFollowup(lead?.next_followup_date ?? "");
    setAssignedTo(lead?.assigned_to ?? "");
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!lead) return;
      const { error } = await supabase
        .from("leads")
        .update({
          notes: notes || null,
          next_followup_date: followup || null,
          assigned_to: assignedTo || null,
        })
        .eq("id", lead.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
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
                <span className={`inline-block px-2 py-0.5 rounded text-xs ${STATUS_BADGE[lead.status]}`}>
                  {STATUS_LABEL[lead.status]}
                </span>
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 p-4">
              <InfoRow label="Telefon" value={lead.phone ?? "—"} />
              <InfoRow label="Manba" value={SOURCE_LABEL[lead.source]} />
              <InfoRow label="Manba tafsiloti" value={lead.source_detail ?? "—"} />
              <InfoRow label="Qiziqgan xizmat" value={lead.service_interest ?? "—"} />
              <InfoRow label="Yaratilgan" value={formatDate(lead.created_at)} />

              <div>
                <Label>Operator</Label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Operator tanlang" /></SelectTrigger>
                  <SelectContent>
                    {operators.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Keyingi aloqa sanasi</Label>
                <Input type="date" value={followup} onChange={(e) => setFollowup(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Izoh</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={5}
                  className="mt-1"
                  placeholder="Izoh kiriting..."
                />
              </div>
              <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full bg-emerald-600 hover:bg-emerald-700">
                Saqlash
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm border-b pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

// Lightweight effect: run callback when key changes
function useMemoSync(key: unknown, cb: () => void) {
  // useMemo to run sync on key change without React warnings
  useMemo(() => {
    cb();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

function CreateLeadDialog({
  open,
  onOpenChange,
  operators,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  operators: Operator[];
}) {
  const qc = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState<LeadSource>("boshqa");
  const [service, setService] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("");

  const create = useMutation({
    mutationFn: async () => {
      if (!fullName.trim()) throw new Error("Ism kiritilishi shart");
      const { error } = await supabase.from("leads").insert({
        full_name: fullName.trim(),
        phone: phone || null,
        source,
        service_interest: service || null,
        assigned_to: assignedTo || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lid qo'shildi");
      setFullName(""); setPhone(""); setSource("boshqa"); setService(""); setAssignedTo("");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Yangi lid qo'shish</DialogTitle>
          <DialogDescription>Lid ma'lumotlarini kiriting</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Ism *</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Telefon</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" placeholder="+998..." />
          </div>
          <div>
            <Label>Manba</Label>
            <Select value={source} onValueChange={(v) => setSource(v as LeadSource)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOURCE_LIST.map((s) => (
                  <SelectItem key={s} value={s}>{SOURCE_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Qiziqgan xizmat</Label>
            <Input value={service} onChange={(e) => setService(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Operator</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Tanlang (ixtiyoriy)" /></SelectTrigger>
              <SelectContent>
                {operators.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Bekor qilish</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending} className="bg-emerald-600 hover:bg-emerald-700">
            Qo'shish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
