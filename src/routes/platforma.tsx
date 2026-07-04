import { createFileRoute } from "@tanstack/react-router";
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
import { Switch } from "@/components/ui/switch";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LogOut,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  Facebook,
  Eye,
  EyeOff,
  ShieldCheck,
  Download,
} from "lucide-react";
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
  updateClinicInfo,
  deleteClinic,
  getClinicsOverview,
} from "@/lib/platform.functions";
import {
  createFacebookOAuthState,
  listPendingFacebookPages,
  confirmFacebookPage,
  getFacebookConnectionStatus,
  toggleFacebookFormSync,
  disconnectFacebook,
  syncFacebookForms,
  importHistoricalLeads,
} from "@/lib/facebook.functions";

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
  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <ShieldCheck className="h-5 w-5 text-slate-700 shrink-0" />
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

function PlatformaLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Email va parol kiritilishi shart");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        throw new Error(
          error.message === "Invalid login credentials"
            ? "Email yoki parol noto'g'ri"
            : error.message,
        );
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm bg-slate-900 rounded-xl border border-slate-800 p-8 space-y-6">
        <div className="text-center space-y-1">
          <ShieldCheck className="h-8 w-8 text-emerald-500 mx-auto" />
          <h1 className="text-xl font-semibold text-slate-100">Platforma boshqaruvi</h1>
          <p className="text-sm text-slate-500">Faqat platforma egasi uchun</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="platform-email" className="text-slate-300">
              Email
            </Label>
            <Input
              id="platform-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="bg-slate-800 border-slate-700 text-slate-100"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="platform-password" className="text-slate-300">
              Parol
            </Label>
            <div className="relative">
              <Input
                id="platform-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="bg-slate-800 border-slate-700 text-slate-100 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            disabled={loading}
          >
            {loading ? "Yuklanmoqda..." : "Kirish"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function PlatformaPage() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const isPlatformAdminQ = useIsPlatformAdmin({ enabled: hasSession });
  const [pendingState, setPendingState] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setCheckingSession(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fbError = params.get("fb_error");
    const fbSession = params.get("fb_session");
    if (fbError) toast.error(decodeURIComponent(fbError));
    if (fbSession) setPendingState(fbSession);
    if (fbError || fbSession) {
      params.delete("fb_error");
      params.delete("fb_session");
      const rest = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (rest ? `?${rest}` : ""));
    }
  }, []);

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">
        Tekshirilmoqda...
      </div>
    );
  }

  if (!hasSession) {
    return <PlatformaLoginForm />;
  }

  if (isPlatformAdminQ.isLoading) {
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
          <p className="text-sm text-slate-500">Bu tizim faqat platforma egasi uchun.</p>
          <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}>
            <LogOut className="h-4 w-4" /> Chiqish
          </Button>
        </div>
      </div>
    );
  }

  return (
    <PlatformaShell>
      <CreateClinicCard />
      <ClinicsList />
      <ClinicsOverviewCard />
      {pendingState && (
        <FacebookPagePickerDialog
          state={pendingState}
          open={!!pendingState}
          onClose={() => setPendingState(null)}
        />
      )}
    </PlatformaShell>
  );
}

