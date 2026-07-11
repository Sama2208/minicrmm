import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClinicId } from "@/lib/clinic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { UserPlus, Search, Phone, Mail, MapPin } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/bemorlar")({
  component: BemorlarPage,
});

const STATUS_LABEL: Record<string, string> = {
  active: "Faol",
  inactive: "Nofaol",
  deceased: "Vafot",
};

const GENDER_LABEL: Record<string, string> = {
  male: "Erkak",
  female: "Ayol",
};

function usePatients(search: string) {
  return useQuery({
    queryKey: ["patients", search],
    queryFn: async () => {
      let q = supabase
        .from("patients")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(100);

      if (search.trim()) {
        q = q.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,mrn.ilike.%${search}%`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

function BemorlarPage() {
  const clinicQ = useClinicId();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const patientsQ = usePatients(search);

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    birth_date: "",
    gender: "",
    email: "",
    address: "",
    region: "",
    blood_type: "",
    allergies: "",
    notes: "",
  });

  const resetForm = () =>
    setForm({
      full_name: "", phone: "", birth_date: "", gender: "",
      email: "", address: "", region: "", blood_type: "", allergies: "", notes: "",
    });

  const createPatient = useMutation({
    mutationFn: async () => {
      if (!form.full_name.trim()) throw new Error("Ism kiritilishi shart");
      if (!clinicQ.data) throw new Error("Klinika aniqlanmadi");

      const { data: mrn, error: mrnErr } = await supabase.rpc("generate_mrn", {
        p_clinic_id: clinicQ.data,
      });
      if (mrnErr) throw mrnErr;

      const { error } = await supabase.from("patients").insert({
        clinic_id: clinicQ.data,
        mrn: mrn as string,
        full_name: form.full_name.trim(),
        phone: form.phone || null,
        birth_date: form.birth_date || null,
        gender: form.gender || null,
        email: form.email || null,
        address: form.address || null,
        region: form.region || null,
        blood_type: form.blood_type || null,
        allergies: form.allergies || null,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      setCreateOpen(false);
      resetForm();
      toast.success("Bemor qo'shildi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selected = patientsQ.data?.find((p) => p.id === selectedId);

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bemorlar</h1>
        <Button
          onClick={() => { resetForm(); setCreateOpen(true); }}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <UserPlus className="h-4 w-4" />
          Yangi bemor
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Ism, telefon yoki MRN bo'yicha qidirish..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bemorlar ro'yxati ({patientsQ.data?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {patientsQ.isLoading ? (
            <p className="text-slate-500 py-4">Yuklanmoqda...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>MRN</TableHead>
                  <TableHead>Ism</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Jinsi</TableHead>
                  <TableHead>Tug'ilgan</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(patientsQ.data ?? []).map((p) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => setSelectedId(p.id)}
                  >
                    <TableCell className="font-mono text-sm">{p.mrn}</TableCell>
                    <TableCell className="font-medium">{p.full_name}</TableCell>
                    <TableCell>{p.phone ?? "—"}</TableCell>
                    <TableCell>{p.gender ? GENDER_LABEL[p.gender] ?? p.gender : "—"}</TableCell>
                    <TableCell>{p.birth_date ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        p.status === "active"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }>
                        {STATUS_LABEL[p.status] ?? p.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {(patientsQ.data ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                      {search ? "Natija topilmadi" : "Hali bemor yo'q"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Yangi bemor dialogi */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Yangi bemor qo'shish</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            <div className="col-span-2">
              <Label>To'liq ism *</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" placeholder="+998..." />
            </div>
            <div>
              <Label>Tug'ilgan sana</Label>
              <Input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Jinsi</Label>
              <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Tanlang" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Erkak</SelectItem>
                  <SelectItem value="female">Ayol</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Qon guruhi</Label>
              <Select value={form.blood_type} onValueChange={(v) => setForm({ ...form, blood_type: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Tanlang" /></SelectTrigger>
                <SelectContent>
                  {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map((bt) => (
                    <SelectItem key={bt} value={bt}>{bt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Hudud</Label>
              <Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className="mt-1" />
            </div>
            <div className="col-span-2">
              <Label>Manzil</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1" />
            </div>
            <div className="col-span-2">
              <Label>Allergiyalar</Label>
              <Input value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} className="mt-1" />
            </div>
            <div className="col-span-2">
              <Label>Izoh</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Bekor</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={createPatient.isPending} onClick={() => createPatient.mutate()}>
              {createPatient.isPending ? "Saqlanmoqda..." : "Qo'shish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bemor profili (Sheet) */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.full_name}</SheetTitle>
                <p className="text-sm text-slate-500 font-mono">{selected.mrn}</p>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {selected.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-slate-400" />
                      {selected.phone}
                    </div>
                  )}
                  {selected.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-slate-400" />
                      {selected.email}
                    </div>
                  )}
                  {selected.region && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      {selected.region}
                    </div>
                  )}
                </div>

                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Jinsi</span>
                    <span>{selected.gender ? GENDER_LABEL[selected.gender] : "—"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Tug'ilgan</span>
                    <span>{selected.birth_date ?? "—"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Qon guruhi</span>
                    <span>{selected.blood_type ?? "—"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Status</span>
                    <Badge variant="outline">{STATUS_LABEL[selected.status] ?? selected.status}</Badge>
                  </div>
                </div>

                {selected.allergies && (
                  <div className="border-t pt-3">
                    <p className="text-sm text-slate-500 mb-1">Allergiyalar</p>
                    <p className="text-sm text-red-600">{selected.allergies}</p>
                  </div>
                )}

                {selected.notes && (
                  <div className="border-t pt-3">
                    <p className="text-sm text-slate-500 mb-1">Izoh</p>
                    <p className="text-sm">{selected.notes}</p>
                  </div>
                )}

                {selected.address && (
                  <div className="border-t pt-3">
                    <p className="text-sm text-slate-500 mb-1">Manzil</p>
                    <p className="text-sm">{selected.address}</p>
                  </div>
                )}

                <div className="border-t pt-3 text-xs text-slate-400">
                  Yaratilgan: {new Date(selected.created_at).toLocaleDateString("uz-UZ")}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
