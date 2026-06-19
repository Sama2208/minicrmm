import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Search, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  STATUS_LABEL, STATUS_BADGE, STATUS_ORDER,
  SOURCE_LABEL, SOURCE_LIST, formatDate,
  CAN_VISIT_LABEL, CAN_VISIT_BADGE,
  type LeadStatus, type LeadSource, type CanVisitClinic,
} from "@/lib/crm";
import { LidlarKanban } from "@/components/lidlar-kanban";


export const Route = createFileRoute("/_authenticated/lidlar")({ component: LidlarPage });

type Lead = {
  id: string;
  full_name: string;
  phone: string | null;
  nomer_asosiy: string | null;
  region: string | null;
  problem_type: string | null;
  can_visit_clinic: CanVisitClinic | null;
  campaign_name: string | null;
  source: LeadSource;
  source_detail: string | null;
  status: LeadStatus;
  assigned_to: string | null;
  notes: string | null;
  appointment_date: string | null;
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [view, setView] = useState<"table" | "kanban">("table");


  const leadsQ = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Lead[];
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

  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("leads").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_d, ids) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success(`${ids.length} ta lid o'chirildi`);
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selected = filtered.find((l) => l.id === selectedId) ?? leadsQ.data?.find((l) => l.id === selectedId);

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-md p-1 w-fit">
        <button
          type="button"
          onClick={() => setView("table")}
          className={`px-3 py-1 text-sm rounded ${view === "table" ? "bg-white shadow text-slate-900" : "text-slate-600"}`}
        >Jadval</button>
        <button
          type="button"
          onClick={() => setView("kanban")}
          className={`px-3 py-1 text-sm rounded ${view === "kanban" ? "bg-white shadow text-slate-900" : "text-slate-600"}`}
        >Kanban</button>
      </div>

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
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
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
          type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          className="w-[150px]"
        />
        <Input
          type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          className="w-[150px]"
        />
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4" /> Yangi lid
        </Button>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
          <span className="text-sm">{selectedIds.size} ta tanlangan</span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setBulkDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" /> Tanlangan lidlarni o'chirish
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden" style={{ display: view === "table" ? undefined : "none" }}>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={filtered.length > 0 && filtered.every((l) => selectedIds.has(l.id))}
                  onCheckedChange={(v) => {
                    if (v) setSelectedIds(new Set(filtered.map((l) => l.id)));
                    else setSelectedIds(new Set());
                  }}
                  aria-label="Hammasini tanlash"
                />
              </TableHead>
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead>Ism</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Raqam 2</TableHead>
              <TableHead>Viloyat</TableHead>
              <TableHead>Muammo tavsifi</TableHead>
              <TableHead>Kela olasizmi?</TableHead>
              <TableHead>Manba</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Operator</TableHead>
              <TableHead>Konsultatsiya sanasi</TableHead>
              <TableHead>Yaratilgan sana</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leadsQ.isLoading && (
              <TableRow><TableCell colSpan={13} className="text-center text-muted-foreground py-8">Yuklanmoqda...</TableCell></TableRow>
            )}
            {!leadsQ.isLoading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={13} className="text-center text-muted-foreground py-8">Lidlar topilmadi</TableCell></TableRow>
            )}
            {filtered.map((l, idx) => (
              <TableRow
                key={l.id}
                className="cursor-pointer"
                data-state={selectedIds.has(l.id) ? "selected" : undefined}
                onClick={() => setSelectedId(l.id)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(l.id)}
                    onCheckedChange={(v) => {
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (v) next.add(l.id); else next.delete(l.id);
                        return next;
                      });
                    }}
                    aria-label="Tanlash"
                  />
                </TableCell>
                <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                <TableCell className="font-medium">{l.full_name}</TableCell>
                <TableCell>{l.phone ?? "—"}</TableCell>
                <TableCell>{l.nomer_asosiy ?? "—"}</TableCell>
                <TableCell>{l.region ?? "—"}</TableCell>
                <TableCell>{l.problem_type ?? "—"}</TableCell>
                <TableCell>{l.can_visit_clinic ? <span className={CAN_VISIT_BADGE[l.can_visit_clinic]}>{CAN_VISIT_LABEL[l.can_visit_clinic]}</span> : "—"}</TableCell>
                <TableCell>{SOURCE_LABEL[l.source]}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={l.status}
                    onValueChange={(v) => updateStatus.mutate({ id: l.id, status: v as LeadStatus })}
                  >
                    <SelectTrigger className={`h-8 w-[200px] text-xs font-medium ${STATUS_BADGE[l.status]}`}>
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
                <TableCell>{formatDate(l.appointment_date)}</TableCell>
                <TableCell>{formatDate(l.created_at)}</TableCell>
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
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tanlangan lidlarni o'chirishni tasdiqlaysizmi?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedIds.size} ta lid o'chiriladi. Bu amalni qaytarib bo'lmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => { e.preventDefault(); bulkDelete.mutate(Array.from(selectedIds)); }}
              disabled={bulkDelete.isPending}
            >
              O'chirish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function LeadDetailSheet({
  lead, operators, onClose,
}: {
  lead: Lead | null;
  operators: Operator[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [notes, setNotes] = useState("");
  const [appointment, setAppointment] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("");

  useMemoSync(lead?.id, () => {
    setNotes(lead?.notes ?? "");
    setAppointment(lead?.appointment_date ?? "");
    setAssignedTo(lead?.assigned_to ?? "");
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!lead) return;
      const { error } = await supabase
        .from("leads")
        .update({
          notes: notes || null,
          appointment_date: appointment || null,
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
              <InfoRow label="Viloyat / Shahar" value={lead.region ?? "—"} />
              <InfoRow label="Muammo tavsifi" value={lead.problem_type ?? "—"} />
              <InfoRow label="Klinikaga kela oladimi?" value={lead.can_visit_clinic ? CAN_VISIT_LABEL[lead.can_visit_clinic] : "—"} />
              <InfoRow label="Manba" value={SOURCE_LABEL[lead.source]} />
              <InfoRow label="Kampaniya" value={lead.campaign_name ?? "—"} />
              <InfoRow label="Yaratilgan" value={formatDate(lead.created_at)} />


              <div>
                <Label>Operator (qayta biriktirish)</Label>
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
                <Label>Konsultatsiya sanasi</Label>
                <Input type="date" value={appointment} onChange={(e) => setAppointment(e.target.value)} className="mt-1" />
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

function useMemoSync(key: unknown, cb: () => void) {
  useMemo(() => {
    cb();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

function CreateLeadDialog({
  open, onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  operators: Operator[];
}) {
  const qc = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [nomerAsosiy, setNomerAsosiy] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState("");
  const [problem, setProblem] = useState("");
  const [canVisit, setCanVisit] = useState<CanVisitClinic | "">("");
  const [source, setSource] = useState<LeadSource>("boshqa");
  const [campaign, setCampaign] = useState("");
  const [notes, setNotes] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      if (!fullName.trim()) throw new Error("Ism kiritilishi shart");
      const { error } = await supabase.from("leads").insert({
        full_name: fullName.trim(),
        nomer_asosiy: nomerAsosiy || null,
        phone: phone || null,
        region: region || null,
        problem_type: problem || null,
        can_visit_clinic: canVisit || null,
        source,
        campaign_name: campaign || null,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lid qo'shildi — operator avtomatik biriktirildi");
      setFullName(""); setNomerAsosiy(""); setPhone(""); setRegion(""); setProblem("");
      setCanVisit(""); setSource("boshqa"); setCampaign(""); setNotes("");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Yangi lid qo'shish</DialogTitle>
          <DialogDescription>
            Operator round-robin orqali avtomatik biriktiriladi.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Ism va familiya *</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Raqam 2</Label>
            <Input value={nomerAsosiy} onChange={(e) => setNomerAsosiy(e.target.value)} className="mt-1" placeholder="+998..." />
          </div>
          <div>
            <Label>Telefon (Instagram/FB ro'yxat raqami)</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" placeholder="+998..." />
          </div>
          <div>
            <Label>Viloyat / Shahar</Label>
            <Input value={region} onChange={(e) => setRegion(e.target.value)} className="mt-1" placeholder="Toshkent, Samarqand..." />
          </div>
          <div>
            <Label>Muammo tavsifi</Label>
            <Textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              rows={3}
              className="mt-1"
              placeholder="Bemor o'z so'zlari bilan tasvirlagani..."
            />
          </div>
          <div>
            <Label>Klinikaga kela oladimi?</Label>
            <RadioGroup
              value={canVisit}
              onValueChange={(v) => setCanVisit(v as CanVisitClinic)}
              className="mt-2 flex gap-4"
            >
              {(Object.keys(CAN_VISIT_LABEL) as CanVisitClinic[]).map((k) => (
                <label key={k} className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value={k} id={`new-cv-${k}`} />
                  <span className="text-sm">{CAN_VISIT_LABEL[k]}</span>
                </label>
              ))}
            </RadioGroup>
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
            <Label>Kampaniya nomi (ixtiyoriy)</Label>
            <Input value={campaign} onChange={(e) => setCampaign(e.target.value)} className="mt-1" placeholder="masalan: insult-mart-2026" />
          </div>
          <div>
            <Label>Izoh (ixtiyoriy)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1" />
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
