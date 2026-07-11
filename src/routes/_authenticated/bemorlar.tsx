import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useClinicId } from "@/lib/clinic";
import { normalizeUzPhone } from "@/lib/phone";

export const Route = createFileRoute("/_authenticated/bemorlar")({
  component: BemorlarPage,
});

type Patient = {
  id: string;
  mrn: string;
  full_name: string;
  phone: string | null;
  region: string | null;
  status: string;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  active: "Faol",
  inactive: "Nofaol",
  archived: "Arxivda",
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive: "bg-slate-100 text-slate-600 border-slate-200",
  archived: "bg-amber-50 text-amber-700 border-amber-200",
};

function generateMrn() {
  return "P" + Date.now().toString(36).toUpperCase();
}

function BemorlarPage() {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const patientsQ = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, mrn, full_name, phone, region, status, created_at")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Patient[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = patientsQ.data ?? [];
    if (!q) return list;
    return list.filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        p.mrn.toLowerCase().includes(q) ||
        (p.phone ?? "").toLowerCase().includes(q) ||
        (p.region ?? "").toLowerCase().includes(q),
    );
  }, [patientsQ.data, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Ism, MRN, telefon, hudud..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Yangi bemor
        </Button>
      </div>

      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">MRN</th>
                <th className="text-left px-4 py-3 font-medium">F.I.O.</th>
                <th className="text-left px-4 py-3 font-medium">Telefon</th>
                <th className="text-left px-4 py-3 font-medium">Hudud</th>
                <th className="text-left px-4 py-3 font-medium">Holat</th>
              </tr>
            </thead>
            <tbody>
              {patientsQ.isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Yuklanmoqda...
                  </td>
                </tr>
              )}
              {!patientsQ.isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Bemorlar yo'q
                  </td>
                </tr>
              )}
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="border-t hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {p.mrn}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <Link
                      to="/bemorlar/$id"
                      params={{ id: p.id }}
                      className="text-emerald-700 hover:underline"
                    >
                      {p.full_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{p.region ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${
                        STATUS_BADGE[p.status] ?? STATUS_BADGE.active
                      }`}
                    >
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CreatePatientDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function CreatePatientDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const clinicIdQ = useClinicId();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState("");
  const [notes, setNotes] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      if (!clinicIdQ.data) throw new Error("Klinika aniqlanmadi");
      const normPhone = phone.trim() ? normalizeUzPhone(phone) : null;
      if (phone.trim() && !normPhone) throw new Error("Telefon raqami noto'g'ri");
      const { data, error } = await supabase
        .from("patients")
        .insert({
          clinic_id: clinicIdQ.data,
          mrn: generateMrn(),
          full_name: fullName.trim(),
          phone: normPhone,
          region: region.trim(),
          notes: notes.trim() || null,
          status: "active",
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Bemor qo'shildi");
      qc.invalidateQueries({ queryKey: ["patients"] });
      setFullName("");
      setPhone("");
      setRegion("");
      setNotes("");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSubmit =
    fullName.trim().length > 0 && phone.trim().length > 0 && region.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Yangi bemor</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>F.I.O. *</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label>Telefon *</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+998 90 123 45 67"
            />
          </div>
          <div>
            <Label>Hudud *</Label>
            <Input
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="Toshkent"
            />
          </div>
          <div>
            <Label>Izoh</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Bekor qilish
          </Button>
          <Button
            disabled={!canSubmit || create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? "Saqlanmoqda..." : "Saqlash"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
