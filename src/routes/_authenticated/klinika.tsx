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
import { Textarea } from "@/components/ui/textarea";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Plus, FlaskConical, ScanLine, Pill } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/klinika")({
  component: KlinikaPage,
});

const LAB_STATUS: Record<string, { label: string; class: string }> = {
  ordered: { label: "Buyurtma", class: "bg-blue-50 text-blue-700 border-blue-200" },
  collected: { label: "Namuna olingan", class: "bg-amber-50 text-amber-700 border-amber-200" },
  in_progress: { label: "Jarayonda", class: "bg-purple-50 text-purple-700 border-purple-200" },
  completed: { label: "Tayyor", class: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Bekor", class: "bg-slate-100 text-slate-500 border-slate-200" },
};

const RAD_STATUS: Record<string, { label: string; class: string }> = {
  ordered: { label: "Buyurtma", class: "bg-blue-50 text-blue-700 border-blue-200" },
  scheduled: { label: "Rejalashtirilgan", class: "bg-amber-50 text-amber-700 border-amber-200" },
  in_progress: { label: "Jarayonda", class: "bg-purple-50 text-purple-700 border-purple-200" },
  completed: { label: "Tayyor", class: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Bekor", class: "bg-slate-100 text-slate-500 border-slate-200" },
};

const MODALITY_LABEL: Record<string, string> = {
  xray: "Rentgen",
  ultrasound: "UZI",
  ct: "KT",
  mri: "MRT",
  fluoroscopy: "Fluoroskopiya",
  mammography: "Mammografiya",
  other: "Boshqa",
};

const MED_FORM: Record<string, string> = {
  tablet: "Tabletka",
  capsule: "Kapsula",
  syrup: "Sirop",
  injection: "Ukol",
  cream: "Krem",
  drops: "Tomchi",
  inhaler: "Ingalyator",
  suppository: "Sham",
  other: "Boshqa",
};

const RX_STATUS: Record<string, { label: string; class: string }> = {
  active: { label: "Faol", class: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  dispensed: { label: "Berilgan", class: "bg-blue-50 text-blue-700 border-blue-200" },
  cancelled: { label: "Bekor", class: "bg-slate-100 text-slate-500 border-slate-200" },
  expired: { label: "Muddati o'tgan", class: "bg-red-50 text-red-600 border-red-200" },
};

function useLabOrders() {
  return useQuery({
    queryKey: ["lab-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_orders")
        .select("*, patients(full_name, mrn), doctors(full_name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useRadOrders() {
  return useQuery({
    queryKey: ["rad-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("radiology_orders")
        .select("*, patients(full_name, mrn), doctors(full_name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function usePrescriptions() {
  return useQuery({
    queryKey: ["prescriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prescriptions")
        .select("*, patients(full_name, mrn), doctors(full_name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useLabTests() {
  return useQuery({
    queryKey: ["lab-tests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_tests")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useDoctorsList() {
  return useQuery({
    queryKey: ["doctors-short"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctors")
        .select("id, full_name, specialty")
        .is("deleted_at", null)
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

function usePatientsList() {
  return useQuery({
    queryKey: ["patients-list-short"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, full_name, mrn")
        .is("deleted_at", null)
        .eq("status", "active")
        .order("full_name")
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useMedications() {
  return useQuery({
    queryKey: ["medications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medications")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

function KlinikaPage() {
  const clinicQ = useClinicId();
  const qc = useQueryClient();

  const labOrdersQ = useLabOrders();
  const radOrdersQ = useRadOrders();
  const prescriptionsQ = usePrescriptions();
  const labTestsQ = useLabTests();
  const doctorsQ = useDoctorsList();
  const patientsQ = usePatientsList();
  const medsQ = useMedications();

  const [labDialog, setLabDialog] = useState(false);
  const [radDialog, setRadDialog] = useState(false);
  const [rxDialog, setRxDialog] = useState(false);

  const [labForm, setLabForm] = useState({
    patient_id: "",
    doctor_id: "",
    priority: "normal",
    notes: "",
    tests: [] as string[],
  });

  const [radForm, setRadForm] = useState({
    patient_id: "",
    doctor_id: "",
    modality: "xray",
    body_part: "",
    priority: "normal",
    notes: "",
  });

  const [rxForm, setRxForm] = useState({
    patient_id: "",
    doctor_id: "",
    notes: "",
    items: [{ medication_name: "", dosage: "", frequency: "", duration: "", quantity: "1" }],
  });

  const createLabOrder = useMutation({
    mutationFn: async () => {
      if (!labForm.patient_id) throw new Error("Bemor tanlanishi shart");
      if (!clinicQ.data) throw new Error("Klinika aniqlanmadi");

      const { data: num, error: numErr } = await supabase.rpc("generate_lab_order_number", {
        p_clinic_id: clinicQ.data,
      });
      if (numErr) throw numErr;

      const { data: order, error: orderErr } = await supabase
        .from("lab_orders")
        .insert({
          clinic_id: clinicQ.data,
          patient_id: labForm.patient_id,
          doctor_id: labForm.doctor_id || null,
          order_number: num as string,
          priority: labForm.priority,
          notes: labForm.notes || null,
        })
        .select("id")
        .single();
      if (orderErr) throw orderErr;

      if (labForm.tests.length > 0) {
        const results = labForm.tests.map((testId) => {
          const test = labTestsQ.data?.find((t) => t.id === testId);
          return {
            order_id: order.id,
            test_id: testId,
            test_name: test?.name ?? "Test",
          };
        });
        const { error: resErr } = await supabase.from("lab_results").insert(results);
        if (resErr) throw resErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lab-orders"] });
      setLabDialog(false);
      setLabForm({ patient_id: "", doctor_id: "", priority: "normal", notes: "", tests: [] });
      toast.success("Laboratoriya buyurtmasi yaratildi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createRadOrder = useMutation({
    mutationFn: async () => {
      if (!radForm.patient_id) throw new Error("Bemor tanlanishi shart");
      if (!radForm.body_part.trim()) throw new Error("Organ/qism kiritilishi shart");
      if (!clinicQ.data) throw new Error("Klinika aniqlanmadi");

      const { data: num, error: numErr } = await supabase.rpc("generate_rad_order_number", {
        p_clinic_id: clinicQ.data,
      });
      if (numErr) throw numErr;

      const { error } = await supabase.from("radiology_orders").insert({
        clinic_id: clinicQ.data,
        patient_id: radForm.patient_id,
        doctor_id: radForm.doctor_id || null,
        order_number: num as string,
        modality: radForm.modality,
        body_part: radForm.body_part.trim(),
        priority: radForm.priority,
        notes: radForm.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rad-orders"] });
      setRadDialog(false);
      setRadForm({ patient_id: "", doctor_id: "", modality: "xray", body_part: "", priority: "normal", notes: "" });
      toast.success("Radiologiya buyurtmasi yaratildi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createPrescription = useMutation({
    mutationFn: async () => {
      if (!rxForm.patient_id) throw new Error("Bemor tanlanishi shart");
      if (!rxForm.doctor_id) throw new Error("Shifokor tanlanishi shart");
      if (!clinicQ.data) throw new Error("Klinika aniqlanmadi");

      const validItems = rxForm.items.filter((i) => i.medication_name.trim() && i.dosage.trim());
      if (validItems.length === 0) throw new Error("Kamida bitta dori kiritilishi shart");

      const { data: rx, error: rxErr } = await supabase
        .from("prescriptions")
        .insert({
          clinic_id: clinicQ.data,
          patient_id: rxForm.patient_id,
          doctor_id: rxForm.doctor_id,
          notes: rxForm.notes || null,
        })
        .select("id")
        .single();
      if (rxErr) throw rxErr;

      const items = validItems.map((i) => ({
        prescription_id: rx.id,
        medication_name: i.medication_name.trim(),
        dosage: i.dosage.trim(),
        frequency: i.frequency.trim(),
        duration: i.duration || null,
        quantity: parseInt(i.quantity) || 1,
      }));
      const { error: itemsErr } = await supabase.from("prescription_items").insert(items);
      if (itemsErr) throw itemsErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prescriptions"] });
      setRxDialog(false);
      setRxForm({
        patient_id: "", doctor_id: "", notes: "",
        items: [{ medication_name: "", dosage: "", frequency: "", duration: "", quantity: "1" }],
      });
      toast.success("Retsept yaratildi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateLabStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("lab_orders").update({
        status,
        ...(status === "completed" ? { completed_at: new Date().toISOString() } : {}),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lab-orders"] });
      toast.success("Status yangilandi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateRadStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("radiology_orders").update({
        status,
        ...(status === "completed" ? { completed_at: new Date().toISOString() } : {}),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rad-orders"] });
      toast.success("Status yangilandi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4 max-w-6xl">
      <h1 className="text-2xl font-bold">Klinik modul</h1>

      <Tabs defaultValue="lab">
        <TabsList>
          <TabsTrigger value="lab"><FlaskConical className="h-4 w-4 mr-1" /> Laboratoriya</TabsTrigger>
          <TabsTrigger value="radiology"><ScanLine className="h-4 w-4 mr-1" /> Radiologiya</TabsTrigger>
          <TabsTrigger value="pharmacy"><Pill className="h-4 w-4 mr-1" /> Retseptlar</TabsTrigger>
        </TabsList>

        {/* LABORATORIYA */}
        <TabsContent value="lab" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setLabDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4" /> Yangi buyurtma
            </Button>
          </div>
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Raqam</TableHead>
                    <TableHead>Bemor</TableHead>
                    <TableHead>Shifokor</TableHead>
                    <TableHead>Ustuvorlik</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sana</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(labOrdersQ.data ?? []).map((o) => {
                    const st = LAB_STATUS[o.status] ?? { label: o.status, class: "" };
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-sm">{o.order_number}</TableCell>
                        <TableCell>{(o as any).patients?.full_name ?? "—"}</TableCell>
                        <TableCell className="text-sm text-slate-500">{(o as any).doctors?.full_name ?? "—"}</TableCell>
                        <TableCell>
                          {o.priority === "stat" && <Badge className="bg-red-100 text-red-700 border-red-200">Shoshilinch</Badge>}
                          {o.priority === "urgent" && <Badge className="bg-amber-100 text-amber-700 border-amber-200">Tezkor</Badge>}
                          {o.priority === "normal" && <Badge variant="outline">Oddiy</Badge>}
                        </TableCell>
                        <TableCell><Badge variant="outline" className={st.class}>{st.label}</Badge></TableCell>
                        <TableCell className="text-sm text-slate-500">{new Date(o.ordered_at).toLocaleDateString("uz-UZ")}</TableCell>
                        <TableCell>
                          {o.status !== "completed" && o.status !== "cancelled" && (
                            <Select onValueChange={(v) => updateLabStatus.mutate({ id: o.id, status: v })}>
                              <SelectTrigger className="h-8 w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="collected">Namuna olingan</SelectItem>
                                <SelectItem value="in_progress">Jarayonda</SelectItem>
                                <SelectItem value="completed">Tayyor</SelectItem>
                                <SelectItem value="cancelled">Bekor</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(labOrdersQ.data ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                        Hali buyurtma yo'q
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RADIOLOGIYA */}
        <TabsContent value="radiology" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setRadDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4" /> Yangi buyurtma
            </Button>
          </div>
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Raqam</TableHead>
                    <TableHead>Bemor</TableHead>
                    <TableHead>Turi</TableHead>
                    <TableHead>Organ</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sana</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(radOrdersQ.data ?? []).map((o) => {
                    const st = RAD_STATUS[o.status] ?? { label: o.status, class: "" };
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-sm">{o.order_number}</TableCell>
                        <TableCell>{(o as any).patients?.full_name ?? "—"}</TableCell>
                        <TableCell><Badge variant="outline">{MODALITY_LABEL[o.modality] ?? o.modality}</Badge></TableCell>
                        <TableCell>{o.body_part}</TableCell>
                        <TableCell><Badge variant="outline" className={st.class}>{st.label}</Badge></TableCell>
                        <TableCell className="text-sm text-slate-500">{new Date(o.ordered_at).toLocaleDateString("uz-UZ")}</TableCell>
                        <TableCell>
                          {o.status !== "completed" && o.status !== "cancelled" && (
                            <Select onValueChange={(v) => updateRadStatus.mutate({ id: o.id, status: v })}>
                              <SelectTrigger className="h-8 w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="scheduled">Rejalashtirilgan</SelectItem>
                                <SelectItem value="in_progress">Jarayonda</SelectItem>
                                <SelectItem value="completed">Tayyor</SelectItem>
                                <SelectItem value="cancelled">Bekor</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(radOrdersQ.data ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                        Hali buyurtma yo'q
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RETSEPTLAR */}
        <TabsContent value="pharmacy" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setRxDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4" /> Yangi retsept
            </Button>
          </div>
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bemor</TableHead>
                    <TableHead>Shifokor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sana</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(prescriptionsQ.data ?? []).map((rx) => {
                    const st = RX_STATUS[rx.status] ?? { label: rx.status, class: "" };
                    return (
                      <TableRow key={rx.id}>
                        <TableCell className="font-medium">{(rx as any).patients?.full_name ?? "—"}</TableCell>
                        <TableCell className="text-sm text-slate-500">{(rx as any).doctors?.full_name ?? "—"}</TableCell>
                        <TableCell><Badge variant="outline" className={st.class}>{st.label}</Badge></TableCell>
                        <TableCell className="text-sm text-slate-500">{new Date(rx.prescribed_at).toLocaleDateString("uz-UZ")}</TableCell>
                      </TableRow>
                    );
                  })}
                  {(prescriptionsQ.data ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-slate-400">
                        Hali retsept yo'q
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* LAB BUYURTMA DIALOGI */}
      <Dialog open={labDialog} onOpenChange={setLabDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Laboratoriya buyurtmasi</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div>
              <Label>Bemor *</Label>
              <Select value={labForm.patient_id} onValueChange={(v) => setLabForm({ ...labForm, patient_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Bemorni tanlang" /></SelectTrigger>
                <SelectContent>
                  {(patientsQ.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name} ({p.mrn})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Shifokor</Label>
              <Select value={labForm.doctor_id} onValueChange={(v) => setLabForm({ ...labForm, doctor_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Shifokor" /></SelectTrigger>
                <SelectContent>
                  {(doctorsQ.data ?? []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.full_name} — {d.specialty}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ustuvorlik</Label>
              <Select value={labForm.priority} onValueChange={(v) => setLabForm({ ...labForm, priority: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Oddiy</SelectItem>
                  <SelectItem value="urgent">Tezkor</SelectItem>
                  <SelectItem value="stat">Shoshilinch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Testlar</Label>
              <div className="mt-1 space-y-1 max-h-40 overflow-y-auto border rounded p-2">
                {(labTestsQ.data ?? []).map((t) => (
                  <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={labForm.tests.includes(t.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setLabForm({ ...labForm, tests: [...labForm.tests, t.id] });
                        } else {
                          setLabForm({ ...labForm, tests: labForm.tests.filter((id) => id !== t.id) });
                        }
                      }}
                    />
                    {t.name} {t.code && <span className="text-slate-400">({t.code})</span>}
                  </label>
                ))}
                {(labTestsQ.data ?? []).length === 0 && (
                  <p className="text-sm text-slate-400">Test katalogi bo'sh</p>
                )}
              </div>
            </div>
            <div>
              <Label>Izoh</Label>
              <Input value={labForm.notes} onChange={(e) => setLabForm({ ...labForm, notes: e.target.value })} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLabDialog(false)}>Bekor</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={createLabOrder.isPending} onClick={() => createLabOrder.mutate()}>
              {createLabOrder.isPending ? "Yaratilmoqda..." : "Buyurtma berish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RADIOLOGIYA DIALOGI */}
      <Dialog open={radDialog} onOpenChange={setRadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Radiologiya buyurtmasi</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div>
              <Label>Bemor *</Label>
              <Select value={radForm.patient_id} onValueChange={(v) => setRadForm({ ...radForm, patient_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Bemorni tanlang" /></SelectTrigger>
                <SelectContent>
                  {(patientsQ.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name} ({p.mrn})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Shifokor</Label>
              <Select value={radForm.doctor_id} onValueChange={(v) => setRadForm({ ...radForm, doctor_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Shifokor" /></SelectTrigger>
                <SelectContent>
                  {(doctorsQ.data ?? []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Turi *</Label>
                <Select value={radForm.modality} onValueChange={(v) => setRadForm({ ...radForm, modality: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(MODALITY_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ustuvorlik</Label>
                <Select value={radForm.priority} onValueChange={(v) => setRadForm({ ...radForm, priority: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Oddiy</SelectItem>
                    <SelectItem value="urgent">Tezkor</SelectItem>
                    <SelectItem value="stat">Shoshilinch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Organ/qism *</Label>
              <Input value={radForm.body_part} onChange={(e) => setRadForm({ ...radForm, body_part: e.target.value })} className="mt-1" placeholder="Ko'krak qafasi, bosh..." />
            </div>
            <div>
              <Label>Izoh</Label>
              <Input value={radForm.notes} onChange={(e) => setRadForm({ ...radForm, notes: e.target.value })} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRadDialog(false)}>Bekor</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={createRadOrder.isPending} onClick={() => createRadOrder.mutate()}>
              {createRadOrder.isPending ? "Yaratilmoqda..." : "Buyurtma berish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RETSEPT DIALOGI */}
      <Dialog open={rxDialog} onOpenChange={setRxDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yangi retsept</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Bemor *</Label>
                <Select value={rxForm.patient_id} onValueChange={(v) => setRxForm({ ...rxForm, patient_id: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Bemor" /></SelectTrigger>
                  <SelectContent>
                    {(patientsQ.data ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Shifokor *</Label>
                <Select value={rxForm.doctor_id} onValueChange={(v) => setRxForm({ ...rxForm, doctor_id: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Shifokor" /></SelectTrigger>
                  <SelectContent>
                    {(doctorsQ.data ?? []).map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Dorilar *</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setRxForm({
                      ...rxForm,
                      items: [...rxForm.items, { medication_name: "", dosage: "", frequency: "", duration: "", quantity: "1" }],
                    })
                  }
                >
                  <Plus className="h-3 w-3 mr-1" /> Qo'shish
                </Button>
              </div>
              <div className="space-y-3">
                {rxForm.items.map((item, idx) => (
                  <div key={idx} className="border rounded p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Dori #{idx + 1}</span>
                      {rxForm.items.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-red-500"
                          onClick={() =>
                            setRxForm({ ...rxForm, items: rxForm.items.filter((_, i) => i !== idx) })
                          }
                        >
                          ✕
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Input
                          placeholder="Dori nomi"
                          value={item.medication_name}
                          onChange={(e) => {
                            const items = [...rxForm.items];
                            items[idx] = { ...items[idx], medication_name: e.target.value };
                            setRxForm({ ...rxForm, items });
                          }}
                        />
                      </div>
                      <div>
                        <Input
                          placeholder="Dozasi (masalan: 500mg)"
                          value={item.dosage}
                          onChange={(e) => {
                            const items = [...rxForm.items];
                            items[idx] = { ...items[idx], dosage: e.target.value };
                            setRxForm({ ...rxForm, items });
                          }}
                        />
                      </div>
                      <div>
                        <Input
                          placeholder="Qabul qilish (masalan: kuniga 2 marta)"
                          value={item.frequency}
                          onChange={(e) => {
                            const items = [...rxForm.items];
                            items[idx] = { ...items[idx], frequency: e.target.value };
                            setRxForm({ ...rxForm, items });
                          }}
                        />
                      </div>
                      <div>
                        <Input
                          placeholder="Davomiyligi (masalan: 7 kun)"
                          value={item.duration}
                          onChange={(e) => {
                            const items = [...rxForm.items];
                            items[idx] = { ...items[idx], duration: e.target.value };
                            setRxForm({ ...rxForm, items });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Izoh</Label>
              <Textarea value={rxForm.notes} onChange={(e) => setRxForm({ ...rxForm, notes: e.target.value })} className="mt-1" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRxDialog(false)}>Bekor</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={createPrescription.isPending} onClick={() => createPrescription.mutate()}>
              {createPrescription.isPending ? "Yaratilmoqda..." : "Retsept yozish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
