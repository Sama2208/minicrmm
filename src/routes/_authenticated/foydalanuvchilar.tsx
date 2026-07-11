import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin, useUsers, useRoles, type UserWithRole } from "@/lib/rbac";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserPlus, Shield, UserX } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/foydalanuvchilar")({
  component: FoydalanuvchilarPage,
});

const STATUS_LABEL: Record<string, string> = {
  active: "Faol",
  invited: "Taklif",
  disabled: "O'chirilgan",
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  invited: "bg-amber-50 text-amber-700 border-amber-200",
  disabled: "bg-slate-100 text-slate-500 border-slate-200",
};

function FoydalanuvchilarPage() {
  const adminQ = useIsAdmin();
  const usersQ = useUsers();
  const rolesQ = useRoles();
  const clinicQ = useClinicId();
  const qc = useQueryClient();

  const [roleDialog, setRoleDialog] = useState<UserWithRole | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [disableId, setDisableId] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");

  const assignRole = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      if (!clinicQ.data) throw new Error("Klinika aniqlanmadi");
      await supabase.from("user_roles_v2").delete().eq("user_id", userId);
      const { error } = await supabase.from("user_roles_v2").insert({
        clinic_id: clinicQ.data,
        user_id: userId,
        role_id: roleId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users-list"] });
      setRoleDialog(null);
      toast.success("Rol yangilandi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleStatus = useMutation({
    mutationFn: async (userId: string) => {
      const user = usersQ.data?.find((u) => u.id === userId);
      if (!user) return;
      const newStatus = user.status === "disabled" ? "active" : "disabled";
      const { error } = await supabase
        .from("users")
        .update({ status: newStatus })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users-list"] });
      setDisableId(null);
      toast.success("Status yangilandi");
    },
    onError: (e: Error) => {
      setDisableId(null);
      toast.error(e.message);
    },
  });

  const inviteUser = useMutation({
    mutationFn: async () => {
      if (!inviteEmail.trim() || !inviteName.trim())
        throw new Error("Email va ism kiritilishi shart");
      if (!clinicQ.data) throw new Error("Klinika aniqlanmadi");

      const { data, error } = await supabase.auth.signUp({
        email: inviteEmail.trim(),
        password: crypto.randomUUID().slice(0, 16),
        options: {
          data: { full_name: inviteName.trim() },
        },
      });
      if (error) throw error;
      if (!data.user) throw new Error("Foydalanuvchi yaratilmadi");

      if (inviteRoleId) {
        const { error: roleErr } = await supabase.from("user_roles_v2").insert({
          clinic_id: clinicQ.data,
          user_id: data.user.id,
          role_id: inviteRoleId,
        });
        if (roleErr) throw roleErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users-list"] });
      setInviteOpen(false);
      setInviteEmail("");
      setInviteName("");
      setInviteRoleId("");
      toast.success("Foydalanuvchi qo'shildi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (adminQ.isLoading || usersQ.isLoading) {
    return <div className="p-6 text-slate-500">Yuklanmoqda...</div>;
  }

  if (!adminQ.data) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-10 text-center text-slate-500">
            Bu sahifaga faqat admin kirishi mumkin.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Foydalanuvchilar</h1>
        <Button
          onClick={() => setInviteOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <UserPlus className="h-4 w-4" />
          Yangi foydalanuvchi
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Xodimlar ({usersQ.data?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ism</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(usersQ.data ?? []).map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name}</TableCell>
                  <TableCell className="text-slate-600">{u.email}</TableCell>
                  <TableCell className="text-slate-600">{u.phone ?? "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-slate-100"
                      onClick={() => {
                        setRoleDialog(u);
                        setSelectedRoleId(u.role_id ?? "");
                      }}
                    >
                      <Shield className="h-3 w-3 mr-1" />
                      {u.role_name ?? "Rolsiz"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_BADGE[u.status] ?? ""}>
                      {STATUS_LABEL[u.status] ?? u.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-500 hover:text-red-600"
                      onClick={() => setDisableId(u.id)}
                      title={u.status === "disabled" ? "Faollashtirish" : "O'chirish"}
                    >
                      <UserX className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Rol biriktirish dialogi */}
      <Dialog open={!!roleDialog} onOpenChange={(o) => !o && setRoleDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Rol biriktirish — {roleDialog?.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Rol tanlang</Label>
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Rol tanlang" />
              </SelectTrigger>
              <SelectContent>
                {(rolesQ.data ?? []).map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} {r.is_system ? "(tizim)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialog(null)}>
              Bekor
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={!selectedRoleId || assignRole.isPending}
              onClick={() =>
                roleDialog && assignRole.mutate({ userId: roleDialog.id, roleId: selectedRoleId })
              }
            >
              {assignRole.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Yangi foydalanuvchi dialogi */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yangi foydalanuvchi qo'shish</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div>
              <Label>To'liq ism</Label>
              <Input
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="mt-1"
                placeholder="Ism familiya"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="mt-1"
                type="email"
                placeholder="user@example.com"
              />
            </div>
            <div>
              <Label>Rol (ixtiyoriy)</Label>
              <Select value={inviteRoleId} onValueChange={setInviteRoleId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Rol tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {(rolesQ.data ?? []).map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Bekor
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={inviteUser.isPending}
              onClick={() => inviteUser.mutate()}
            >
              {inviteUser.isPending ? "Yaratilmoqda..." : "Qo'shish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status o'zgartirish */}
      <AlertDialog open={!!disableId} onOpenChange={(o) => !o && setDisableId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Statusni o'zgartirasizmi?</AlertDialogTitle>
            <AlertDialogDescription>
              Foydalanuvchi {usersQ.data?.find((u) => u.id === disableId)?.status === "disabled"
                ? "faollashtiriladi"
                : "o'chiriladi (tizimga kira olmaydi)"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => disableId && toggleStatus.mutate(disableId)}
            >
              Tasdiqlash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
