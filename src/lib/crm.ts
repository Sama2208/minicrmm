export type LeadStatus =
  | "yangi"
  | "boglanildi"
  | "qiziqdi"
  | "uchrashuvga_yozildi"
  | "keldi"
  | "kelmadi"
  | "mijozga_aylandi"
  | "yoqotildi";

export type LeadSource = "facebook" | "instagram" | "website" | "boshqa";

export const STATUS_LABEL: Record<LeadStatus, string> = {
  yangi: "Yangi",
  boglanildi: "Bog'lanildi",
  qiziqdi: "Qiziqdi",
  uchrashuvga_yozildi: "Uchrashuvga yozildi",
  keldi: "Keldi",
  kelmadi: "Kelmadi",
  mijozga_aylandi: "Mijozga aylandi",
  yoqotildi: "Yo'qotildi",
};

// Tailwind classes — light bg + colored text + border
export const STATUS_BADGE: Record<LeadStatus, string> = {
  yangi: "bg-blue-50 text-blue-700 border border-blue-200",
  boglanildi: "bg-sky-50 text-sky-700 border border-sky-200",
  qiziqdi: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  uchrashuvga_yozildi: "bg-violet-50 text-violet-700 border border-violet-200",
  keldi: "bg-teal-50 text-teal-700 border border-teal-200",
  kelmadi: "bg-amber-50 text-amber-700 border border-amber-200",
  mijozga_aylandi: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  yoqotildi: "bg-rose-50 text-rose-700 border border-rose-200",
};

export const STATUS_ORDER: LeadStatus[] = [
  "yangi",
  "boglanildi",
  "qiziqdi",
  "uchrashuvga_yozildi",
  "keldi",
  "kelmadi",
  "mijozga_aylandi",
  "yoqotildi",
];

export const SOURCE_LABEL: Record<LeadSource, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  website: "Sayt",
  boshqa: "Boshqa",
};

export const SOURCE_LIST: LeadSource[] = ["facebook", "instagram", "website", "boshqa"];

export const SOURCE_COLOR: Record<LeadSource, string> = {
  facebook: "#2563eb",
  instagram: "#db2777",
  website: "#059669",
  boshqa: "#6b7280",
};

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}.${mm}.${yy}`;
}
