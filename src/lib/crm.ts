export type LeadStatus =
  | "yangi"
  | "kotarmadi"
  | "sifatsiz_lid"
  | "maslahat"
  | "konsultatsiyaga_yozildi"
  | "yotishga_yozildi"
  | "qatnashga_yozildi"
  | "konsultatsiyada_boldi"
  | "yotdi"
  | "qatnadi";

export type LeadSource = "facebook" | "instagram" | "telegram" | "friends" | "website" | "boshqa";

export type CanVisitClinic = "ha" | "yoq" | "bilmayman";

export const STATUS_LABEL: Record<LeadStatus, string> = {
  yangi: "Yangi lid",
  kotarmadi: "Ko'tarmadi",
  sifatsiz_lid: "Sifatsiz",
  maslahat: "Maslahat",
  konsultatsiyaga_yozildi: "Konsultatsiyaga yozildi",
  yotishga_yozildi: "Yotishga yozildi",
  qatnashga_yozildi: "Qatnashga yozildi",
  konsultatsiyada_boldi: "Konsultatsiyaga keldi",
  yotdi: "Yotdi",
  qatnadi: "Qatnadi",
};

export const STATUS_BADGE: Record<LeadStatus, string> = {
  yangi: "bg-blue-50 text-blue-700 border border-blue-200",
  kotarmadi: "bg-orange-50 text-orange-700 border border-orange-200",
  sifatsiz_lid: "bg-rose-50 text-rose-700 border border-rose-200",
  maslahat: "bg-purple-50 text-purple-700 border border-purple-200",
  konsultatsiyaga_yozildi: "bg-violet-50 text-violet-700 border border-violet-200",
  yotishga_yozildi: "bg-amber-50 text-amber-700 border border-amber-200",
  qatnashga_yozildi: "bg-cyan-50 text-cyan-700 border border-cyan-200",
  konsultatsiyada_boldi: "bg-sky-50 text-sky-700 border border-sky-200",
  yotdi: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  qatnadi: "bg-teal-50 text-teal-700 border border-teal-200",
};

export const STATUS_ORDER: LeadStatus[] = [
  "yangi",
  "kotarmadi",
  "sifatsiz_lid",
  "maslahat",
  "konsultatsiyaga_yozildi",
  "yotishga_yozildi",
  "qatnashga_yozildi",
  "konsultatsiyada_boldi",
  "yotdi",
  "qatnadi",
];

export const CAN_VISIT_LABEL: Record<CanVisitClinic, string> = {
  ha: "Ha kela olaman",
  yoq: "Yo'q bora olmayman",
  bilmayman: "Vaziyatga qarab, o'ylab ko'raman",
};

export const CAN_VISIT_BADGE: Record<CanVisitClinic, string> = {
  ha: "bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md px-2 py-0.5 text-xs font-medium inline-block",
  yoq: "bg-rose-50 text-rose-700 border border-rose-200 rounded-md px-2 py-0.5 text-xs font-medium inline-block",
  bilmayman:
    "bg-amber-50 text-amber-700 border border-amber-200 rounded-md px-2 py-0.5 text-xs font-medium inline-block",
};

export const CONVERSION_STATUS: LeadStatus = "yotdi";

export const SOURCE_LABEL: Record<LeadSource, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  telegram: "Telegram",
  friends: "Do'stlar orqali",
  website: "Sayt",
  boshqa: "Boshqa",
};

export const SOURCE_LIST: LeadSource[] = [
  "facebook",
  "instagram",
  "telegram",
  "friends",
  "website",
  "boshqa",
];

export const SOURCE_COLOR: Record<LeadSource, string> = {
  facebook: "#2563eb",
  instagram: "#db2777",
  telegram: "#0ea5e9",
  friends: "#8b5cf6",
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

// Postgres `time` ustuni "HH:MM:SS" ko'rinishida qaytadi — UI uchun "HH:MM".
export function formatTime(time: string | null | undefined): string {
  if (!time) return "";
  return time.slice(0, 5);
}
