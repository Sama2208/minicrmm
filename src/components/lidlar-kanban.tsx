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
import {
  DndContext, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable, DragOverlay,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import {
  SOURCE_LABEL, SOURCE_LIST, CAN_VISIT_LABEL, STATUS_LABEL, STATUS_ORDER,
  type LeadStatus, type LeadSource, type CanVisitClinic,
} from "@/lib/crm";

export type KanbanLead = {
  id: string;
  full_name: string;
  phone: string | null;
  nomer_asosiy: string | null;
  region: string | null;
  problem_type: string | null;
  can_visit_clinic: CanVisitClinic | null;
  source: LeadSource;
  source_detail: string | null;
  status: LeadStatus;
  assigned_to: string | null;
  notes: string | null;
  appointment_date: string | null;
  created_at: string;
};

export type KanbanOperator = { id: string; full_name: string };

type ColumnDef = {
  key: LeadStatus;
  status: LeadStatus;
  title: string;
  locked?: boolean;
  accent?: "green" | "muted";
};

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: "yangi",                    status: "yangi",                    title: "Yangi lid",               locked: true },
  { key: "kotarmadi",                status: "kotarmadi",                title: "Ko'tarmadi" },
  { key: "qayta_qongiroq",           status: "qayta_qongiroq",           title: "Qayta qo'ng'iroq" },
  { key: "konsultatsiyaga_yozildi",  status: "konsultatsiyaga_yozildi",  title: "Konsultatsiyaga yozildi" },
  { key: "konsultatsiyada_boldi",    status: "konsultatsiyada_boldi",    title: "Konsultatsiyaga keldi" },
  { key: "yotishga_yozildi",         status: "yotishga_yozildi",         title: "Yotdi",                   accent: "green" },
  { key: "qatnovchi",                status: "qatnovchi",                title: "Qatnovchi" },
  { key: "sifatsiz_lid",             status: "sifatsiz_lid",             title: "Sifatsiz lid",            accent: "muted" },
];

