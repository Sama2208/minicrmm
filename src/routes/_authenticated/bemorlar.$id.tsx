import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Phone, MapPin, Calendar as CalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/bemorlar/$id")({
  component: PatientDetailPage,
});

type Patient = {
  id: string;
  mrn: string;
  full_name: string;
  phone: string | null;
  region: string | null;
  status: string;
  gender: string | null;
  birth_date: string | null;
  notes: string | null;
  created_at: string;
};

type Appointment = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  reason: string | null;
  doctor: { full_name: string } | null;
};

const APPT_STATUS_LABEL: Record<string, string> = {
  scheduled: "Rejalashtirilgan",
  confirmed: "Tasdiqlangan",
  checked_in: "Kelgan",
  in_progress: "Jarayonda",
  completed: "Yakunlangan",
  cancelled: "Bekor qilingan",
  no_show: "Kelmadi",
};

const APPT_BADGE: Record<string, string> = {
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  checked_in: "bg-indigo-50 text-indigo-700 border-indigo-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-slate-100 text-slate-700 border-slate-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  no_show: "bg-red-50 text-red-700 border-red-200",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
}

function PatientDetailPage() {
  const { id } = Route.useParams();

  const patientQ = useQuery({
    queryKey: ["patient", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, mrn, full_name, phone, region, status, gender, birth_date, notes, created_at")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Patient | null;
    },
  });

  const apptsQ = useQuery({
    queryKey: ["patient-appointments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, starts_at, ends_at, status, reason, doctor:doctors(full_name)")
        .eq("patient_id", id)
        .is("deleted_at", null)
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Appointment[];
    },
  });

  if (patientQ.isLoading) {
    return <div className="text-slate-400 text-sm">Yuklanmoqda...</div>;
  }
  if (!patientQ.data) {
    return (
      <div className="space-y-3">
        <p className="text-slate-500">Bemor topilmadi.</p>
        <Button asChild variant="outline">
          <Link to="/bemorlar">Ro'yxatga qaytish</Link>
        </Button>
      </div>
    );
  }

  const p = patientQ.data;

  return (
    <div className="space-y-5 max-w-4xl">
      <Button asChild variant="ghost" size="sm" className="gap-2 -ml-2">
        <Link to="/bemorlar">
          <ArrowLeft className="h-4 w-4" /> Bemorlar
        </Link>
      </Button>

      <div className="rounded-xl border bg-white p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="text-xs font-mono text-slate-400">{p.mrn}</div>
            <h2 className="text-xl font-semibold mt-1">{p.full_name}</h2>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
              {p.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-4 w-4" /> {p.phone}
                </span>
              )}
              {p.region && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" /> {p.region}
                </span>
              )}
              {p.birth_date && (
                <span className="flex items-center gap-1.5">
                  <CalIcon className="h-4 w-4" /> {formatDate(p.birth_date)}
                </span>
              )}
            </div>
          </div>
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${
              p.status === "active"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-slate-100 text-slate-600 border-slate-200"
            }`}
          >
            {p.status}
          </span>
        </div>
        {p.notes && (
          <div className="mt-4 pt-4 border-t text-sm text-slate-600 whitespace-pre-wrap">
            {p.notes}
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="font-semibold">Qabullar</h3>
          <span className="text-xs text-slate-500">
            {apptsQ.data?.length ?? 0} ta
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Sana</th>
                <th className="text-left px-4 py-2.5 font-medium">Vaqt</th>
                <th className="text-left px-4 py-2.5 font-medium">Doktor</th>
                <th className="text-left px-4 py-2.5 font-medium">Holat</th>
                <th className="text-left px-4 py-2.5 font-medium">Sabab</th>
              </tr>
            </thead>
            <tbody>
              {apptsQ.isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    Yuklanmoqda...
                  </td>
                </tr>
              )}
              {!apptsQ.isLoading && (apptsQ.data?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    Qabullar yo'q
                  </td>
                </tr>
              )}
              {apptsQ.data?.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="px-4 py-2.5">{formatDate(a.starts_at)}</td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {formatTime(a.starts_at)} – {formatTime(a.ends_at)}
                  </td>
                  <td className="px-4 py-2.5">{a.doctor?.full_name ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${
                        APPT_BADGE[a.status] ?? "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {APPT_STATUS_LABEL[a.status] ?? a.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{a.reason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
