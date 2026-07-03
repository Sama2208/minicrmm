import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, LogOut, Plus, RefreshCw, Pencil } from "lucide-react";
import {
  useIsPlatformAdmin,
  slugify,
  SUBSCRIPTION_STATUS_LABEL,
  SUBSCRIPTION_STATUS_BADGE,
  type SubscriptionStatus,
} from "@/lib/clinic";
import {
  createClinic,
  listClinicsForPlatform,
  listPlans,
  updateClinicSubscription,
} from "@/lib/platform.functions";

export const Route = createFileRoute("/platforma")({
  ssr: false,
  component: () => <PlatformaPage />,
});

function randomPassword() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

function formatSom(n: number) {
  return `${n.toLocaleString("uz-UZ")} so'm`;
}

function usePlansQuery() {
  return useQuery({ queryKey: ["platform-plans"], queryFn: () => listPlans() });
}

function PlatformaShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/lidlar"
            className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Ilovaga qaytish
          </Link>
          <h1 className="text-lg font-semibold text-slate-800 truncate">Platforma boshqaruvi</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut} className="shrink-0">
          <LogOut className="h-4 w-4" /> Chiqish
        </Button>
      </header>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">{children}</div>
    </div>
  );
}

function PlatformaPage() {
  const navigate = useNavigate();
  const [checkingSession, setCheckingSession] = useState(true);
  const isPlatformAdminQ = useIsPlatformAdmin();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/login" });
      setCheckingSession(false);
    });
  }, [navigate]);

  if (checkingSession || isPlatformAdminQ.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">
        Tekshirilmoqda...
      </div>
    );
  }

  if (!isPlatformAdminQ.data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm text-center space-y-2">
          <h1 className="text-lg font-semibold text-slate-800">Ruxsat yo'q</h1>
          <p className="text-sm text-slate-500">
            Bu sahifa faqat platforma egasi uchun. Sizda klinika qo'shish huquqi yo'q.
          </p>
          <Link to="/lidlar" className="text-sm text-emerald-600 hover:underline">
            Ilovaga qaytish
          </Link>
        </div>
      </div>
    );
  }

  return (
    <PlatformaShell>
      <CreateClinicCard />
      <ClinicsList />
    </PlatformaShell>
  );
}

