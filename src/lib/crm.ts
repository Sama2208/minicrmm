export type LeadStatus =
  | "yangi"
  | "prioritet"
  | "qayta_aloqa"
  | "malumot_oldi"
  | "instagram_direct"
  | "konsultatsiyaga_yozildi"
  | "viloyatga_qabul"
  | "ertangi_konsultatsiya"
  | "bugungi_konsultatsiya"
  | "konsultatsiyaga_kelmadi"
  | "konsultatsiyaga_keldi"
  | "yotdi"
  | "qatnadi"
  | "bekor_qilindi"
  | "sifatsiz";

export type LeadSource = "facebook" | "instagram" | "telegram" | "friends" | "website" | "boshqa";

export type CanVisitClinic = "ha" | "yoq" | "bilmayman";

export const STATUS_LABEL: Record<LeadStatus, string> = {
  yangi: "Yangi lid",
  prioritet: "Prioritet",
  qayta_aloqa: "Qayta aloqa",
  malumot_oldi: "Ma'lumot oldi",
  instagram_direct: "Direct",
  konsultatsiyaga_yozildi: "Konsultatsiyaga yozildi",
  viloyatga_qabul: "Viloyatga qabul",
  ertangi_konsultatsiya: "Ertangi konsultatsiya",
  bugungi_konsultatsiya: "Bugungi konsultatsiya",
  konsultatsiyaga_kelmadi: "Konsultatsiyaga kelmadi",
  konsultatsiyaga_keldi: "Konsultatsiyaga keldi",
  yotdi: "Yotdi",
  qatnadi: "Qatnadi",
  bekor_qilindi: "Bekor qilindi",
  sifatsiz: "Sifatsiz lid",
};

export const STATUS_BADGE: Record<LeadStatus, string> = {
  yangi: "bg-blue-50 text-blue-700 border border-blue-200",
  prioritet: "bg-red-50 text-red-700 border border-red-200",
  qayta_aloqa: "bg-orange-50 text-orange-700 border border-orange-200",
  malumot_oldi: "bg-purple-50 text-purple-700 border border-purple-200",
  instagram_direct: "bg-pink-50 text-pink-700 border border-pink-200",
  konsultatsiyaga_yozildi: "bg-violet-50 text-violet-700 border border-violet-200",
  viloyatga_qabul: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  ertangi_konsultatsiya: "bg-cyan-50 text-cyan-700 border border-cyan-200",
  bugungi_konsultatsiya: "bg-sky-50 text-sky-700 border border-sky-200",
  konsultatsiyaga_kelmadi: "bg-rose-50 text-rose-700 border border-rose-200",
  konsultatsiyaga_keldi: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  yotdi: "bg-green-50 text-green-700 border border-green-200",
  qatnadi: "bg-teal-50 text-teal-700 border border-teal-200",
  bekor_qilindi: "bg-slate-100 text-slate-600 border border-slate-200",
  sifatsiz: "bg-gray-100 text-gray-500 border border-gray-200",
};

export const STATUS_ORDER: LeadStatus[] = [
  "yangi",
  "prioritet",
  "qayta_aloqa",
  "malumot_oldi",
  "instagram_direct",
  "konsultatsiyaga_yozildi",
  "viloyatga_qabul",
  "ertangi_konsultatsiya",
  "bugungi_konsultatsiya",
  "konsultatsiyaga_kelmadi",
  "konsultatsiyaga_keldi",
  "yotdi",
  "qatnadi",
  "bekor_qilindi",
  "sifatsiz",
];

export const CAN_VISIT_LABEL: Record<CanVisitClinic, string> = {
  ha: "Ha kela olaman",
  yoq: "Yo'q bora olmayman",
  bilmayman: "Vaziyatga qarab, o'ylab ko'raman",
};

export const CAN_VISIT_BADGE: Record<CanVisitClinic, string> = {
  ha: "bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md px-2 py-0.5 text-xs font-medium inline-block",
  yoq: "bg-rose-50 text-rose-700 border border-rose-200 rounded-md px-2 py-0.5 text-xs font-medium inline-block",
  bilmayman: "bg-amber-50 text-amber-700 border border-amber-200 rounded-md px-2 py-0.5 text-xs font-medium inline-block",
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

export function formatTime(time: string | null | undefined): string {
  if (!time) return "";
  return time.slice(0, 5);
}
