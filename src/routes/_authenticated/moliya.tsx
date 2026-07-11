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
import {
  Receipt,
  Plus,
  CreditCard,
  TrendingDown,
  Search,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/moliya")({
  component: MoliyaPage,
});

const INVOICE_STATUS: Record<string, { label: string; class: string }> = {
  draft: { label: "Qoralama", class: "bg-slate-100 text-slate-600 border-slate-200" },
  pending: { label: "Kutilmoqda", class: "bg-amber-50 text-amber-700 border-amber-200" },
  paid: { label: "To'langan", class: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  partial: { label: "Qisman", class: "bg-blue-50 text-blue-700 border-blue-200" },
  overdue: { label: "Muddati o'tgan", class: "bg-red-50 text-red-700 border-red-200" },
  cancelled: { label: "Bekor", class: "bg-slate-100 text-slate-500 border-slate-200" },
  voided: { label: "Bekor qilingan", class: "bg-red-100 text-red-600 border-red-200" },
};

const PAYMENT_METHOD: Record<string, string> = {
  cash: "Naqd",
  card: "Karta",
  transfer: "O'tkazma",
  insurance: "Sug'urta",
  other: "Boshqa",
};

const EXPENSE_CATEGORY: Record<string, string> = {
  rent: "Ijara",
  salary: "Maosh",
  equipment: "Jihozlar",
  supplies: "Materiallar",
  utilities: "Kommunal",
  marketing: "Marketing",
  maintenance: "Ta'mirlash",
  other: "Boshqa",
};

function useInvoices() {
  return useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, patients(full_name, mrn), doctors(full_name)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useServices() {
  return useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .is("deleted_at", null)
        .eq("is_active", true)
        .order("name");
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

function useExpenses() {
  return useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .is("deleted_at", null)
        .order("expense_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function usePayments() {
  return useQuery({
    queryKey: ["payments-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*, invoices(invoice_number), patients(full_name)")
        .order("paid_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function MoliyaPage() {
  const clinicQ = useClinicId();
  const qc = useQueryClient();

  const invoicesQ = useInvoices();
  const servicesQ = useServices();
  const patientsQ = usePatientsList();
  const expensesQ = useExpenses();
  const paymentsQ = usePayments();

  const [invoiceDialog, setInvoiceDialog] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<string | null>(null);
  const [expenseDialog, setExpenseDialog] = useState(false);
  const [serviceDialog, setServiceDialog] = useState(false);

  const [invForm, setInvForm] = useState({
    patient_id: "",
    notes: "",
    items: [{ description: "", quantity: "1", unit_price: "0", service_id: "" }],
  });

  const [expForm, setExpForm] = useState({
    category: "other",
    description: "",
    amount: "",
    expense_date: new Date().toISOString().slice(0, 10),
    vendor: "",
    notes: "",
  });

  const [svcForm, setSvcForm] = useState({
    name: "",
    code: "",
    category: "consultation",
    price: "",
    duration_min: "",
  });

  const [payForm, setPayForm] = useState({
    amount: "",
    payment_method: "cash",
    reference: "",
    notes: "",
  });

  const createInvoice = useMutation({
    mutationFn: async () => {
      if (!invForm.patient_id) throw new Error("Bemor tanlanishi shart");
      if (!clinicQ.data) throw new Error("Klinika aniqlanmadi");

      const validItems = invForm.items.filter((i) => i.description.trim());
      if (validItems.length === 0) throw new Error("Kamida bitta xizmat kiritilishi shart");

      const { data: invNum, error: numErr } = await supabase.rpc("generate_invoice_number", {
        p_clinic_id: clinicQ.data,
      });
      if (numErr) throw numErr;

      const subtotal = validItems.reduce(
        (sum, i) => sum + (parseFloat(i.unit_price) || 0) * (parseInt(i.quantity) || 1),
        0
      );

      const { data: inv, error: invErr } = await supabase
        .from("invoices")
        .insert({
          clinic_id: clinicQ.data,
          invoice_number: invNum as string,
          patient_id: invForm.patient_id,
          subtotal,
          total: subtotal,
          status: "pending",
          notes: invForm.notes || null,
        })
        .select("id")
        .single();
      if (invErr) throw invErr;

      const items = validItems.map((i) => ({
        invoice_id: inv.id,
        service_id: i.service_id || null,
        description: i.description.trim(),
        quantity: parseInt(i.quantity) || 1,
        unit_price: parseFloat(i.unit_price) || 0,
        total: (parseFloat(i.unit_price) || 0) * (parseInt(i.quantity) || 1),
      }));

      const { error: itemsErr } = await supabase.from("invoice_items").insert(items);
      if (itemsErr) throw itemsErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      setInvoiceDialog(false);
      setInvForm({
        patient_id: "",
        notes: "",
        items: [{ description: "", quantity: "1", unit_price: "0", service_id: "" }],
      });
      toast.success("Faktura yaratildi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createPayment = useMutation({
    mutationFn: async () => {
      if (!paymentDialog || !clinicQ.data) throw new Error("Faktura tanlanmadi");
      if (!payForm.amount || parseFloat(payForm.amount) <= 0) throw new Error("Summa kiritilishi shart");

      const inv = invoicesQ.data?.find((i) => i.id === paymentDialog);
      if (!inv) throw new Error("Faktura topilmadi");

      const { error } = await supabase.from("payments").insert({
        clinic_id: clinicQ.data,
        invoice_id: paymentDialog,
        patient_id: inv.patient_id,
        amount: parseFloat(payForm.amount),
        payment_method: payForm.payment_method,
        reference: payForm.reference || null,
        notes: payForm.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["payments-list"] });
      setPaymentDialog(null);
      setPayForm({ amount: "", payment_method: "cash", reference: "", notes: "" });
      toast.success("To'lov qabul qilindi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createExpense = useMutation({
    mutationFn: async () => {
      if (!expForm.description.trim()) throw new Error("Tavsif kiritilishi shart");
      if (!expForm.amount || parseFloat(expForm.amount) <= 0) throw new Error("Summa kiritilishi shart");
      if (!clinicQ.data) throw new Error("Klinika aniqlanmadi");

      const { error } = await supabase.from("expenses").insert({
        clinic_id: clinicQ.data,
        category: expForm.category,
        description: expForm.description.trim(),
        amount: parseFloat(expForm.amount),
        expense_date: expForm.expense_date,
        vendor: expForm.vendor || null,
        notes: expForm.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      setExpenseDialog(false);
      setExpForm({
        category: "other", description: "", amount: "",
        expense_date: new Date().toISOString().slice(0, 10), vendor: "", notes: "",
      });
      toast.success("Xarajat kiritildi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createService = useMutation({
    mutationFn: async () => {
      if (!svcForm.name.trim()) throw new Error("Nomi kiritilishi shart");
      if (!clinicQ.data) throw new Error("Klinika aniqlanmadi");

      const { error } = await supabase.from("services").insert({
        clinic_id: clinicQ.data,
        name: svcForm.name.trim(),
        code: svcForm.code || null,
        category: svcForm.category,
        price: parseFloat(svcForm.price) || 0,
        duration_min: svcForm.duration_min ? parseInt(svcForm.duration_min) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      setServiceDialog(false);
      setSvcForm({ name: "", code: "", category: "consultation", price: "", duration_min: "" });
      toast.success("Xizmat qo'shildi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addItem = () =>
    setInvForm({
      ...invForm,
      items: [...invForm.items, { description: "", quantity: "1", unit_price: "0", service_id: "" }],
    });

  const removeItem = (idx: number) =>
    setInvForm({
      ...invForm,
      items: invForm.items.filter((_, i) => i !== idx),
    });

  const updateItem = (idx: number, field: string, value: string) => {
    const items = [...invForm.items];
    items[idx] = { ...items[idx], [field]: value };

    if (field === "service_id" && value) {
      const svc = servicesQ.data?.find((s) => s.id === value);
      if (svc) {
        items[idx].description = svc.name;
        items[idx].unit_price = String(svc.price);
      }
    }

    setInvForm({ ...invForm, items });
  };

  const totalIncome = invoicesQ.data
    ?.filter((i) => i.status === "paid")
    .reduce((s, i) => s + Number(i.total), 0) ?? 0;

  const totalExpense = expensesQ.data?.reduce((s, e) => s + Number(e.amount), 0) ?? 0;

  const pendingAmount = invoicesQ.data
    ?.filter((i) => ["pending", "partial", "overdue"].includes(i.status))
    .reduce((s, i) => s + (Number(i.total) - Number(i.paid_amount)), 0) ?? 0;

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Moliya</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Jami daromad</p>
                <p className="text-xl font-bold text-emerald-600">{totalIncome.toLocaleString()} so'm</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Jami xarajat</p>
                <p className="text-xl font-bold text-red-600">{totalExpense.toLocaleString()} so'm</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Receipt className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Kutilayotgan to'lovlar</p>
                <p className="text-xl font-bold text-amber-600">{pendingAmount.toLocaleString()} so'm</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">Fakturalar</TabsTrigger>
          <TabsTrigger value="payments">To'lovlar</TabsTrigger>
          <TabsTrigger value="expenses">Xarajatlar</TabsTrigger>
          <TabsTrigger value="services">Xizmatlar</TabsTrigger>
        </TabsList>

        {/* FAKTURALAR */}
        <TabsContent value="invoices" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setInvoiceDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4" /> Yangi faktura
            </Button>
          </div>
          <Card>
            <CardContent className="pt-4">
              {invoicesQ.isLoading ? (
                <p className="text-slate-500 py-4">Yuklanmoqda...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Raqam</TableHead>
                      <TableHead>Bemor</TableHead>
                      <TableHead>Jami</TableHead>
                      <TableHead>To'langan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sana</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(invoicesQ.data ?? []).map((inv) => {
                      const st = INVOICE_STATUS[inv.status] ?? { label: inv.status, class: "" };
                      return (
                        <TableRow key={inv.id}>
                          <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                          <TableCell>{(inv as any).patients?.full_name ?? "—"}</TableCell>
                          <TableCell className="font-medium">{Number(inv.total).toLocaleString()}</TableCell>
                          <TableCell>{Number(inv.paid_amount).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={st.class}>{st.label}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">
                            {new Date(inv.created_at).toLocaleDateString("uz-UZ")}
                          </TableCell>
                          <TableCell>
                            {["pending", "partial", "overdue"].includes(inv.status) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setPaymentDialog(inv.id);
                                  setPayForm({
                                    amount: String(Number(inv.total) - Number(inv.paid_amount)),
                                    payment_method: "cash",
                                    reference: "",
                                    notes: "",
                                  });
                                }}
                              >
                                <CreditCard className="h-3 w-3 mr-1" /> To'lov
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {(invoicesQ.data ?? []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                          Hali faktura yo'q
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TO'LOVLAR */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>To'lovlar tarixi</CardTitle>
            </CardHeader>
            <CardContent>
              {paymentsQ.isLoading ? (
                <p className="text-slate-500 py-4">Yuklanmoqda...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Faktura</TableHead>
                      <TableHead>Bemor</TableHead>
                      <TableHead>Summa</TableHead>
                      <TableHead>Usul</TableHead>
                      <TableHead>Sana</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(paymentsQ.data ?? []).map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-sm">{(p as any).invoices?.invoice_number ?? "—"}</TableCell>
                        <TableCell>{(p as any).patients?.full_name ?? "—"}</TableCell>
                        <TableCell className="font-medium text-emerald-600">
                          +{Number(p.amount).toLocaleString()} so'm
                        </TableCell>
                        <TableCell>{PAYMENT_METHOD[p.payment_method] ?? p.payment_method}</TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {new Date(p.paid_at).toLocaleDateString("uz-UZ")}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(paymentsQ.data ?? []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                          Hali to'lov yo'q
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* XARAJATLAR */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setExpenseDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4" /> Yangi xarajat
            </Button>
          </div>
          <Card>
            <CardContent className="pt-4">
              {expensesQ.isLoading ? (
                <p className="text-slate-500 py-4">Yuklanmoqda...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tavsif</TableHead>
                      <TableHead>Kategoriya</TableHead>
                      <TableHead>Summa</TableHead>
                      <TableHead>Sana</TableHead>
                      <TableHead>Yetkazuvchi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(expensesQ.data ?? []).map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.description}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{EXPENSE_CATEGORY[e.category] ?? e.category}</Badge>
                        </TableCell>
                        <TableCell className="font-medium text-red-600">
                          -{Number(e.amount).toLocaleString()} so'm
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">{e.expense_date}</TableCell>
                        <TableCell className="text-sm text-slate-500">{e.vendor ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                    {(expensesQ.data ?? []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                          Hali xarajat yo'q
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* XIZMATLAR */}
        <TabsContent value="services" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setServiceDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4" /> Yangi xizmat
            </Button>
          </div>
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nomi</TableHead>
                    <TableHead>Kod</TableHead>
                    <TableHead>Kategoriya</TableHead>
                    <TableHead>Narxi</TableHead>
                    <TableHead>Davomiyligi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(servicesQ.data ?? []).map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="font-mono text-sm">{s.code ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{s.category}</Badge>
                      </TableCell>
                      <TableCell>{Number(s.price).toLocaleString()} so'm</TableCell>
                      <TableCell>{s.duration_min ? `${s.duration_min} min` : "—"}</TableCell>
                    </TableRow>
                  ))}
                  {(servicesQ.data ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                        Hali xizmat yo'q
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* YANGI FAKTURA DIALOGI */}
      <Dialog open={invoiceDialog} onOpenChange={setInvoiceDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yangi faktura</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Bemor *</Label>
              <Select value={invForm.patient_id} onValueChange={(v) => setInvForm({ ...invForm, patient_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Bemorni tanlang" /></SelectTrigger>
                <SelectContent>
                  {(patientsQ.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name} ({p.mrn})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Xizmatlar *</Label>
                <Button size="sm" variant="outline" onClick={addItem}>
                  <Plus className="h-3 w-3 mr-1" /> Qo'shish
                </Button>
              </div>
              <div className="space-y-2">
                {invForm.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      {idx === 0 && <Label className="text-xs">Xizmat</Label>}
                      <Select
                        value={item.service_id}
                        onValueChange={(v) => updateItem(idx, "service_id", v)}
                      >
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Tanlang yoki yozing" /></SelectTrigger>
                        <SelectContent>
                          {(servicesQ.data ?? []).map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name} — {Number(s.price).toLocaleString()}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      {idx === 0 && <Label className="text-xs">Tavsif</Label>}
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(idx, "description", e.target.value)}
                        placeholder="Tavsif"
                        className="mt-1"
                      />
                    </div>
                    <div className="col-span-1">
                      {idx === 0 && <Label className="text-xs">Soni</Label>}
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                        className="mt-1"
                        min="1"
                      />
                    </div>
                    <div className="col-span-2">
                      {idx === 0 && <Label className="text-xs">Narxi</Label>}
                      <Input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => updateItem(idx, "unit_price", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div className="col-span-1">
                      {invForm.items.length > 1 && (
                        <Button size="sm" variant="ghost" onClick={() => removeItem(idx)} className="text-red-500">
                          ✕
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-right mt-2 text-sm font-medium">
                Jami:{" "}
                {invForm.items
                  .reduce((s, i) => s + (parseFloat(i.unit_price) || 0) * (parseInt(i.quantity) || 1), 0)
                  .toLocaleString()}{" "}
                so'm
              </div>
            </div>

            <div>
              <Label>Izoh</Label>
              <Textarea
                value={invForm.notes}
                onChange={(e) => setInvForm({ ...invForm, notes: e.target.value })}
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceDialog(false)}>Bekor</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={createInvoice.isPending} onClick={() => createInvoice.mutate()}>
              {createInvoice.isPending ? "Yaratilmoqda..." : "Yaratish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TO'LOV DIALOGI */}
      <Dialog open={!!paymentDialog} onOpenChange={(o) => !o && setPaymentDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>To'lov qabul qilish</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div>
              <Label>Summa (so'm) *</Label>
              <Input type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>To'lov usuli</Label>
              <Select value={payForm.payment_method} onValueChange={(v) => setPayForm({ ...payForm, payment_method: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Naqd</SelectItem>
                  <SelectItem value="card">Karta</SelectItem>
                  <SelectItem value="transfer">O'tkazma</SelectItem>
                  <SelectItem value="insurance">Sug'urta</SelectItem>
                  <SelectItem value="other">Boshqa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Referens</Label>
              <Input value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} className="mt-1" placeholder="Kvitansiya raqami..." />
            </div>
            <div>
              <Label>Izoh</Label>
              <Input value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialog(null)}>Bekor</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={createPayment.isPending} onClick={() => createPayment.mutate()}>
              {createPayment.isPending ? "Saqlanmoqda..." : "Qabul qilish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* XARAJAT DIALOGI */}
      <Dialog open={expenseDialog} onOpenChange={setExpenseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yangi xarajat</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div>
              <Label>Kategoriya</Label>
              <Select value={expForm.category} onValueChange={(v) => setExpForm({ ...expForm, category: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(EXPENSE_CATEGORY).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tavsif *</Label>
              <Input value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Summa (so'm) *</Label>
                <Input type="number" value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Sana</Label>
                <Input type="date" value={expForm.expense_date} onChange={(e) => setExpForm({ ...expForm, expense_date: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Yetkazuvchi</Label>
              <Input value={expForm.vendor} onChange={(e) => setExpForm({ ...expForm, vendor: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Izoh</Label>
              <Input value={expForm.notes} onChange={(e) => setExpForm({ ...expForm, notes: e.target.value })} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpenseDialog(false)}>Bekor</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={createExpense.isPending} onClick={() => createExpense.mutate()}>
              {createExpense.isPending ? "Saqlanmoqda..." : "Kiritish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* XIZMAT DIALOGI */}
      <Dialog open={serviceDialog} onOpenChange={setServiceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yangi xizmat qo'shish</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div>
              <Label>Nomi *</Label>
              <Input value={svcForm.name} onChange={(e) => setSvcForm({ ...svcForm, name: e.target.value })} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Kod</Label>
                <Input value={svcForm.code} onChange={(e) => setSvcForm({ ...svcForm, code: e.target.value })} className="mt-1" placeholder="SVC-001" />
              </div>
              <div>
                <Label>Kategoriya</Label>
                <Select value={svcForm.category} onValueChange={(v) => setSvcForm({ ...svcForm, category: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consultation">Konsultatsiya</SelectItem>
                    <SelectItem value="procedure">Protsedura</SelectItem>
                    <SelectItem value="lab">Laboratoriya</SelectItem>
                    <SelectItem value="imaging">Tasvir</SelectItem>
                    <SelectItem value="pharmacy">Dorixona</SelectItem>
                    <SelectItem value="surgery">Jarrohlik</SelectItem>
                    <SelectItem value="other">Boshqa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Narxi (so'm)</Label>
                <Input type="number" value={svcForm.price} onChange={(e) => setSvcForm({ ...svcForm, price: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Davomiyligi (min)</Label>
                <Input type="number" value={svcForm.duration_min} onChange={(e) => setSvcForm({ ...svcForm, duration_min: e.target.value })} className="mt-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setServiceDialog(false)}>Bekor</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={createService.isPending} onClick={() => createService.mutate()}>
              {createService.isPending ? "Saqlanmoqda..." : "Qo'shish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