const SOURCE_BADGE: Record<LeadSource, string> = {
  facebook:  "bg-blue-100 text-blue-700",
  instagram: "bg-purple-100 text-purple-700",
  telegram:  "bg-sky-100 text-sky-700",
  friends:   "bg-violet-100 text-violet-700",
  website:   "bg-emerald-100 text-emerald-700",
  boshqa:    "bg-slate-100 text-slate-700",
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

export function LidlarKanban({
  leads, operators,
}: {
  leads: KanbanLead[];
  operators: KanbanOperator[];
}) {
  const qc = useQueryClient();
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [addOpenCol, setAddOpenCol] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  useEffect(() => {
    try {
      const t = localStorage.getItem(LS_TITLES);
      if (t) setTitles(JSON.parse(t));
    } catch { /* noop */ }
  }, []);

  const saveTitles = (next: Record<string, string>) => {
    setTitles(next);
    try { localStorage.setItem(LS_TITLES, JSON.stringify(next)); } catch { /* noop */ }
  };

  const columns = useMemo<ColumnDef[]>(() => {
    return DEFAULT_COLUMNS.map((c) => ({
      ...c,
      title: titles[c.key] ?? c.title,
    }));
  }, [titles]);

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

  const activeLead = useMemo(
    () => leads.find((l) => l.id === activeId) ?? null,
    [leads, activeId],
  );

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LeadStatus }) => {
      const { error } = await supabase.from("leads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["leads"] });
      const snapshots = qc.getQueriesData({ queryKey: ["leads"] });
      snapshots.forEach(([key, data]) => {
        if (!Array.isArray(data)) return;
        qc.setQueryData(key, (data as KanbanLead[]).map((l) =>
          l.id === id ? { ...l, status } : l
        ));
      });
      return { snapshots };
    },
    onSuccess: () => {
      toast.success("Status yangilandi");
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e: Error, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error(e.message);
    },
  });

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    if (!e.over) return;
    const leadId = String(e.active.id);
    const colKey = String(e.over.id) as LeadStatus;
    const col = columns.find((c) => c.key === colKey);
    if (!col) return;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === col.status) return;
    updateStatus.mutate({ id: leadId, status: col.status });
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex gap-3 overflow-x-auto pb-3">
        {columns.map((col) => {
          const items = grouped.get(col.key) ?? [];
          return (
            <KanbanColumn key={col.key} colKey={col.key} accent={col.accent}>
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
                  <DraggableCard
                    key={l.id}
                    lead={l}
                    opName={l.assigned_to ? opMap.get(l.assigned_to) ?? null : null}
                    accent={col.accent}
                    dragging={activeId === l.id}
                    onStatusChange={(status) => updateStatus.mutate({ id: l.id, status })}
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
            </KanbanColumn>
          );
        })}
      </div>

      <DragOverlay>
        {activeLead ? (
          <CardBody
            lead={activeLead}
            opName={activeLead.assigned_to ? opMap.get(activeLead.assigned_to) ?? null : null}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({
  colKey, children, accent,
}: {
  colKey: string;
  children: React.ReactNode;
  accent?: "green" | "muted";
}) {
  const { setNodeRef, isOver } = useDroppable({ id: colKey });
  return (
    <div
      ref={setNodeRef}
      className={`shrink-0 w-[260px] border rounded-lg flex flex-col transition-colors ${
        isOver ? "bg-emerald-50 border-emerald-300" : "bg-slate-50"
      } ${accent === "green" ? "border-[#97C459]" : ""}`}
    >
      {children}
    </div>
  );
}

function DraggableCard({
  lead, opName, accent, dragging, onStatusChange,
}: {
  lead: KanbanLead;
  opName: string | null;
  accent?: "green" | "muted";
  dragging: boolean;
  onStatusChange: (status: LeadStatus) => void;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: lead.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={dragging ? "opacity-30" : ""}
    >
      <CardBody
        lead={lead}
        opName={opName}
        accent={accent}
        onStatusChange={onStatusChange}
      />
    </div>
  );
}

function CardBody({
  lead, opName, accent, onStatusChange,
}: {
  lead: KanbanLead;
  opName: string | null;
  accent?: "green" | "muted";
  onStatusChange?: (status: LeadStatus) => void;
}) {
  const borderClass =
    accent === "green" ? "border border-[#97C459]" :
    "border border-slate-200";
  const opacityClass = accent === "muted" ? "opacity-70" : "";

  const otherStatuses = STATUS_ORDER.filter((s) => s !== lead.status);

  return (
    <div className={`bg-white rounded-md ${borderClass} ${opacityClass} shadow-sm hover:shadow transition-shadow cursor-grab active:cursor-grabbing`}>
      <div className="px-3 py-2 flex items-start gap-2">
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="text-[13px] font-medium text-slate-900 truncate">{lead.full_name}</div>
          <div className="text-[11px] text-slate-600 truncate">📞 {lead.phone ?? "—"}</div>
          {lead.nomer_asosiy && (
            <div className="text-[11px] text-slate-500 truncate">📱 {lead.nomer_asosiy}</div>
          )}
          {lead.region && (
            <div className="text-[11px] text-slate-500 truncate">📍 {lead.region}</div>
          )}
          {lead.problem_type && (
            <div className="text-[11px] text-slate-500 line-clamp-2">💬 {lead.problem_type}</div>
          )}
          {lead.can_visit_clinic && (
            <div className="text-[11px] text-slate-500 truncate">
              🏥 {CAN_VISIT_LABEL[lead.can_visit_clinic]}
            </div>
          )}
          <div className="pt-1">
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

      {onStatusChange && (
        <div
          className="px-2 pb-2"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                onStatusChange(e.target.value as LeadStatus);
                (e.target as HTMLSelectElement).value = "";
              }
            }}
            className="w-full text-[11px] border border-slate-200 rounded px-2 py-1 text-slate-500 bg-slate-50 cursor-pointer hover:border-slate-300 focus:outline-none"
          >
            <option value="">→ Ko'chirish...</option>
            {otherStatuses.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>
      )}
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
    <div className="bg-white border rounded-md p-2 space-y-2">
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
