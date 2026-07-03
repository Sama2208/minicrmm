import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, RefreshCw } from "lucide-react";
import { useIsPlatformAdmin, slugify } from "@/lib/clinic";
import { createClinic, listClinicsForPlatform } from "@/lib/platform.functions";

export const Route = createFileRoute("/admin/klinikalar")({
  ssr: false,
  component: () => <KlinikalarPage />,
});

function randomPassword() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

function KlinikalarPage() {
  const isPlatformAdminQ = useIsPlatformAdmin();

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
          <p className="text-sm text-slate-500">
            Bu sahifa faqat platforma egasi uchun. Sizda klinika qo'shish huquqi yo'q.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AdminShell title="Klinikalar">
      <CreateClinicCard />
      <ClinicsList />
    </AdminShell>
  );
}

function CreateClinicCard() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
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

function ClinicsList() {
  const clinicsQ = useQuery({
    queryKey: ["platform-clinics"],
    queryFn: () => listClinicsForPlatform(),
  });

  const rows = useMemo(() => clinicsQ.data ?? [], [clinicsQ.data]);

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
              <TableHead>Slug</TableHead>
              <TableHead>Holat</TableHead>
              <TableHead>Yaratilgan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clinicsQ.isLoading ? (
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
              rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-500">{c.slug}</TableCell>
                  <TableCell>
                    {c.is_active ? (
                      <Badge className="bg-emerald-600">Faol</Badge>
                    ) : (
                      <Badge variant="outline">Nofaol</Badge>
                    )}
                  </TableCell>
                  <TableCell>{new Date(c.created_at).toLocaleDateString("uz-UZ")}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
