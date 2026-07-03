import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Clock, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { buildMonthGrid, groupByDateKey, toDateKey, type CalendarDay } from "@/lib/calendar";
import { STATUS_LABEL, STATUS_ORDER, formatTime, type LeadStatus } from "@/lib/crm";

export const Route = createFileRoute("/_authenticated/kalendar")({ component: KalendarPage });

const WEEKDAY_LABELS = ["Dush", "Sesh", "Chor", "Pay", "Juma", "Shan", "Yak"];
const MONTH_LABELS = [
  "Yanvar",
  "Fevral",
  "Mart",
  "Aprel",
  "May",
  "Iyun",
  "Iyul",
  "Avgust",
  "Sentabr",
  "Oktabr",
  "Noyabr",
  "Dekabr",
];

type CalendarLead = {
  id: string;
  full_name: string;
  phone: string | null;
  status: LeadStatus;
  appointment_date: string | null;
  appointment_time: string | null;
  assigned_to: string | null;
  notes: string | null;
};

type Operator = { id: string; full_name: string };

function KalendarPage() {
  const today = useMemo(() => new Date(), []);
  const [monthCursor, setMonthCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedKey, setSelectedKey] = useState(() => toDateKey(today));
  const [editingLead, setEditingLead] = useState<CalendarLead | null>(null);

  const leadsQ = useQuery({
    queryKey: ["leads-calendar"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select(
          "id, full_name, phone, status, appointment_date, appointment_time, assigned_to, notes",
        )
        .not("appointment_date", "is", null)
        .order("appointment_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CalendarLead[];
    },
  });

  const opsQ = useQuery({
    queryKey: ["operators"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operators")
        .select("id, full_name")
        .order("full_name");
      if (error) throw error;
      return data as Operator[];
    },
  });

  const opMap = useMemo(() => {
    const m = new Map<string, string>();
    (opsQ.data ?? []).forEach((o) => m.set(o.id, o.full_name));
    return m;
  }, [opsQ.data]);

  const grid = useMemo(
    () => buildMonthGrid(monthCursor.getFullYear(), monthCursor.getMonth(), today),
    [monthCursor, today],
  );

  const byDate = useMemo(
    () => groupByDateKey(leadsQ.data ?? [], (l) => l.appointment_date),
    [leadsQ.data],
  );

  const selectedLeads = useMemo(() => {
    const list = byDate.get(selectedKey) ?? [];
    return [...list].sort((a, b) =>
      (a.appointment_time ?? "99:99").localeCompare(b.appointment_time ?? "99:99"),
    );
  }, [byDate, selectedKey]);

  function goToMonth(delta: number) {
    setMonthCursor((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  function goToToday() {
    setMonthCursor(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedKey(toDateKey(today));
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">
            {MONTH_LABELS[monthCursor.getMonth()]} {monthCursor.getFullYear()}
          </h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goToMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={goToToday}>
              Bugun
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goToMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-lg overflow-hidden border">
          {WEEKDAY_LABELS.map((w) => (
            <div
              key={w}
              className="bg-slate-50 text-center text-[11px] font-medium text-slate-500 py-1.5"
            >
              {w}
            </div>
          ))}
          {grid.map((day) => (
            <DayCell
              key={day.key}
              day={day}
              leads={byDate.get(day.key) ?? []}
              isSelected={day.key === selectedKey}
              onSelect={() => setSelectedKey(day.key)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-semibold text-slate-800">
          {selectedKey === toDateKey(today) ? "Bugungi qabullar" : `${selectedKey} — qabullar`}
        </h2>
        {leadsQ.isLoading ? (
          <div className="text-sm text-slate-500 py-8 text-center">Yuklanmoqda...</div>
        ) : selectedLeads.length === 0 ? (
          <div className="text-sm text-slate-400 py-8 text-center border rounded-lg bg-slate-50">
            Bu kunga qabul yozilmagan
          </div>
        ) : (
          <div className="space-y-2">
            {selectedLeads.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setEditingLead(l)}
                className="w-full text-left bg-white border rounded-lg px-3 py-2 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-900 truncate">{l.full_name}</span>
                  {l.appointment_time && (
                    <span className="text-xs text-emerald-700 font-medium flex items-center gap-1 shrink-0">
                      <Clock className="h-3 w-3" />
                      {formatTime(l.appointment_time)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className="text-xs text-slate-500 flex items-center gap-1 truncate">
                    <Phone className="h-3 w-3" />
                    {l.phone ?? "—"}
                  </span>
                  <span className="text-[11px] text-slate-400 truncate">
                    {l.assigned_to ? (opMap.get(l.assigned_to) ?? "") : ""}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">{STATUS_LABEL[l.status]}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {editingLead && (
        <EditAppointmentDialog lead={editingLead} onClose={() => setEditingLead(null)} />
      )}
    </div>
  );
}

function DayCell({
  day,
  leads,
  isSelected,
  onSelect,
}: {
  day: CalendarDay;
  leads: CalendarLead[];
  isSelected: boolean;
  onSelect: () => void;
}) {
  const visible = leads.slice(0, 2);
  const extra = leads.length - visible.length;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`min-h-[86px] bg-white p-1.5 text-left flex flex-col gap-0.5 transition-colors ${
        !day.inCurrentMonth ? "opacity-40" : ""
      } ${isSelected ? "ring-2 ring-inset ring-emerald-500" : ""}`}
    >
      <span
        className={`text-xs font-medium h-5 w-5 flex items-center justify-center rounded-full ${
          day.isToday ? "bg-emerald-600 text-white" : "text-slate-600"
        }`}
      >
        {day.date.getDate()}
      </span>
      <div className="flex-1 space-y-0.5">
        {visible.map((l) => (
          <div
            key={l.id}
            className="text-[10px] leading-tight bg-emerald-50 text-emerald-700 rounded px-1 py-0.5 truncate"
          >
            {l.appointment_time ? `${formatTime(l.appointment_time)} ` : ""}
            {l.full_name}
          </div>
        ))}
        {extra > 0 && <div className="text-[10px] text-slate-400 px-1">+{extra} ko'proq</div>}
      </div>
    </button>
  );
}

function EditAppointmentDialog({ lead, onClose }: { lead: CalendarLead; onClose: () => void }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [date, setDate] = useState(lead.appointment_date ?? "");
  const [time, setTime] = useState(formatTime(lead.appointment_time));
  const [notes, setNotes] = useState(lead.notes ?? "");

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("leads")
        .update({
          status,
          appointment_date: date || null,
          appointment_time: time || null,
          notes: notes.trim() || null,
        })
        .eq("id", lead.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saqlandi");
      qc.invalidateQueries({ queryKey: ["leads-calendar"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{lead.full_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-slate-500 flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5" />
            {lead.phone ?? "—"}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Sana</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Vaqt</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Holat</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as LeadStatus)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Izoh</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Bekor
          </Button>
          <Button
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
