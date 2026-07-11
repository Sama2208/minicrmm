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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { UserPlus, Search, Phone, Mail, Clock, Stethoscope, CalendarOff } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/shifokorlar")({
  component: ShifokorlarPage,
});

const SPECIALTIES = [
  "Terapevt",
  "Kardiolog",
  "Nevropatolog",
  "Ortoped",
  "Okulist",
  "LOR",
  "Dermatolog",
  "Urolog",
  "Ginekolog",
  "Pediatr",
  "Stomatolog",
  "Xirurg",
  "Endokrinolog",
  "Gastroenterolog",
  "Pulmonolog",
  "Anesteziolog",
  "Radiolog",
  "Laborant",
  "Boshqa",
];

const DAY_NAMES: Record<number, string> = {
  0: "Yakshanba",
  1: "Dushanba",
  2: "Seshanba",
  3: "Chorshanba",
  4: "Payshanba",
  5: "Juma",
  6: "Shanba",
};

const TIME_OFF_REASON: Record<string, string> = {
  vacation: "Ta'til",
  sick: "Kasallik",
  conference: "Konferensiya",
  personal: "Shaxsiy",
  other: "Boshqa",
};

const TIME_OFF_STATUS: Record<string, string> = {
  pending: "Kutilmoqda",
  approved: "Tasdiqlangan",
  rejected: "Rad etilgan",
};

