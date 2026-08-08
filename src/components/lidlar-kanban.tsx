import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus,
  ChevronRight,
  Calendar,
  Trash2,
  
  
  Square,
  CheckSquare,
  Search,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

import {
  SOURCE_LABEL,
  SOURCE_LIST,
  CAN_VISIT_LABEL,
  STATUS_LABEL,
  formatDate,
  formatTime,
  type LeadStatus,
  type LeadSource,
  type CanVisitClinic,
} from "@/lib/crm";
import { downloadCsv, toCsv, type CsvColumn } from "@/lib/csv";
import {
  DEFAULT_COLUMNS,
  SOURCE_BADGE,
  opColor,
  initials,
  LS_TITLES,
  LS_EXTRA,
  
  LS_HIDDEN,
  type ColumnDef,
} from "@/lib/kanban";
import { useClinicId } from "@/lib/clinic";

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
  appointment_time: string | null;
  next_followup_date: string | null;
  created_at: string;
  last_contact_at: string | null;
};

export type KanbanOperator = { id: string; full_name: string };

type SlaLevel = "none" | "warn" | "danger";

function getSla(lead: { status: string; last_contact_at: string | null; created_at: string }): {
  level: SlaLevel;
  minutes: number;
} {
  if (lead.status !== "yangi" || lead.last_contact_at) return { level: "none", minutes: 0 };
  const minutes = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / 60000);
  if (minutes >= 20) return { level: "danger", minutes };
  if (minutes >= 10) return { level: "warn", minutes };
  return { level: "none", minutes };
}

function slaLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} daq javobsiz`;
  const h = Math.floor(minutes / 60);
  if (h < 24) return `${h} soat javobsiz`;
  return `${Math.floor(h / 24)} kun javobsiz`;
}

function ErtangiActions({ leadId }: { leadId: string }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const move = async (status: "bugungi_konsultatsiya" | "bekor_qilindi" | "konsultatsiyaga_yozildi") => {
    setSaving(true);
    await supabase.from("leads").update({ status }).eq("id", leadId);
    setSaving(false);
    qc.invalidateQueries({ queryKey: ["leads"] });
  };

  if (saving) return <div className="text-[10px] text-slate-400">Saqlanmoqda...</div>;

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); move("bugungi_konsultatsiya"); }}
        className="w-full text-[10px] font-medium py-1 px-2 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors text-left"
      >
        ✅ Ha keladi
      </button>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); move("konsultatsiyaga_yozildi"); }}
        className="w-full text-[10px] font-medium py-1 px-2 rounded bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors text-left"
      >
        📅 Kuni o'zgardi
      </button>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); move("bekor_qilindi"); }}
        className="w-full text-[10px] font-medium py-1 px-2 rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors text-left"
      >
        ❌ Bekor qildi
      </button>
    </div>
  );
}



export function LidlarKanban({
  leads,
  operators,
}: {
  leads: KanbanLead[];
  operators: KanbanOperator[];
}) {
  const qc = useQueryClient();
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [extras, setExtras] = useState<ColumnDef[]>([]);
  
  const [hidden, setHidden] = useState<string[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [addOpenCol, setAddOpenCol] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<KanbanLead | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<LeadSource | "all">("all");
  const [zoom, setZoom] = useState<number>(() => {
    try {
      return Number(localStorage.getItem("kanban_zoom")) || 100;
    } catch {
      return 100;
    }
  });
  const [compact, setCompact] = useState<boolean>(() => {
    try {
      return localStorage.getItem("kanban_compact") === "1";
    } catch {
      return false;
    }
  });

  const applyZoom = (v: number) => {
    setZoom(v);
    try {
      localStorage.setItem("kanban_zoom", String(v));
    } catch {
      /* noop */
    }
  };
  const toggleCompact = () => {
    setCompact((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("kanban_compact", next ? "1" : "0");
      } catch {
        /* noop */
      }
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const deleteSelected = useMutation({
    mutationFn: async () => {
      const ids = [...selectedIds];
      const { error } = await supabase.from("leads").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${selectedIds.size} ta lid o'chirildi`);
      setSelectedIds(new Set());
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    try {
      const t = localStorage.getItem(LS_TITLES);
      if (t) setTitles(JSON.parse(t));
      const e = localStorage.getItem(LS_EXTRA);
      if (e) setExtras(JSON.parse(e));
      const h = localStorage.getItem(LS_HIDDEN);
      if (h) setHidden(JSON.parse(h));
    } catch {
      /* noop */
    }
  }, []);

  const saveTitles = (next: Record<string, string>) => {
    setTitles(next);
    try {
      localStorage.setItem(LS_TITLES, JSON.stringify(next));
    } catch {
      /* noop */
    }
  };
  const saveExtras = (next: ColumnDef[]) => {
    setExtras(next);
    try {
      localStorage.setItem(LS_EXTRA, JSON.stringify(next));
    } catch {
      /* noop */
    }
  };
  const saveHidden = (next: string[]) => {
    setHidden(next);
    try {
      localStorage.setItem(LS_HIDDEN, JSON.stringify(next));
    } catch {
      /* noop */
    }
  };


  const columns = useMemo<ColumnDef[]>(() => {
    return [...DEFAULT_COLUMNS, ...extras]
      .filter((c) => !hidden.includes(c.key))
      .map((c) => ({
        ...c,
        title: titles[c.key] ?? c.title,
      }));
  }, [extras, titles, hidden]);


  const opMap = useMemo(() => {
    const m = new Map<string, string>();
    operators.forEach((o) => m.set(o.id, o.full_name));
    return m;
  }, [operators]);

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (sourceFilter !== "all" && l.source !== sourceFilter) return false;
      if (!q) return true;
      const haystack = [l.full_name, l.phone, l.nomer_asosiy, l.region]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [leads, search, sourceFilter]);

  const grouped = useMemo(() => {
    const m = new Map<string, KanbanLead[]>();
    columns.forEach((c) => m.set(c.key, []));
    filteredLeads.forEach((l) => {
      const col = columns.find((c) => c.status === l.status);
      if (col) m.get(col.key)!.push(l);
    });
    return m;
  }, [filteredLeads, columns]);

  const exportCsv = () => {
    const cols: CsvColumn<KanbanLead>[] = [
      { header: "Ism", value: (l) => l.full_name },
      { header: "Telefon", value: (l) => l.phone ?? l.nomer_asosiy },
      { header: "Viloyat", value: (l) => l.region },
      { header: "Manba", value: (l) => SOURCE_LABEL[l.source] ?? l.source },
      { header: "Holat", value: (l) => STATUS_LABEL[l.status] ?? l.status },
      { header: "Operator", value: (l) => (l.assigned_to ? (opMap.get(l.assigned_to) ?? "") : "") },
      { header: "Muammo", value: (l) => l.problem_type },
      { header: "Yaratilgan", value: (l) => formatDate(l.created_at) },
    ];
    const csv = toCsv(filteredLeads, cols);
    const today = new Date().toISOString().slice(0, 10);
    downloadCsv(`lidlar-${today}.csv`, csv);
  };

  const activeLead = useMemo(() => leads.find((l) => l.id === activeId) ?? null, [leads, activeId]);
  

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
        qc.setQueryData(
          key,
          (data as KanbanLead[]).map((l) => (l.id === id ? { ...l, status } : l)),
        );
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
    const activeStr = String(e.active.id);
    const overStr = String(e.over.id);

    // Lid harakatlantirish
    const col = columns.find((c) => c.key === overStr);
    if (!col || !col.status) return;
    const lead = leads.find((l) => l.id === activeStr);
    if (!lead || lead.status === col.status) return;
    updateStatus.mutate({ id: lead.id, status: col.status });
  };


  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ism, telefon yoki viloyat bo'yicha qidirish..."
            className="pl-8 h-9"
          />
        </div>
        <Select
          value={sourceFilter}
          onValueChange={(v) => setSourceFilter(v as LeadSource | "all")}
        >
          <SelectTrigger className="h-9 w-full sm:w-44">
            <SelectValue placeholder="Manba" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha manbalar</SelectItem>
            {SOURCE_LIST.map((s) => (
              <SelectItem key={s} value={s}>
                {SOURCE_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 shrink-0 border rounded-md px-2 h-9 bg-white">
          <button
            type="button"
            onClick={() => applyZoom(Math.max(30, zoom - 10))}
            className="text-slate-500 hover:text-slate-900 px-1 text-sm font-bold"
            title="Kichiklashtirish"
          >
            −
          </button>
          <span className="text-[11px] text-slate-500 w-9 text-center tabular-nums">{zoom}%</span>
          <button
            type="button"
            onClick={() => applyZoom(Math.min(130, zoom + 10))}
            className="text-slate-500 hover:text-slate-900 px-1 text-sm font-bold"
            title="Kattalashtirish"
          >
            +
          </button>
          <div className="w-px h-4 bg-slate-200 mx-1" />
          <button
            type="button"
            onClick={() => applyZoom(100)}
            className="text-[10px] text-slate-400 hover:text-slate-700 px-1"
            title="Asliga qaytarish"
          >
            ⟲
          </button>
        </div>
        <Button
          variant={compact ? "default" : "outline"}
          size="sm"
          onClick={toggleCompact}
          className={`h-9 gap-1.5 shrink-0 text-xs ${compact ? "bg-slate-700 hover:bg-slate-800" : ""}`}
          title="Kompakt rejim — kam ma'lumot, ko'p karta"
        >
          {compact ? "▤ Kompakt" : "▦ To'liq"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={exportCsv}
          disabled={filteredLeads.length === 0}
          className="h-9 gap-1.5 shrink-0"
        >
          <Download className="h-4 w-4" />
          CSV ({filteredLeads.length})
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div
          className="flex gap-3 overflow-x-auto pb-3 origin-top-left"
          style={{
            zoom: zoom / 100,
            ["--kanban-zoom" as string]: String(zoom / 100),
          }}
        >
          {columns.map((col) => {
            const items = grouped.get(col.key) ?? [];
            return (
              <KanbanColumn key={col.key} colKey={col.key} accent={col.accent}>
                <div className="flex items-center justify-between px-2 py-2 border-b">
                  <div className="flex items-start gap-1 min-w-0">

                    {editingKey === col.key && !col.locked ? (
                      <input
                        autoFocus
                        defaultValue={col.title}
                        className="text-[12px] font-medium text-slate-700 bg-white border rounded px-1 w-full"
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
                        className="text-[12px] font-medium text-slate-600 uppercase tracking-wide select-none leading-tight"

                        onDoubleClick={() => {
                          if (!col.locked) setEditingKey(col.key);
                        }}
                        title={
                          col.locked ? "Bu ustun qulflangan" : "Tahrirlash uchun ikki marta bosing"
                        }
                      >
                        {col.title}
                      </span>
                    )}
                  </div>
                  <div className="ml-2 shrink-0 flex items-center gap-1">
                    <span className="inline-flex items-center justify-center text-[11px] font-medium bg-slate-200 text-slate-700 rounded-full min-w-[20px] h-5 px-1.5">
                      {items.length}
                    </span>
                  </div>
                </div>

                <div
                  className="flex-1 overflow-y-auto p-2 space-y-2"
                  style={{
                    maxHeight: "calc((100vh - 260px) / var(--kanban-zoom, 1))",
                  }}
                >
                  {items.map((l) => (
                    <DraggableCard
                      key={l.id}
                      lead={l}
                      opName={l.assigned_to ? (opMap.get(l.assigned_to) ?? null) : null}
                      accent={col.accent}
                      dragging={activeId === l.id}
                      onDetail={setSelectedLead}
                      isSelected={selectedIds.has(l.id)}
                      onToggle={toggleSelect}
                      compact={compact}
                    />
                  ))}

                  {col.key === "yangi" &&
                    (addOpenCol === "yangi" ? (
                      <AddLeadMini onClose={() => setAddOpenCol(null)} />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAddOpenCol("yangi")}
                        className="w-full text-xs text-slate-600 hover:text-slate-900 border border-dashed rounded-md py-2 flex items-center justify-center gap-1 bg-white"
                      >
                        <Plus className="h-3.5 w-3.5" /> Lid qo'shish
                      </button>
                    ))}
                </div>
              </KanbanColumn>
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

        <DragOverlay>
          {activeLead ? (
            <CardBody
              lead={activeLead}
              opName={activeLead.assigned_to ? (opMap.get(activeLead.assigned_to) ?? null) : null}
            />
          ) : null}
        </DragOverlay>

      </DndContext>

      {selectedLead && (
        <LeadDetailDialog
          lead={selectedLead}
          open={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          operators={operators}
        />
      )}

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-white border border-slate-200 rounded-xl shadow-xl px-4 py-3">
          <span className="text-sm font-medium text-slate-700">
            {selectedIds.size} ta lid tanlandi
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedIds(new Set())}
            className="h-8 text-xs"
          >
            Bekor
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (
                !window.confirm(
                  `${selectedIds.size} ta lidni o'chirasizmi? Bu amalni qaytarib bo'lmaydi.`,
                )
              )
                return;
              deleteSelected.mutate();
            }}
            disabled={deleteSelected.isPending}
            className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            {deleteSelected.isPending ? "O'chirilmoqda..." : "O'chirish"}
          </Button>
        </div>
      )}
    </>
  );
}




function KanbanColumn({
  colKey,
  children,
  accent,
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
  lead,
  opName,
  accent,
  dragging,
  onDetail,
  isSelected,
  onToggle,
  compact,
}: {
  lead: KanbanLead;
  opName: string | null;
  accent?: "green" | "muted";
  dragging: boolean;
  onDetail: (lead: KanbanLead) => void;
  isSelected: boolean;
  onToggle: (id: string) => void;
  compact?: boolean;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: lead.id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={dragging ? "opacity-30" : ""}>
      <CardBody
        lead={lead}
        opName={opName}
        accent={accent}
        onDetail={onDetail}
        isSelected={isSelected}
        onToggle={onToggle}
        compact={compact}
      />
    </div>
  );
}

function CardBody({
  lead,
  opName,
  accent,
  onDetail,
  isSelected,
  onToggle,
  compact,
}: {
  lead: KanbanLead;
  opName: string | null;
  accent?: "green" | "muted";
  onDetail?: (lead: KanbanLead) => void;
  isSelected?: boolean;
  onToggle?: (id: string) => void;
  compact?: boolean;
}) {
  const borderClass = isSelected
    ? "border-2 border-red-400"
    : accent === "green"
      ? "border border-[#97C459]"
      : "border border-slate-200";
  const opacityClass = accent === "muted" ? "opacity-70" : "";

  const today = new Date().toISOString().split("T")[0];
  const isCallbackToday = lead.next_followup_date === today;
  const isCallbackOverdue = lead.next_followup_date && lead.next_followup_date < today;

  return (
    <div
      className={`bg-white rounded-md ${borderClass} ${opacityClass} shadow-sm hover:shadow transition-shadow ${isSelected ? "bg-red-50" : ""}`}
    >
      <div className={`${compact ? "px-2 py-1.5" : "px-3 py-2"} flex items-start gap-2`}>
        {onToggle && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(lead.id);
            }}
            className="mt-0.5 shrink-0 text-slate-300 hover:text-red-500 transition-colors"
            title="Tanlash"
          >
            {isSelected ? (
              <CheckSquare className="h-4 w-4 text-red-500" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </button>
        )}
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="text-[13px] font-medium text-slate-900 truncate">{lead.full_name}</div>
          <div className="text-[11px] text-slate-600 truncate">📞 {lead.phone ?? "—"}</div>
          {!compact && lead.nomer_asosiy && (
            <div className="text-[11px] text-slate-500 truncate">📱 {lead.nomer_asosiy}</div>
          )}
          {!compact && lead.region && (
            <div className="text-[11px] text-slate-500 truncate">📍 {lead.region}</div>
          )}
          {!compact && lead.problem_type && (
            <div className="text-[11px] text-slate-500 line-clamp-2">💬 {lead.problem_type}</div>
          )}
          {!compact && lead.can_visit_clinic && (
            <div className="text-[11px] text-slate-500 truncate">
              🏥 {CAN_VISIT_LABEL[lead.can_visit_clinic]}
            </div>
          )}
          {/* Notes indicator */}
          {!compact && lead.notes && (
            <div className="text-[10px] text-slate-400 line-clamp-1 italic">📝 {lead.notes}</div>
          )}
          {/* Konsultatsiya sanasi */}
          {lead.appointment_date && (
            <div className="text-[10px] font-medium flex items-center gap-0.5 text-emerald-600">
              <Calendar className="h-3 w-3" />
              Konsultatsiya: {formatDate(lead.appointment_date)}
              {lead.appointment_time && ` ${formatTime(lead.appointment_time)}`}
            </div>
          )}
          {/* Callback date */}
          {lead.next_followup_date && (
            <div
              className={`text-[10px] font-medium flex items-center gap-0.5 ${
                isCallbackOverdue
                  ? "text-red-500"
                  : isCallbackToday
                    ? "text-amber-600"
                    : "text-slate-400"
              }`}
            >
              <Calendar className="h-3 w-3" />
              {isCallbackToday
                ? "Bugun qo'ng'iroq!"
                : isCallbackOverdue
                  ? `O'tib ketgan: ${formatDate(lead.next_followup_date)}`
                  : formatDate(lead.next_followup_date)}
            </div>
          )}
          {/* Ertangi konsultatsiya — kelish holati */}
          {lead.status === "ertangi_konsultatsiya" && onDetail && (
            <div className="mt-2 pt-2 border-t border-cyan-100 space-y-1.5">
              <div className="text-[10px] font-semibold text-cyan-700 mb-1">Konsultatsiyaga keladi?</div>
              <ErtangiActions leadId={lead.id} />
            </div>
          )}
          <div className="pt-1">
            <span
              className={`inline-block text-[10px] px-1.5 py-0.5 rounded ${SOURCE_BADGE[lead.source]}`}
            >
              {SOURCE_LABEL[lead.source]}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1 shrink-0">
          {lead.assigned_to && (
            <div
              className={`h-6 w-6 rounded-full text-white text-[10px] font-semibold flex items-center justify-center ${opColor(lead.assigned_to)}`}
              title={opName ?? ""}
            >
              {initials(opName ?? "?")}
            </div>
          )}
          {onDetail && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onDetail(lead);
              }}
              className="h-5 w-5 rounded flex items-center justify-center text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="Batafsil / Tahrirlash"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}




// ─── Lead Detail Dialog ────────────────────────────────────────────────────────

function LeadDetailDialog({
  lead,
  open,
  onClose,
  operators,
}: {
  lead: KanbanLead;
  open: boolean;
  onClose: () => void;
  operators: KanbanOperator[];
}) {
  const qc = useQueryClient();
  const [fullName, setFullName] = useState(lead.full_name);
  const [phone, setPhone] = useState(lead.phone ?? "");
  const [nomerAsosiy, setNomerAsosiy] = useState(lead.nomer_asosiy ?? "");
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [nextFollowup, setNextFollowup] = useState(
    lead.next_followup_date ? lead.next_followup_date.split("T")[0] : "",
  );
  const [assignedTo, setAssignedTo] = useState(lead.assigned_to ?? "__none__");
  const [appointmentDate, setAppointmentDate] = useState(
    lead.appointment_date ? lead.appointment_date.split("T")[0] : "",
  );
  const [appointmentTime, setAppointmentTime] = useState(formatTime(lead.appointment_time));

  // Sync state when lead changes
  const [prevId, setPrevId] = useState(lead.id);
  if (lead.id !== prevId) {
    setPrevId(lead.id);
    setFullName(lead.full_name);
    setPhone(lead.phone ?? "");
    setNomerAsosiy(lead.nomer_asosiy ?? "");
    setNotes(lead.notes ?? "");
    setNextFollowup(lead.next_followup_date ? lead.next_followup_date.split("T")[0] : "");
    setAssignedTo(lead.assigned_to ?? "__none__");
    setAppointmentDate(lead.appointment_date ? lead.appointment_date.split("T")[0] : "");
    setAppointmentTime(formatTime(lead.appointment_time));
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!fullName.trim()) throw new Error("Ism bo'sh bo'lishi mumkin emas");
      const { error } = await supabase
        .from("leads")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          nomer_asosiy: nomerAsosiy.trim() || null,
          notes: notes.trim() || null,
          next_followup_date: nextFollowup || null,
          appointment_date: appointmentDate || null,
          appointment_time: appointmentDate ? appointmentTime || null : null,
          assigned_to: assignedTo && assignedTo !== "__none__" ? assignedTo : null,
        })
        .eq("id", lead.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Saqlandi ✓");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Lid ma'lumotlari</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {/* Editable fields */}
          <div>
            <Label className="text-xs font-medium text-slate-600">Ism va familiya</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 h-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs font-medium text-slate-600">Telefon</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998..."
                className="mt-1 h-9"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600">Raqam 2</Label>
              <Input
                value={nomerAsosiy}
                onChange={(e) => setNomerAsosiy(e.target.value)}
                placeholder="+998..."
                className="mt-1 h-9"
              />
            </div>
          </div>

          {/* Read-only info */}
          {(lead.region || lead.problem_type || lead.can_visit_clinic) && (
            <div className="bg-slate-50 rounded-md p-2.5 space-y-1 text-[12px] text-slate-600">
              {lead.region && <div>📍 {lead.region}</div>}
              {lead.problem_type && <div>💬 {lead.problem_type}</div>}
              {lead.can_visit_clinic && <div>🏥 {CAN_VISIT_LABEL[lead.can_visit_clinic]}</div>}
            </div>
          )}

          {/* Notes */}
          <div>
            <Label className="text-xs font-medium text-slate-600">Izoh / Eslatma</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Qo'ng'iroq natijalari, kelishuvlar, eslatmalar..."
              rows={4}
              className="mt-1 text-sm resize-none"
            />
          </div>

          {/* Operator */}
          {operators.length > 0 && (
            <div>
              <Label className="text-xs font-medium text-slate-600">Operator</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue placeholder="Operator tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Belgilanmagan —</SelectItem>
                  {operators.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Konsultatsiya sanasi */}
          <div>
            <Label className="text-xs font-medium text-slate-600 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Konsultatsiya sanasi
            </Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <Input
                type="date"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="h-9"
              />
              <Input
                type="time"
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
                className="h-9"
                disabled={!appointmentDate}
              />
            </div>
            {appointmentDate && (
              <button
                type="button"
                onClick={() => {
                  setAppointmentDate("");
                  setAppointmentTime("");
                }}
                className="text-[11px] text-slate-400 hover:text-red-500 mt-1"
              >
                × Sanani o'chirish
              </button>
            )}
          </div>

          {/* Callback date */}
          <div>
            <Label className="text-xs font-medium text-slate-600 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Qayta qo'ng'iroq sanasi
            </Label>
            <Input
              type="date"
              value={nextFollowup}
              onChange={(e) => setNextFollowup(e.target.value)}
              className="mt-1 h-9"
            />
            {nextFollowup && (
              <button
                type="button"
                onClick={() => setNextFollowup("")}
                className="text-[11px] text-slate-400 hover:text-red-500 mt-1"
              >
                × Sanani o'chirish
              </button>
            )}
          </div>

          <div className="text-[11px] text-slate-400">
            Yaratilgan: {formatDate(lead.created_at)}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Bekor
          </Button>
          <Button
            size="sm"
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

// ─── Add Lead Mini (Yangi ustunda) ────────────────────────────────────────────

function AddLeadMini({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const clinicQ = useClinicId();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState<LeadSource>("boshqa");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!fullName.trim()) {
      toast.error("Ism kiritilishi shart");
      return;
    }
    if (!clinicQ.data) {
      toast.error("Klinika aniqlanmadi");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("leads").insert({
      full_name: fullName.trim(),
      phone: phone || null,
      source,
      status: "yangi",
      clinic_id: clinicQ.data,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Lid qo'shildi");
    qc.invalidateQueries({ queryKey: ["leads"] });
    onClose();
  };

  return (
    <div className="bg-white border rounded-md p-2 space-y-2">
      <Input
        autoFocus
        placeholder="Ism familiya"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        className="h-8 text-xs"
      />
      <Input
        placeholder="Telefon"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="h-8 text-xs"
      />
      <Select value={source} onValueChange={(v) => setSource(v as LeadSource)}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SOURCE_LIST.map((s) => (
            <SelectItem key={s} value={s}>
              {SOURCE_LABEL[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex gap-1">
        <Button
          size="sm"
          className="h-7 text-xs flex-1 bg-emerald-600 hover:bg-emerald-700"
          onClick={save}
          disabled={saving}
        >
          Saqlash
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onClose}>
          Bekor
        </Button>
      </div>
    </div>
  );
}
