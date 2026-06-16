import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/operatorlar")({
  ssr: false,
  component: () => <AdminOperatorsPage />,
});

type Operator = { id: string; full_name: string; telegram_chat_id: string | null; is_active: boolean; user_id: string | null };

function AdminOperatorsPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [tg, setTg] = useState("");

  const opsQ = useQuery({
    queryKey: ["admin-operators"],
    queryFn: async () => {
      const { data, error } = await supabase.from("operators")
        .select("id, full_name, telegram_chat_id, is_active, user_id").order("full_name");
      if (error) throw error;
      return data as Operator[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Ism kiritilishi shart");
      const { error } = await supabase.from("operators").insert({ full_name: name.trim(), telegram_chat_id: tg || null });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-operators"] }); setName(""); setTg(""); toast.success("Operator qo'shildi"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async (op: { id: string } & Partial<Operator>) => {
      const { id, ...rest } = op;
      const { error } = await supabase.from("operators").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-operators"] }); toast.success("Yangilandi"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminShell title="Operatorlar">
      <Card className="mb-6">
        <CardHeader><CardTitle>Yangi operator</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <Label>Ism</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
            </div>
            <div className="flex-1 min-w-[180px]">
              <Label>Telegram chat ID</Label>
              <Input value={tg} onChange={(e) => setTg(e.target.value)} className="mt-1" placeholder="ixtiyoriy" />
            </div>
            <Button onClick={() => create.mutate()} disabled={create.isPending} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4" /> Qo'shish
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Operatorlar ro'yxati</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ism</TableHead>
                <TableHead>Telegram</TableHead>
                <TableHead>Login</TableHead>
                <TableHead>Faol</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(opsQ.data ?? []).map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.full_name}</TableCell>
                  <TableCell>{o.telegram_chat_id ?? "—"}</TableCell>
                  <TableCell>{o.user_id ? <Badge className="bg-emerald-600">Bog'langan</Badge> : <Badge variant="outline">Yo'q</Badge>}</TableCell>
                  <TableCell>
                    <Switch checked={o.is_active} onCheckedChange={(v) => update.mutate({ id: o.id, is_active: v })} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminShell>
  );
}
