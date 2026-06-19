import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  SOURCE_LABEL, SOURCE_LIST, formatDate,
  type LeadStatus, type LeadSource,
} from "@/lib/crm";

export type KanbanLead = {
  id: string;
  full_name: string;
  phone: string | null;
  region: string | null;
  problem_type: string | null;
  source: LeadSource;
  source_detail: string | null;
  status: LeadStatus;
  assigned_to: string | null;
  notes: string | null;
  appointment_date: string | null;
  created_at: string;
  // optional dynamic field
  form_data?: Record<string, unknown> | null;
};

export type KanbanOperator = { id: string; full_name: string };

type ColumnDef = {
  key: LeadStatus | string; // string for custom localStorage columns
  status?: LeadStatus; // mapped status; custom columns have none
  title: string;
  locked?: boolean;
  custom?: boolean;
  accent?: "green" | "muted";
};

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: "yangi", status: "yangi", title: "Yangi lid", locked: true },
  { key: "kotarmadi", status: "kotarmadi", title: "Ko'tarmadi / Qayta aloqa" },
  { key: "konsultatsiyaga_yozildi", status: "konsultatsiyaga_yozildi", title: "Konsultatsiya" },
  { key: "konsultatsiyada_boldi", status: "konsultatsiyada_boldi", title: "Konsultatsiyaga keldi" },
  { key: "yotishga_yozildi", status: "yotishga_yozildi", title: "Yotdi", accent: "green" },
  { key: "qatnovchi", status: "qatnovchi", title: "Qatnovchi" },
  { key: "sifatsiz_lid", status: "sifatsiz_lid", title: "Sifatsiz lid", accent: "muted" },
];

const SOURCE_BADGE: Record<LeadSource, string> = {
  facebook: "bg-blue-100 text-blue-700",
  instagram: "bg-purple-100 text-purple-700",
  telegram: "bg-sky-100 text-sky-700",
  friends: "bg-violet-100 text-violet-700",
  website: "bg-emerald-100 text-emerald-700",
  boshqa: "bg-slate-100 text-slate-700",
};

const OP_COLORS = [
  "bg-blue-500", "bg-amber-500", "bg-emerald-500",
  "bg-violet-500", "bg-rose-500", "bg-cyan-500", "bg-orange-500",
];
function opColor(id: string) {
  let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return OP_COLORS[Math.abs(h) % OP_COLORS.length];
}
function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

const LS_TITLES = "kanban_column_titles_v1";
const LS_EXTRA = "kanban_extra_columns_v1";

