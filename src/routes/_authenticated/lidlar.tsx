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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Search, Phone } from "lucide-react";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  STATUS_LABEL, STATUS_ORDER,
  SOURCE_LABEL, SOURCE_LIST,
  CAN_VISIT_LABEL,
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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [operatorFilter, setOperatorFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

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

  const todayCallbacks = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return (leadsQ.data ?? []).filter(
      (l) => l.next_followup_date && l.next_followup_date.split("T")[0] === today
    );
  }, [leadsQ.data]);

  const overdueCallbacks = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return (leadsQ.data ?? []).filter(
      (l) => l.next_followup_date && l.next_followup_date.split("T")[0] < today
    );
  }, [leadsQ.data]);

  const filtered = useMemo(() => {
    const list = leadsQ.data ?? [];
    return list.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (sourceFilter !== "all" && l.source !== sourceFilter) return false;
      if (operatorFilter !== "all" && l.assigned_to !== operatorFilter) return false;
      if (dateFrom && new Date(l.created_at) < new Date(dateFrom)) return false;
      if (dateTo && new Date(l.created_at) > new Date(dateTo + "T23:59:59")) return false;
      if (search) {
        const s = search.trim();
        const sLow = s.toLowerCase();
        const isDigits = /^\d+$/.test(s);
        // Strip non-digits for suffix matching
        const digits1 = (l.phone ?? "").replace(/\D/g, "");
        const digits2 = (l.nomer_asosiy ?? "").replace(/\D/g, "");
        const matchesName = l.full_name.toLowerCase().includes(sLow);
        const matchesPhone = isDigits
          ? digits1.endsWith(s) || digits2.endsWith(s)
          : (l.phone ?? "").includes(sLow) || (l.nomer_asosiy ?? "").includes(sLow);
        if (!matchesName && !matchesPhone) return false;
      }
      return true;
    });
  }, [leadsQ.data, statusFilter, sourceFilter, operatorFilter, dateFrom, dateTo, search]);

  return (
    <div className="space-y-4">
      {/* Bugungi callbacklar banneri */}
      {overdueCallbacks.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 flex items-start gap-3">
          <Phone className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
          <div>
            <div className="text-sm font-semibold text-red-700">
              O'tib ketgan qo'ng'iroqlar: {overdueCallbacks.length} ta
            </div>
            <div className="text-xs text-red-500 mt-0.5 line-clamp-1">
              {overdueCallbacks.map((l) => l.full_name).join(", ")}
            </div>
          </div>
        </div>
      )}
      {todayCallbacks.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 flex items-start gap-3">
          <Phone className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <div className="text-sm font-semibold text-amber-700">
              Bugun qayta qo'ng'iroq: {todayCallbacks.length} ta
            </div>
            <div className="text-xs text-amber-600 mt-0.5 line-clamp-1">
              {todayCallbacks.map((l) => l.full_name).join(", ")}
            </div>
          </div>
        </div>
      )}

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
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[150px]" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[150px]" />
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4" /> Yangi lid
        </Button>
      </div>

      {leadsQ.isLoading ? (
        <div className="text-center text-muted-foreground py-8">Yuklanmoqda...</div>
      ) : (
        <LidlarKanban leads={filtered} operators={opsQ.data ?? []} />
      )}

      <CreateLeadDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        operators={opsQ.data ?? []}
      />
    </div>
  );
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
            <Label>Telefon</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" placeholder="+998..." />
          </div>
          <div>
            <Label>Viloyat / Shahar</Label>
            <Input value={region} onChange={(e) => setRegion(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Muammo tavsifi</Label>
            <Textarea value={problem} onChange={(e) => setProblem(e.target.value)} rows={3} className="mt-1" />
          </div>
          <div>
            <Label>Klinikaga kela oladimi?</Label>
            <RadioGroup
              value={canVisit}
              onValueChange={(v) => setCanVisit(v as CanVisitClinic)}
              className="mt-2 flex gap-4"
            >
              {(Object.keys(CAN_VISIT_LABEL) as CanVisitClinic[]).map((k) => (
                <div key={k} className="flex items-center gap-2">
                  <RadioGroupItem value={k} id={`new-cv-${k}`} />
                  <Label htmlFor={`new-cv-${k}`} className="text-sm font-normal cursor-pointer">
                    {CAN_VISIT_LABEL[k]}
                  </Label>
                </div>
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
            <Input value={campaign} onChange={(e) => setCampaign(e.target.value)} className="mt-1" />
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