function useDoctors(search: string) {
  return useQuery({
    queryKey: ["doctors", search],
    queryFn: async () => {
      let q = supabase
        .from("doctors")
        .select("*")
        .is("deleted_at", null)
        .eq("is_active", true)
        .order("full_name");

      if (search.trim()) {
        q = q.or(`full_name.ilike.%${search}%,specialty.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useDoctorSchedules(doctorId: string | null) {
  return useQuery({
    queryKey: ["doctor-schedules", doctorId],
    enabled: !!doctorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctor_schedules")
        .select("*")
        .eq("doctor_id", doctorId!)
        .eq("is_active", true)
        .order("day_of_week")
        .order("start_time");
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useDoctorTimeOff(doctorId: string | null) {
  return useQuery({
    queryKey: ["doctor-time-off", doctorId],
    enabled: !!doctorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctor_time_off")
        .select("*")
        .eq("doctor_id", doctorId!)
        .gte("end_date", new Date().toISOString().slice(0, 10))
        .order("start_date");
      if (error) throw error;
      return data ?? [];
    },
  });
}

function ShifokorlarPage() {
  const clinicQ = useClinicId();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scheduleDialog, setScheduleDialog] = useState(false);
  const [timeOffDialog, setTimeOffDialog] = useState(false);

  const doctorsQ = useDoctors(search);
  const selected = doctorsQ.data?.find((d) => d.id === selectedId) ?? null;
  const schedulesQ = useDoctorSchedules(selectedId);
  const timeOffQ = useDoctorTimeOff(selectedId);

  const [form, setForm] = useState({
    full_name: "",
    specialty: "",
    license_number: "",
    phone: "",
    email: "",
    bio: "",
    consultation_duration_min: "30",
    consultation_fee: "0",
  });

  const resetForm = () =>
    setForm({
      full_name: "", specialty: "", license_number: "", phone: "",
      email: "", bio: "", consultation_duration_min: "30", consultation_fee: "0",
    });

  const [schedForm, setSchedForm] = useState({
    day_of_week: "",
    start_time: "09:00",
    end_time: "17:00",
  });

  const [timeOffForm, setTimeOffForm] = useState({
    start_date: "",
    end_date: "",
    reason: "vacation",
    notes: "",
  });

  const createDoctor = useMutation({
    mutationFn: async () => {
      if (!form.full_name.trim()) throw new Error("Ism kiritilishi shart");
      if (!form.specialty) throw new Error("Mutaxassislik tanlanishi shart");
      if (!clinicQ.data) throw new Error("Klinika aniqlanmadi");

      const { error } = await supabase.from("doctors").insert({
        clinic_id: clinicQ.data,
        full_name: form.full_name.trim(),
        specialty: form.specialty,
        license_number: form.license_number || null,
        phone: form.phone || null,
        email: form.email || null,
        bio: form.bio || null,
        consultation_duration_min: parseInt(form.consultation_duration_min) || 30,
        consultation_fee: parseFloat(form.consultation_fee) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doctors"] });
      setCreateOpen(false);
      resetForm();
      toast.success("Shifokor qo'shildi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addSchedule = useMutation({
    mutationFn: async () => {
      if (!selectedId || !clinicQ.data) throw new Error("Shifokor tanlanmadi");
      if (!schedForm.day_of_week) throw new Error("Kun tanlanishi shart");

      const { error } = await supabase.from("doctor_schedules").insert({
        clinic_id: clinicQ.data,
        doctor_id: selectedId,
        day_of_week: parseInt(schedForm.day_of_week),
        start_time: schedForm.start_time,
        end_time: schedForm.end_time,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doctor-schedules", selectedId] });
      setScheduleDialog(false);
      setSchedForm({ day_of_week: "", start_time: "09:00", end_time: "17:00" });
      toast.success("Jadval qo'shildi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("doctor_schedules")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doctor-schedules", selectedId] });
      toast.success("Jadval o'chirildi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addTimeOff = useMutation({
    mutationFn: async () => {
      if (!selectedId || !clinicQ.data) throw new Error("Shifokor tanlanmadi");
      if (!timeOffForm.start_date || !timeOffForm.end_date) throw new Error("Sanalar kiritilishi shart");

      const { error } = await supabase.from("doctor_time_off").insert({
        clinic_id: clinicQ.data,
        doctor_id: selectedId,
        start_date: timeOffForm.start_date,
        end_date: timeOffForm.end_date,
        reason: timeOffForm.reason,
        notes: timeOffForm.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doctor-time-off", selectedId] });
      setTimeOffDialog(false);
      setTimeOffForm({ start_date: "", end_date: "", reason: "vacation", notes: "" });
      toast.success("Dam olish qo'shildi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Shifokorlar</h1>
        <Button
          onClick={() => { resetForm(); setCreateOpen(true); }}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <UserPlus className="h-4 w-4" />
          Yangi shifokor
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Ism yoki mutaxassislik bo'yicha qidirish..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shifokorlar ro'yxati ({doctorsQ.data?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {doctorsQ.isLoading ? (
            <p className="text-slate-500 py-4">Yuklanmoqda...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ism</TableHead>
                  <TableHead>Mutaxassislik</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Qabul vaqti</TableHead>
                  <TableHead>Narx</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(doctorsQ.data ?? []).map((d) => (
                  <TableRow
                    key={d.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => setSelectedId(d.id)}
                  >
                    <TableCell className="font-medium">{d.full_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        <Stethoscope className="h-3 w-3 mr-1" />
                        {d.specialty}
                      </Badge>
                    </TableCell>
                    <TableCell>{d.phone ?? "—"}</TableCell>
                    <TableCell>{d.consultation_duration_min} min</TableCell>
                    <TableCell>{Number(d.consultation_fee).toLocaleString()} so'm</TableCell>
                  </TableRow>
                ))}
                {(doctorsQ.data ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                      {search ? "Natija topilmadi" : "Hali shifokor yo'q"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Yangi shifokor dialogi */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Yangi shifokor qo'shish</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            <div className="col-span-2">
              <Label>To'liq ism *</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="mt-1" />
            </div>
            <div className="col-span-2">
              <Label>Mutaxassislik *</Label>
              <Select value={form.specialty} onValueChange={(v) => setForm({ ...form, specialty: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Tanlang" /></SelectTrigger>
                <SelectContent>
                  {SPECIALTIES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Telefon</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" placeholder="+998..." />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Litsenziya raqami</Label>
              <Input value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Qabul vaqti (min)</Label>
              <Input type="number" value={form.consultation_duration_min} onChange={(e) => setForm({ ...form, consultation_duration_min: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Konsultatsiya narxi (so'm)</Label>
              <Input type="number" value={form.consultation_fee} onChange={(e) => setForm({ ...form, consultation_fee: e.target.value })} className="mt-1" />
            </div>
            <div className="col-span-2">
              <Label>Bio</Label>
              <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="mt-1" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Bekor</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={createDoctor.isPending} onClick={() => createDoctor.mutate()}>
              {createDoctor.isPending ? "Saqlanmoqda..." : "Qo'shish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shifokor profili (Sheet) */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.full_name}</SheetTitle>
                <Badge variant="outline" className="w-fit bg-blue-50 text-blue-700 border-blue-200">
                  <Stethoscope className="h-3 w-3 mr-1" />
                  {selected.specialty}
                </Badge>
              </SheetHeader>

              <Tabs defaultValue="info" className="mt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="info">Ma'lumotlar</TabsTrigger>
                  <TabsTrigger value="schedule">Jadval</TabsTrigger>
                  <TabsTrigger value="timeoff">Dam olish</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-4 mt-4">
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
                  </div>
                  <div className="border-t pt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Litsenziya</span>
                      <span>{selected.license_number ?? "—"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Qabul vaqti</span>
                      <span>{selected.consultation_duration_min} min</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Narx</span>
                      <span>{Number(selected.consultation_fee).toLocaleString()} so'm</span>
                    </div>
                  </div>
                  {selected.bio && (
                    <div className="border-t pt-3">
                      <p className="text-sm text-slate-500 mb-1">Bio</p>
                      <p className="text-sm">{selected.bio}</p>
                    </div>
                  )}
                  <div className="border-t pt-3 text-xs text-slate-400">
                    Qo'shilgan: {new Date(selected.created_at).toLocaleDateString("uz-UZ")}
                  </div>
                </TabsContent>

                <TabsContent value="schedule" className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium">Haftalik jadval</p>
                    <Button size="sm" variant="outline" onClick={() => setScheduleDialog(true)}>
                      <Clock className="h-3 w-3 mr-1" /> Qo'shish
                    </Button>
                  </div>
                  {schedulesQ.isLoading ? (
                    <p className="text-sm text-slate-400">Yuklanmoqda...</p>
                  ) : (schedulesQ.data ?? []).length === 0 ? (
                    <p className="text-sm text-slate-400 py-4 text-center">Jadval yo'q</p>
                  ) : (
                    <div className="space-y-2">
                      {(schedulesQ.data ?? []).map((s) => (
                        <div key={s.id} className="flex items-center justify-between p-2 border rounded text-sm">
                          <div>
                            <span className="font-medium">{DAY_NAMES[s.day_of_week]}</span>
                            <span className="ml-2 text-slate-500">
                              {s.start_time.slice(0, 5)} — {s.end_time.slice(0, 5)}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-slate-400 hover:text-red-500"
                            onClick={() => deleteSchedule.mutate(s.id)}
                          >
                            ✕
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="timeoff" className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium">Dam olish / ta'til</p>
                    <Button size="sm" variant="outline" onClick={() => setTimeOffDialog(true)}>
                      <CalendarOff className="h-3 w-3 mr-1" /> Qo'shish
                    </Button>
                  </div>
                  {timeOffQ.isLoading ? (
                    <p className="text-sm text-slate-400">Yuklanmoqda...</p>
                  ) : (timeOffQ.data ?? []).length === 0 ? (
                    <p className="text-sm text-slate-400 py-4 text-center">Dam olish yo'q</p>
                  ) : (
                    <div className="space-y-2">
                      {(timeOffQ.data ?? []).map((t) => (
                        <div key={t.id} className="p-2 border rounded text-sm space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              {t.start_date} — {t.end_date}
                            </span>
                            <Badge variant="outline" className={
                              t.status === "approved"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : t.status === "rejected"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }>
                              {TIME_OFF_STATUS[t.status] ?? t.status}
                            </Badge>
                          </div>
                          <p className="text-slate-500">
                            {TIME_OFF_REASON[t.reason] ?? t.reason}
                            {t.notes && ` — ${t.notes}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Jadval qo'shish dialogi */}
      <Dialog open={scheduleDialog} onOpenChange={setScheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Jadval qo'shish</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div>
              <Label>Kun *</Label>
              <Select value={schedForm.day_of_week} onValueChange={(v) => setSchedForm({ ...schedForm, day_of_week: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Kunni tanlang" /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                    <SelectItem key={d} value={String(d)}>{DAY_NAMES[d]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Boshlanish</Label>
                <Input type="time" value={schedForm.start_time} onChange={(e) => setSchedForm({ ...schedForm, start_time: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Tugash</Label>
                <Input type="time" value={schedForm.end_time} onChange={(e) => setSchedForm({ ...schedForm, end_time: e.target.value })} className="mt-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialog(false)}>Bekor</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={addSchedule.isPending} onClick={() => addSchedule.mutate()}>
              {addSchedule.isPending ? "Saqlanmoqda..." : "Qo'shish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dam olish qo'shish dialogi */}
      <Dialog open={timeOffDialog} onOpenChange={setTimeOffDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dam olish / ta'til qo'shish</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Boshlanish sanasi *</Label>
                <Input type="date" value={timeOffForm.start_date} onChange={(e) => setTimeOffForm({ ...timeOffForm, start_date: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Tugash sanasi *</Label>
                <Input type="date" value={timeOffForm.end_date} onChange={(e) => setTimeOffForm({ ...timeOffForm, end_date: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Sabab</Label>
              <Select value={timeOffForm.reason} onValueChange={(v) => setTimeOffForm({ ...timeOffForm, reason: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacation">Ta'til</SelectItem>
                  <SelectItem value="sick">Kasallik</SelectItem>
                  <SelectItem value="conference">Konferensiya</SelectItem>
                  <SelectItem value="personal">Shaxsiy</SelectItem>
                  <SelectItem value="other">Boshqa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Izoh</Label>
              <Input value={timeOffForm.notes} onChange={(e) => setTimeOffForm({ ...timeOffForm, notes: e.target.value })} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTimeOffDialog(false)}>Bekor</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={addTimeOff.isPending} onClick={() => addTimeOff.mutate()}>
              {addTimeOff.isPending ? "Saqlanmoqda..." : "Qo'shish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
