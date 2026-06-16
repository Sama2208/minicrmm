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
              </TableRow>
            </TableHeader>
            <TableBody>
              {(opsQ.data ?? []).map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.full_name}</TableCell>
                  <TableCell>
                    {o.user_id
                      ? <Badge className="bg-emerald-600">Login bog'langan</Badge>
                      : <Badge variant="outline">Login yo'q</Badge>}
                  </TableCell>
                  <TableCell>{o.is_active ? "Ha" : "Yo'q"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