export function LidlarKanban({
  leads, operators,
}: {
  leads: KanbanLead[];
  operators: KanbanOperator[];
}) {
  const qc = useQueryClient();
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [extras, setExtras] = useState<ColumnDef[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addOpenCol, setAddOpenCol] = useState<string | null>(null);

  useEffect(() => {
    try {
      const t = localStorage.getItem(LS_TITLES);
      if (t) setTitles(JSON.parse(t));
      const e = localStorage.getItem(LS_EXTRA);
      if (e) setExtras(JSON.parse(e));
    } catch { /* noop */ }
  }, []);

  const saveTitles = (next: Record<string, string>) => {
    setTitles(next);
    try { localStorage.setItem(LS_TITLES, JSON.stringify(next)); } catch { /* noop */ }
  };
  const saveExtras = (next: ColumnDef[]) => {
    setExtras(next);
    try { localStorage.setItem(LS_EXTRA, JSON.stringify(next)); } catch { /* noop */ }
  };

  const columns = useMemo<ColumnDef[]>(() => {
    return [...DEFAULT_COLUMNS, ...extras].map((c) => ({
      ...c,
      title: titles[c.key] ?? c.title,
    }));
  }, [extras, titles]);

  const opMap = useMemo(() => {
    const m = new Map<string, string>();
    operators.forEach((o) => m.set(o.id, o.full_name));
    return m;
  }, [operators]);

  const grouped = useMemo(() => {
    const m = new Map<string, KanbanLead[]>();
    columns.forEach((c) => m.set(c.key, []));
    leads.forEach((l) => {
      const col = columns.find((c) => c.status === l.status);
      if (col) m.get(col.key)!.push(l);
    });
    return m;
  }, [leads, columns]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LeadStatus }) => {
      const { error } = await supabase.from("leads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Status yangilandi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex gap-3 overflow-x-auto pb-3">
      {columns.map((col) => {
        const items = grouped.get(col.key) ?? [];
        return (
          <div
            key={col.key}
            className="shrink-0 w-[260px] bg-slate-50 border rounded-lg flex flex-col"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b">
              {editingKey === col.key && !col.locked ? (
                <input
                  autoFocus
                  defaultValue={col.title}
                  className="text-[12px] font-medium text-slate-700 bg-white border rounded px-1 w-full mr-2"
                  onBlur={(e) => {
                    saveTitles({ ...titles, [col.key]: e.target.value || col.title });
                    setEditingKey(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") setEditingKey(null);
                  }}
                />
              ) : (
                <span
                  className="text-[12px] font-medium text-slate-600 uppercase tracking-wide select-none"
                  onDoubleClick={() => { if (!col.locked) setEditingKey(col.key); }}
                  title={col.locked ? "Bu ustun qulflangan" : "Tahrirlash uchun ikki marta bosing"}
                >
                  {col.title}
                </span>
              )}
              <span className="ml-2 inline-flex items-center justify-center text-[11px] font-medium bg-slate-200 text-slate-700 rounded-full min-w-[20px] h-5 px-1.5">
                {items.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[calc(100vh-260px)]">
              {items.map((l) => (
                <KanbanCard
                  key={l.id}
                  lead={l}
                  expanded={expandedId === l.id}
                  onToggle={() => setExpandedId(expandedId === l.id ? null : l.id)}
                  opName={l.assigned_to ? opMap.get(l.assigned_to) ?? null : null}
                  operators={operators}
                  columns={columns}
                  currentColKey={col.key}
                  accent={col.accent}
                  onMove={(status) => {
                    updateStatus.mutate({ id: l.id, status });
                    setExpandedId(null);
                  }}
                />
              ))}

              {col.key === "yangi" && (
                addOpenCol === "yangi" ? (
                  <AddLeadMini onClose={() => setAddOpenCol(null)} />
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddOpenCol("yangi")}
                    className="w-full text-xs text-slate-600 hover:text-slate-900 border border-dashed rounded-md py-2 flex items-center justify-center gap-1 bg-white"
                  >
                    <Plus className="h-3.5 w-3.5" /> Lid qo'shish
                  </button>
                )
              )}
            </div>
          </div>
        );
      })}

      <div className="shrink-0 w-[260px] flex items-start">
        <button
          type="button"
          onClick={() => {
            const name = window.prompt("Yangi ustun nomi:");
            if (!name) return;
            const key = `custom_${Date.now()}`;
            saveExtras([...extras, { key, title: name, custom: true }]);
          }}
          className="w-full text-sm text-slate-600 hover:text-slate-900 border border-dashed rounded-lg py-3 flex items-center justify-center gap-1 bg-white"
        >
          <Plus className="h-4 w-4" /> Ustun qo'shish
        </button>
      </div>
    </div>
  );
}

function KanbanCard({
  lead, expanded, onToggle, opName, operators, columns, currentColKey, accent, onMove,
}: {
  lead: KanbanLead;
  expanded: boolean;
  onToggle: () => void;
  opName: string | null;
  operators: KanbanOperator[];
  columns: ColumnDef[];
  currentColKey: string;
  accent?: "green" | "muted";
  onMove: (status: LeadStatus) => void;
}) {
  const qc = useQueryClient();
  const [assignedTo, setAssignedTo] = useState(lead.assigned_to ?? "");
  const [notes, setNotes] = useState(lead.notes ?? "");

  useEffect(() => {
    setAssignedTo(lead.assigned_to ?? "");
    setNotes(lead.notes ?? "");
  }, [lead.id, lead.assigned_to, lead.notes]);

  const saveField = async (patch: Record<string, unknown>) => {
    const { error } = await supabase.from("leads").update(patch).eq("id", lead.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["leads"] });
  };

  const borderClass =
    accent === "green" ? "border border-[#97C459]" :
    "border border-slate-200";
  const opacityClass = accent === "muted" ? "opacity-70" : "";

  const formData = (lead.form_data && typeof lead.form_data === "object")
    ? Object.entries(lead.form_data as Record<string, unknown>) : [];

  return (
    <div
      className={`bg-white rounded-md ${borderClass} ${opacityClass} shadow-sm hover:shadow transition-shadow cursor-pointer`}
      onClick={onToggle}
    >
      <div className="px-3 py-2 flex items-center gap-2 h-[72px]">
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-slate-900 truncate">{lead.full_name}</div>
          <div className="text-[11px] text-slate-500 truncate">{lead.phone ?? "—"}</div>
          <div className="mt-1">
            <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded ${SOURCE_BADGE[lead.source]}`}>
              {SOURCE_LABEL[lead.source]}
            </span>
          </div>
        </div>
        {lead.assigned_to && (
          <div
            className={`h-6 w-6 rounded-full text-white text-[10px] font-semibold flex items-center justify-center shrink-0 ${opColor(lead.assigned_to)}`}
            title={opName ?? ""}
          >
            {initials(opName ?? "?")}
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t px-3 py-2 space-y-2" onClick={(e) => e.stopPropagation()}>
          <KV k="Viloyat" v={lead.region ?? "—"} />
          <KV k="Muammo turi" v={lead.problem_type ?? "—"} />
          <KV k="Manba tafsiloti" v={lead.source_detail ?? "—"} />
          <KV k="Konsultatsiya" v={formatDate(lead.appointment_date)} />

          {formData.length > 0 && (
            <div className="pt-1 border-t">
              {formData.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2 py-0.5">
                  <span className="text-[11px] text-slate-500">{k}</span>
                  <span className="text-[11px] font-semibold text-slate-900 text-right truncate max-w-[140px]">
                    {String(v ?? "")}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="pt-1">
            <Label className="text-[11px]">Operator</Label>
            <Select
              value={assignedTo}
              onValueChange={(v) => { setAssignedTo(v); saveField({ assigned_to: v || null }); }}
            >
              <SelectTrigger className="h-8 mt-1 text-xs"><SelectValue placeholder="Tanlang" /></SelectTrigger>
              <SelectContent>
                {operators.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[11px]">Izoh</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => { if ((lead.notes ?? "") !== notes) saveField({ notes: notes || null }); }}
              rows={2}
              className="mt-1 text-xs"
            />
          </div>

          <div className="pt-2 border-t">
            <div className="text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Ustun o'zgartirish</div>
            <div className="flex flex-wrap gap-1">
              {columns
                .filter((c) => c.key !== currentColKey && c.status)
                .map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => onMove(c.status as LeadStatus)}
                    className="text-[10px] px-2 py-1 rounded border bg-white hover:bg-slate-100 text-slate-700"
                  >
                    {c.title}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-[11px] text-slate-500">{k}</span>
      <span className="text-[11px] font-medium text-slate-900 text-right truncate max-w-[140px]">{v}</span>
    </div>
  );
}

function AddLeadMini({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState<LeadSource>("boshqa");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!fullName.trim()) { toast.error("Ism kiritilishi shart"); return; }
    setSaving(true);
    const { error } = await supabase.from("leads").insert({
      full_name: fullName.trim(),
      phone: phone || null,
      source,
      status: "yangi",
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Lid qo'shildi");
    qc.invalidateQueries({ queryKey: ["leads"] });
    onClose();
  };

  return (
    <div
      className="bg-white border rounded-md p-2 space-y-2"
      onClick={(e) => e.stopPropagation()}
    >
      <Input
        autoFocus placeholder="Ism familiya"
        value={fullName} onChange={(e) => setFullName(e.target.value)}
        className="h-8 text-xs"
      />
      <Input
        placeholder="Telefon" value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="h-8 text-xs"
      />
      <Select value={source} onValueChange={(v) => setSource(v as LeadSource)}>
        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {SOURCE_LIST.map((s) => (
            <SelectItem key={s} value={s}>{SOURCE_LABEL[s]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex gap-1">
        <Button size="sm" className="h-7 text-xs flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={save} disabled={saving}>
          Saqlash
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onClose}>Bekor</Button>
      </div>
    </div>
  );
}
