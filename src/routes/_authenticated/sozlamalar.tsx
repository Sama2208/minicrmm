import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Plus, Trash2, Facebook } from "lucide-react";
import { toast } from "sonner";
import { useClinicId, useClinicStatus, DEFAULT_BRAND_COLOR } from "@/lib/clinic";
import { updateClinicBranding } from "@/lib/branding.functions";
import {
  createFacebookOAuthState,
  listPendingFacebookPages,
  confirmFacebookPage,
  getFacebookConnectionStatus,
  toggleFacebookFormSync,
  disconnectFacebook,
  syncFacebookForms,
} from "@/lib/facebook.functions";

export const Route = createFileRoute("/_authenticated/sozlamalar")({ component: SozlamalarPage });

type Operator = {
  id: string;
  full_name: string;
  telegram_chat_id: string | null;
  is_active: boolean;
};

function SozlamalarPage() {
  const qc = useQueryClient();
  const clinicQ = useClinicId();
  const [newName, setNewName] = useState("");
  const [newTg, setNewTg] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("operators").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["operators-full"] });
      qc.invalidateQueries({ queryKey: ["operators"] });
      qc.invalidateQueries({ queryKey: ["operators-with-users"] });
      setDeleteId(null);
      toast.success("O'chirildi");
    },
    onError: (e: Error) => {
      setDeleteId(null);
      toast.error(e.message);
    },
  });

  const opsQ = useQuery({
    queryKey: ["operators-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operators")
        .select("id, full_name, telegram_chat_id, is_active")
        .order("full_name");
      if (error) throw error;
      return data as Operator[];
    },
  });

  const update = useMutation({
    mutationFn: async (op: Partial<Operator> & { id: string }) => {
      const { id, ...rest } = op;
      const { error } = await supabase.from("operators").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["operators-full"] });
      qc.invalidateQueries({ queryKey: ["operators"] });
      toast.success("Yangilandi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!newName.trim()) throw new Error("Ism kiritilishi shart");
      if (!clinicQ.data) throw new Error("Klinika aniqlanmadi");
      const { error } = await supabase.from("operators").insert({
        full_name: newName.trim(),
        telegram_chat_id: newTg || null,
        clinic_id: clinicQ.data,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["operators-full"] });
      qc.invalidateQueries({ queryKey: ["operators"] });
      setNewName("");
      setNewTg("");
      toast.success("Operator qo'shildi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <BrandingCard />
      <FacebookConnectionCard />

      <Card>
        <CardHeader>
          <CardTitle>Yangi operator qo'shish</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <Label>Ism</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex-1 min-w-[180px]">
              <Label>Telegram chat ID</Label>
              <Input
                value={newTg}
                onChange={(e) => setNewTg(e.target.value)}
                className="mt-1"
                placeholder="ixtiyoriy"
              />
            </div>
            <Button
              onClick={() => create.mutate()}
              disabled={create.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" /> Qo'shish
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Operatorlar</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ism</TableHead>
                <TableHead>Telegram chat ID</TableHead>
                <TableHead>Faol</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(opsQ.data ?? []).map((o) => (
                <OperatorRow
                  key={o.id}
                  op={o}
                  onUpdate={(patch) => update.mutate({ id: o.id, ...patch })}
                  onDelete={() => setDeleteId(o.id)}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>O'chirishni tasdiqlaysizmi?</AlertDialogTitle>
            <AlertDialogDescription>Bu amalni qaytarib bo'lmaydi.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteId && remove.mutate(deleteId)}
            >
              O'chirish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BrandingCard() {
  const qc = useQueryClient();
  const clinicStatusQ = useClinicStatus();
  const [logoUrl, setLogoUrl] = useState("");
  const [color, setColor] = useState(DEFAULT_BRAND_COLOR);

  useEffect(() => {
    if (!clinicStatusQ.data) return;
    setLogoUrl(clinicStatusQ.data.logo_url ?? "");
    setColor(clinicStatusQ.data.primary_color);
  }, [clinicStatusQ.data]);

  const save = useMutation({
    mutationFn: () =>
      updateClinicBranding({ data: { logoUrl: logoUrl.trim(), primaryColor: color } }),
    onSuccess: () => {
      toast.success("Branding yangilandi");
      qc.invalidateQueries({ queryKey: ["my-clinic-status"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Klinika brandingi</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>Logo manzili (URL, ixtiyoriy)</Label>
          <Input
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            className="mt-1"
            placeholder="https://..."
          />
        </div>
        <div>
          <Label>Asosiy rang</Label>
          <div className="flex items-center gap-2 mt-1">
            <Input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-14 p-1"
            />
            <Input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="font-mono text-sm max-w-[120px]"
            />
          </div>
        </div>
        <Button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          style={{ backgroundColor: color }}
          className="hover:opacity-90"
        >
          {save.isPending ? "Saqlanmoqda..." : "Saqlash"}
        </Button>
      </CardContent>
    </Card>
  );
}

function FacebookConnectionCard() {
  const qc = useQueryClient();
  const [pendingState, setPendingState] = useState<string | null>(null);

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

  const statusQ = useQuery({
    queryKey: ["facebook-connection"],
    queryFn: () => getFacebookConnectionStatus(),
  });

  const pendingPagesQ = useQuery({
    queryKey: ["facebook-pending-pages", pendingState],
    queryFn: () => listPendingFacebookPages({ data: { state: pendingState! } }),
    enabled: !!pendingState,
  });

  const connect = useMutation({
    mutationFn: () => createFacebookOAuthState(),
    onSuccess: (result) => {
      window.location.href = result.authorizeUrl;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const confirmPage = useMutation({
    mutationFn: (pageId: string) => confirmFacebookPage({ data: { state: pendingState!, pageId } }),
    onSuccess: (result) => {
      if (result.subscribeError) {
        toast.error(
          `"${result.pageName}" ulandi, lekin webhook obunasi xato: ${result.subscribeError}`,
        );
      } else {
        toast.success(`"${result.pageName}" ulandi`);
      }
      setPendingState(null);
      qc.invalidateQueries({ queryKey: ["facebook-connection"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleForm = useMutation({
    mutationFn: (vars: { formRowId: string; enabled: boolean }) =>
      toggleFacebookFormSync({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["facebook-connection"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const disconnect = useMutation({
    mutationFn: () => disconnectFacebook(),
    onSuccess: () => {
      toast.success("Facebook ulanishi uzildi");
      qc.invalidateQueries({ queryKey: ["facebook-connection"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const syncForms = useMutation({
    mutationFn: () => syncFacebookForms(),
    onSuccess: (res) => {
      toast.success(`Formalar yangilandi (${res.count} ta)`);
      qc.invalidateQueries({ queryKey: ["facebook-connection"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Facebook className="h-4 w-4" />
          Facebook Lead Ads
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingState && (
          <div className="border rounded-md p-3 bg-slate-50 space-y-2">
            <p className="text-sm font-medium text-slate-700">Qaysi Page'ni ulaymiz?</p>
            {pendingPagesQ.isLoading ? (
              <p className="text-sm text-slate-500">Yuklanmoqda...</p>
            ) : (pendingPagesQ.data ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">Page topilmadi</p>
            ) : (
              <div className="space-y-1.5">
                {(pendingPagesQ.data ?? []).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between bg-white border rounded px-3 py-2"
                  >
                    <span className="text-sm">{p.name}</span>
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => confirmPage.mutate(p.id)}
                      disabled={confirmPage.isPending}
                    >
                      Ulash
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {statusQ.isLoading ? (
          <p className="text-sm text-slate-500">Yuklanmoqda...</p>
        ) : statusQ.data?.connected ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm">
                Ulangan: <span className="font-medium">{statusQ.data.pageName}</span>
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => syncForms.mutate()}
                  disabled={syncForms.isPending}
                >
                  {syncForms.isPending ? "Yuklanmoqda..." : "Formalarni yangilash"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs text-red-600 hover:text-red-700"
                  onClick={() => disconnect.mutate()}
                  disabled={disconnect.isPending}
                >
                  Uzish
                </Button>
              </div>
            </div>
            {statusQ.data.forms.length === 0 ? (
              <p className="text-sm text-slate-400">Reklama lid formalari topilmadi</p>
            ) : (
              <div className="space-y-1.5">
                {statusQ.data.forms.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between border rounded-md px-3 py-2"
                  >
                    <span className="text-sm">{f.form_name}</span>
                    <Switch
                      checked={f.is_syncing}
                      onCheckedChange={(v) => toggleForm.mutate({ formRowId: f.id, enabled: v })}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-slate-500">
              Facebook/Instagram reklama lid formalaringizni ulab, mijozlar to'ldirgan zahoti CRM'ga
              avtomatik tushishini yoqing.
            </p>
            <Button
              onClick={() => connect.mutate()}
              disabled={connect.isPending}
              className="bg-[#1877F2] hover:bg-[#1461cc]"
            >
              <Facebook className="h-4 w-4" />
              {connect.isPending ? "Ulanmoqda..." : "Facebook orqali ulash"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OperatorRow({
  op,
  onUpdate,
  onDelete,
}: {
  op: Operator;
  onUpdate: (patch: Partial<Operator>) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(op.full_name);
  const [tg, setTg] = useState(op.telegram_chat_id ?? "");

  return (
    <TableRow>
      <TableCell>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name !== op.full_name && onUpdate({ full_name: name })}
          className="h-8"
        />
      </TableCell>
      <TableCell>
        <Input
          value={tg}
          onChange={(e) => setTg(e.target.value)}
          onBlur={() =>
            tg !== (op.telegram_chat_id ?? "") && onUpdate({ telegram_chat_id: tg || null })
          }
          className="h-8"
          placeholder="—"
        />
      </TableCell>
      <TableCell>
        <Switch checked={op.is_active} onCheckedChange={(v) => onUpdate({ is_active: v })} />
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
