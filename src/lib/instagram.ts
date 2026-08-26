// Instagram Direct uchun sof (server/klientdan mustaqil) yordamchilar.
// Bu yerda faqat matn bilan ishlaydigan mantiq — testlanadi.

import { normalizeUzPhone } from "./phone";

/**
 * Direct xabari matnidan telefon raqamini ajratib oladi va E.164 (+998...)
 * ko'rinishiga keltiradi. Topilmasa null.
 */
export function extractPhoneFromText(text: string | null | undefined): string | null {
  if (!text) return null;

  // Raqam, +, bo'shliq, tire va qavslardan iborat bo'laklarni qidiramiz.
  const candidates = text.match(/\+?[\d][\d\s\-()]{7,}/g);
  if (!candidates) return null;

  for (const raw of candidates) {
    const normalized = normalizeUzPhone(raw);
    if (normalized) return normalized;
  }
  return null;
}

/** Direct suhbati uchun lid ismini shakllantiradi. */
export function instagramLeadName(username: string | null | undefined): string {
  const clean = username?.trim().replace(/^@/, "");
  return clean ? `@${clean}` : "Instagram Direct";
}

/** Suhbat ro'yxatida ko'rsatiladigan qisqa oldindan ko'rinish matni. */
export function messagePreview(text: string | null | undefined, max = 120): string {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return "📎 Media";
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}
