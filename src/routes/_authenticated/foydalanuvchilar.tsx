import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createOperatorUser } from "@/lib/users.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/foydalanuvchilar")({ component: FoydalanuvchilarPage });

type Op = { id: string; full_name: string; user_id: string | null; is_active: boolean };

function FoydalanuvchilarPage() {

  const qc = useQueryClient();
  const opsQ = useQuery({
    queryKey: ["operators-with-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("operators")
        .select("id, full_name, user_id, is_active").order("full_name");
      if (error) throw error;
      return data as Op[];
    },
  });

  const create = useServerFn(createOperatorUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [opId, setOpId] = useState<string>("new");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("operators").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["operators-with-users"] });
      qc.invalidateQueries({ queryKey: ["operators"] });
      qc.invalidateQueries({ queryKey: ["operators-full"] });
      setDeleteId(null);
      toast.success("O'chirildi");
    },
    onError: (e: Error) => { setDeleteId(null); toast.error(e.message); },
  });

  const addUser = useMutation({
    mutationFn: async () => {
      if (!fullName.trim() || !email || password.length < 6) throw new Error("Barcha maydonlarni to'ldiring (parol >= 6 belgi)");
      return await create({ data: {
        email, password, full_name: fullName.trim(),
        operator_id: opId !== "new" ? opId : undefined,
      }});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["operators-with-users"] });
      qc.invalidateQueries({ queryKey: ["operators"] });
      setEmail(""); setPassword(""); setFullName(""); setOpId("new");
      toast.success("Operator hisobi yaratildi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unlinkedOps = (opsQ.data ?? []).filter((o) => !o.user_id);

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Yangi operator hisobi</CardTitle>
          <CardDescription>Operatorga login va parol bering — u shu ma'lumotlar bilan tizimga kiradi.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Mavjud operator (ixtiyoriy)</Label>
            <Select value={opId} onValueChange={setOpId}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new">— Yangi operator yozuvi —</SelectItem>
                {unlinkedOps.map((o) => <SelectItem key={o.id} value={o.id}>{o.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Ism</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Parol (min 6 belgi)</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" />
          </div>
          <Button onClick={() => addUser.mutate()} disabled={addUser.isPending} className="bg-emerald-600 hover:bg-emerald-700">
            {addUser.isPending ? "Yaratilmoqda..." : "Operator qo'shish"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Operatorlar ro'yxati</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ism</TableHead>
                <TableHead>Login holati</TableHead>
                <TableHead>Faol</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                const seen = new Map<string, Op>();
                for (const o of opsQ.data ?? []) {
                  const key = o.full_name.trim().toLowerCase();
                  const prev = seen.get(key);
                  // prefer the row that has a linked user_id
                  if (!prev || (!prev.user_id && o.user_id)) seen.set(key, o);
                }
                return Array.from(seen.values()).map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.full_name}</TableCell>
                    <TableCell>
                      {o.user_id
                        ? <Badge className="bg-emerald-600">Login bog'langan</Badge>
                        : <Badge variant="outline">Login yo'q</Badge>}
                    </TableCell>
                    <TableCell>{o.is_active ? "Ha" : "Yo'q"}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteId(o.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ));
              })()}
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