function FacebookPagePickerDialog({
  state,
  open,
  onClose,
}: {
  state: string;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();

  const pendingPagesQ = useQuery({
    queryKey: ["platform-facebook-pending-pages", state],
    queryFn: () => listPendingFacebookPages({ data: { state } }),
  });

  const confirmPage = useMutation({
    mutationFn: (pageId: string) => confirmFacebookPage({ data: { state, pageId } }),
    onSuccess: (result) => {
      if (result.subscribeError) {
        toast.error(
          `"${result.pageName}" ulandi, lekin webhook obunasi xato: ${result.subscribeError}`,
        );
      } else {
        toast.success(`"${result.pageName}" ulandi`);
      }
      qc.invalidateQueries({ queryKey: ["platform-facebook-status"] });
      onClose();
    },
    onError: (e: Error) => {
      toast.error(e.message);
      onClose();
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Qaysi Facebook sahifasi ulanadi?</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {pendingPagesQ.isLoading ? (
            <p className="text-sm text-slate-500">Yuklanmoqda...</p>
          ) : (pendingPagesQ.data ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">Sahifalar topilmadi</p>
          ) : (
            (pendingPagesQ.data ?? []).map((p) => (
              <Button
                key={p.id}
                variant="outline"
                className="w-full justify-start"
                disabled={confirmPage.isPending}
                onClick={() => confirmPage.mutate(p.id)}
              >
                {p.name}
              </Button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
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
            <Label>Slug (klinika identifikatori)</Label>
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
  const qc = useQueryClient();
  const clinicsQ = useQuery({
    queryKey: ["platform-clinics"],
    queryFn: () => listClinicsForPlatform(),
  });
  const plansQ = usePlansQuery();
  const [editing, setEditing] = useState<ClinicRow | null>(null);
  const [facebookFor, setFacebookFor] = useState<ClinicRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClinicRow | null>(null);

  const rows = useMemo(() => clinicsQ.data ?? [], [clinicsQ.data]);
  const planNameById = useMemo(() => {
    const m = new Map<string, string>();
    (plansQ.data ?? []).forEach((p) => m.set(p.id, p.name));
    return m;
  }, [plansQ.data]);

  const remove = useMutation({
    mutationFn: (clinicId: string) => deleteClinic({ data: { clinicId } }),
    onSuccess: () => {
      toast.success("Klinika o'chirildi");
      qc.invalidateQueries({ queryKey: ["platform-clinics"] });
      qc.invalidateQueries({ queryKey: ["platform-clinics-overview"] });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
              <TableHead className="w-[110px]"></TableHead>
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
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Facebook ulanishi"
                          onClick={() => setFacebookFor(c)}
                        >
                          <Facebook className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Tahrirlash"
                          onClick={() => setEditing(c)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="O'chirish"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeleteTarget(c)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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

      {facebookFor && (
        <ClinicFacebookDialog
          clinic={facebookFor}
          open={!!facebookFor}
          onClose={() => setFacebookFor(null)}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>"{deleteTarget?.name}" o'chirilsinmi?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu amalni qaytarib bo'lmaydi — klinikaning barcha lidlari, operatorlari va boshqa
              ma'lumotlari butunlay o'chiriladi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={remove.isPending}
              onClick={() => deleteTarget && remove.mutate(deleteTarget.id)}
            >
              O'chirish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

  const [name, setName] = useState(clinic.name);
  const [slug, setSlug] = useState(clinic.slug);
  const [planSlug, setPlanSlug] = useState(currentPlanSlug);
  const [status, setStatus] = useState(clinic.subscription_status);
  const [periodEnd, setPeriodEnd] = useState(
    clinic.subscription_current_period_end
      ? clinic.subscription_current_period_end.slice(0, 10)
      : "",
  );
  const [notes, setNotes] = useState(clinic.subscription_notes ?? "");

  const save = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Klinika nomi kiritilishi shart");
      if (!slug.trim()) throw new Error("Slug kiritilishi shart");

      await Promise.all([
        updateClinicInfo({
          data: { clinicId: clinic.id, name: name.trim(), slug: slug.trim() },
        }),
        updateClinicSubscription({
          data: {
            clinicId: clinic.id,
            planSlug: planSlug as "basic" | "pro" | "premium",
            subscriptionStatus: status as "trialing" | "active" | "past_due" | "canceled",
            periodEnd: periodEnd || null,
            notes: notes.trim() || null,
          },
        }),
      ]);
    },
    onSuccess: () => {
      toast.success("Klinika yangilandi");
      qc.invalidateQueries({ queryKey: ["platform-clinics"] });
      qc.invalidateQueries({ queryKey: ["platform-clinics-overview"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{clinic.name} — tahrirlash</DialogTitle>
          <DialogDescription>
            To'lov qo'lda tasdiqlanadi (Payme/Click/Uzum orqali mijoz to'lovi qabul qilingach).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Klinika nomi</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Slug</Label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                className="mt-1 font-mono text-sm"
              />
            </div>
          </div>
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

function ClinicFacebookDialog({
  clinic,
  open,
  onClose,
}: {
  clinic: ClinicRow;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();

  const statusQ = useQuery({
    queryKey: ["platform-facebook-status", clinic.id],
    queryFn: () => getFacebookConnectionStatus({ data: { clinicId: clinic.id } }),
  });

  const connect = useMutation({
    mutationFn: () => createFacebookOAuthState({ data: { clinicId: clinic.id } }),
    onSuccess: (result) => {
      window.location.href = result.authorizeUrl;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleForm = useMutation({
    mutationFn: (vars: { formRowId: string; enabled: boolean }) =>
      toggleFacebookFormSync({ data: { ...vars, clinicId: clinic.id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform-facebook-status", clinic.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const disconnect = useMutation({
    mutationFn: () => disconnectFacebook({ data: { clinicId: clinic.id } }),
    onSuccess: () => {
      toast.success("Facebook ulanishi uzildi");
      qc.invalidateQueries({ queryKey: ["platform-facebook-status", clinic.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const syncForms = useMutation({
    mutationFn: () => syncFacebookForms({ data: { clinicId: clinic.id } }),
    onSuccess: (res) => {
      if (res.subscribeError) {
        toast.error(
          `Formalar yangilandi (${res.count} ta), lekin webhook obunasi xato: ${res.subscribeError}`,
        );
      } else {
        toast.success(`Formalar yangilandi (${res.count} ta), webhook obunasi tasdiqlandi`);
      }
      qc.invalidateQueries({ queryKey: ["platform-facebook-status", clinic.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const importLeads = useMutation({
    mutationFn: (formRowId: string) =>
      importHistoricalLeads({ data: { formRowId, clinicId: clinic.id } }),
    onSuccess: (res) => {
      toast.success(`${res.total} ta lid topildi, ${res.imported} tasi yangi qo'shildi`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{clinic.name} — Facebook ulanishi</DialogTitle>
          <DialogDescription>
            Klinikaning Facebook sahifasini ulab, lidlar avtomatik CRM'ga tushishini ta'minlang.
          </DialogDescription>
        </DialogHeader>

        {statusQ.isLoading ? (
          <p className="text-sm text-slate-500">Yuklanmoqda...</p>
        ) : statusQ.data?.connected ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="font-medium">{statusQ.data.pageName}</div>
                <div className="text-xs text-slate-500">Ulangan</div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncForms.mutate()}
                  disabled={syncForms.isPending}
                >
                  {syncForms.isPending ? "Yuklanmoqda..." : "Formalarni yangilash"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => disconnect.mutate()}
                  disabled={disconnect.isPending}
                >
                  Uzish
                </Button>
              </div>
            </div>
            {statusQ.data.forms.length > 0 && (
              <div className="space-y-2">
                <Label>Formalar</Label>
                {statusQ.data.forms.map((f) => (
                  <div key={f.id} className="flex items-center justify-between text-sm">
                    <span>{f.form_name}</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Eski lidlarni import qilish"
                        onClick={() => importLeads.mutate(f.id)}
                        disabled={importLeads.isPending}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Switch
                        checked={f.is_syncing}
                        onCheckedChange={(checked) =>
                          toggleForm.mutate({ formRowId: f.id, enabled: checked })
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <Button
            onClick={() => connect.mutate()}
            disabled={connect.isPending}
            className="bg-[#1877F2] hover:bg-[#1465d1]"
          >
            <Facebook className="h-4 w-4" />
            {connect.isPending ? "Yo'naltirilmoqda..." : "Facebook bilan ulash"}
          </Button>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Yopish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ClinicOverviewRow = {
  clinicId: string;
  name: string;
  slug: string;
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  activeOperators: number;
};

function ClinicsOverviewCard() {
  const overviewQ = useQuery({
    queryKey: ["platform-clinics-overview"],
    queryFn: () => getClinicsOverview() as Promise<ClinicOverviewRow[]>,
  });
  const rows = overviewQ.data ?? [];

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Hisobotlar</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Klinika</TableHead>
              <TableHead>Jami lidlar</TableHead>
              <TableHead>Konversiya</TableHead>
              <TableHead>Faol operatorlar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {overviewQ.isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-slate-500 py-8">
                  Yuklanmoqda...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-slate-500 py-8">
                  Klinikalar topilmadi
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.clinicId}>
                  <TableCell>
                    <div className="font-medium">{r.name}</div>
                    <div className="font-mono text-xs text-slate-500">{r.slug}</div>
                  </TableCell>
                  <TableCell>{r.totalLeads}</TableCell>
                  <TableCell>
                    {r.conversionRate}% ({r.convertedLeads})
                  </TableCell>
                  <TableCell>{r.activeOperators}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
