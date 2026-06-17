import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/sozlamalar")({ component: SozlamalarPage });

type Operator = {
  id: string;
  full_name: string;
  telegram_chat_id: string | null;
  is_active: boolean;
};

function SozlamalarPage() {

  const qc = useQueryClient();
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
    onError: (e: Error) => { setDeleteId(null); toast.error(e.message); },
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
      const { error } = await supabase.from("operators").insert({
        full_name: newName.trim(),
        telegram_chat_id: newTg || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["operators-full"] });
      qc.invalidateQueries({ queryKey: ["operators"] });
      setNewName(""); setNewTg("");
      toast.success("Operator qo'shildi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader><CardTitle>Yangi operator qo'shish</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <Label>Ism</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="mt-1" />
            </div>
            <div className="flex-1 min-w-[180px]">
              <Label>Telegram chat ID</Label>
              <Input value={newTg} onChange={(e) => setNewTg(e.target.value)} className="mt-1" placeholder="ixtiyoriy" />
            </div>
            <Button onClick={() => create.mutate()} disabled={create.isPending} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4" /> Qo'shish
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Operatorlar</CardTitle></CardHeader>
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
          onBlur={() => tg !== (op.telegram_chat_id ?? "") && onUpdate({ telegram_chat_id: tg || null })}
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