function CreateClinicCard() {
  const qc = useQueryClient();
  const plansQ = usePlansQuery();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [planSlug, setPlanSlug] = useState("basic");
  const [adminFullName, setAdminFullName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState(randomPassword());

  const effectiveSlug = slugTouched ? slug : slugify(name);

  const create = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Klinika nomi kiritilishi shart");
      if (!effectiveSlug) throw new Error("Slug kiritilishi shart");
      if (!adminFullName.trim()) throw new Error("Admin ismi kiritilishi shart");
      if (!adminEmail.trim()) throw new Error("Admin email kiritilishi shart");
      if (adminPassword.length < 6)
        throw new Error("Parol kamida 6 belgidan iborat bo'lishi kerak");

      return createClinic({
        data: {
          clinicName: name.trim(),
          clinicSlug: effectiveSlug,
          planSlug: planSlug as "basic" | "pro" | "premium",
          adminFullName: adminFullName.trim(),
          adminEmail: adminEmail.trim(),
          adminPassword,
        },
      });
    },
    onSuccess: () => {
      toast.success(`Klinika yaratildi! Admin login: ${adminEmail} / parol: ${adminPassword}`, {
        duration: 15000,
      });
      qc.invalidateQueries({ queryKey: ["platform-clinics"] });
      setName("");
      setSlug("");
      setSlugTouched(false);
      setPlanSlug("basic");
      setAdminFullName("");
      setAdminEmail("");
      setAdminPassword(randomPassword());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Yangi klinika qo'shish</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Klinika nomi</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
              placeholder="Shifo Klinikasi"
            />
          </div>
          <div>
            <Label>Slug (ariza havolasi uchun)</Label>
            <Input
              value={effectiveSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              className="mt-1 font-mono text-sm"
              placeholder="shifo-klinikasi"
            />
          </div>
        </div>
        <div>
          <Label>Tarif (14 kunlik bepul sinov bilan boshlanadi)</Label>
          <Select value={planSlug} onValueChange={setPlanSlug}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(plansQ.data ?? []).map((p) => (
                <SelectItem key={p.slug} value={p.slug}>
                  {p.name} — {formatSom(p.price_monthly)}/oy (
                  {p.max_operators ? `${p.max_operators} operator` : "cheksiz operator"})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Admin to'liq ismi</Label>
            <Input
              value={adminFullName}
              onChange={(e) => setAdminFullName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Admin email</Label>
            <Input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="mt-1"
              placeholder="admin@klinika.uz"
            />
          </div>
        </div>
        <div>
          <Label>Admin parol (avtomatik yaratildi, kerak bo'lsa o'zgartiring)</Label>
          <div className="flex gap-2 mt-1">
            <Input
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="font-mono text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setAdminPassword(randomPassword())}
              title="Yangi parol yaratish"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Button
          onClick={() => create.mutate()}
          disabled={create.isPending}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          {create.isPending ? "Yaratilmoqda..." : "Klinika yaratish"}
        </Button>
      </CardContent>
    </Card>
  );
}

type ClinicRow = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  plan_id: string;
  subscription_status: string;
  subscription_current_period_end: string | null;
  subscription_notes: string | null;
};

function ClinicsList() {
  const clinicsQ = useQuery({
    queryKey: ["platform-clinics"],
    queryFn: () => listClinicsForPlatform(),
  });
  const plansQ = usePlansQuery();
  const [editing, setEditing] = useState<ClinicRow | null>(null);

  const rows = useMemo(() => clinicsQ.data ?? [], [clinicsQ.data]);
  const planNameById = useMemo(() => {
    const m = new Map<string, string>();
    (plansQ.data ?? []).forEach((p) => m.set(p.id, p.name));
    return m;
  }, [plansQ.data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Klinikalar ro'yxati</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nomi</TableHead>
              <TableHead>Tarif</TableHead>
              <TableHead>Holat</TableHead>
              <TableHead>Amal muddati</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clinicsQ.isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                  Yuklanmoqda...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                  Klinikalar topilmadi
                </TableCell>
              </TableRow>
            ) : (
              rows.map((c) => {
                const status = c.subscription_status as SubscriptionStatus;
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.name}</div>
                      <div className="font-mono text-xs text-slate-500">{c.slug}</div>
                    </TableCell>
                    <TableCell>{planNameById.get(c.plan_id) ?? "—"}</TableCell>
                    <TableCell>
                      <Badge className={SUBSCRIPTION_STATUS_BADGE[status] ?? ""}>
                        {SUBSCRIPTION_STATUS_LABEL[status] ?? c.subscription_status}
                      </Badge>
                      {!c.is_active && (
                        <Badge variant="outline" className="ml-1 text-slate-500">
                          Nofaol
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {c.subscription_current_period_end
                        ? new Date(c.subscription_current_period_end).toLocaleDateString("uz-UZ")
                        : "Muddatsiz"}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setEditing(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>

      {editing && (
        <EditSubscriptionDialog
          clinic={editing}
          open={!!editing}
          onClose={() => setEditing(null)}
        />
      )}
    </Card>
  );
}

function EditSubscriptionDialog({
  clinic,
  open,
  onClose,
}: {
  clinic: ClinicRow;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const plansQ = usePlansQuery();
  const currentPlanSlug = useMemo(
    () => (plansQ.data ?? []).find((p) => p.id === clinic.plan_id)?.slug ?? "basic",
    [plansQ.data, clinic.plan_id],
  );

  const [planSlug, setPlanSlug] = useState(currentPlanSlug);
  const [status, setStatus] = useState(clinic.subscription_status);
  const [periodEnd, setPeriodEnd] = useState(
    clinic.subscription_current_period_end
      ? clinic.subscription_current_period_end.slice(0, 10)
      : "",
  );
  const [notes, setNotes] = useState(clinic.subscription_notes ?? "");

  const save = useMutation({
    mutationFn: () =>
      updateClinicSubscription({
        data: {
          clinicId: clinic.id,
          planSlug: planSlug as "basic" | "pro" | "premium",
          subscriptionStatus: status as "trialing" | "active" | "past_due" | "canceled",
          periodEnd: periodEnd || null,
          notes: notes.trim() || null,
        },
      }),
    onSuccess: () => {
      toast.success("Obuna yangilandi");
      qc.invalidateQueries({ queryKey: ["platform-clinics"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{clinic.name} — obunani boshqarish</DialogTitle>
          <DialogDescription>
            To'lov qo'lda tasdiqlanadi (Payme/Click/Uzum orqali mijoz to'lovi qabul qilingach).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Tarif</Label>
            <Select value={planSlug} onValueChange={setPlanSlug}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(plansQ.data ?? []).map((p) => (
                  <SelectItem key={p.slug} value={p.slug}>
                    {p.name} — {formatSom(p.price_monthly)}/oy
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Holat</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SUBSCRIPTION_STATUS_LABEL) as SubscriptionStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {SUBSCRIPTION_STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Amal muddati (bo'sh — muddatsiz)</Label>
            <Input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Izoh (masalan: "Payme orqali 2026-07-10 da to'landi")</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {save.isPending ? "Saqlanmoqda..." : "Saqlash"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
