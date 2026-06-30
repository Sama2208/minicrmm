// O'zbekiston telefon raqamlari uchun normallashtirish va validatsiya.
//
// Qabul qilinadigan ko'rinishlar (hammasi bir xil natijaga keladi):
//   +998 90 123 45 67
//   998901234567
//   90 123 45 67
//   901234567
// Natija har doim E.164 formatida: +998901234567

const UZ_COUNTRY_CODE = "998";
const UZ_NATIONAL_DIGITS = 9; // mamlakat kodisiz milliy raqam uzunligi

/** Raqamdan tashqari hamma belgini olib tashlaydi. */
export function stripPhone(input: string): string {
  return input.replace(/\D+/g, "");
}

/**
 * Kiritilgan raqamni E.164 (+998XXXXXXXXX) formatiga keltiradi.
 * Agar raqamni o'zbek raqami sifatida tushunib bo'lmasa, null qaytaradi.
 */
export function normalizeUzPhone(input: string): string | null {
  let digits = stripPhone(input);
  if (!digits) return null;

  // 8 bilan boshlangan ichki format (8 XX XXX XX XX) — yetakchi 8 ni olib tashlaymiz.
  if (digits.length === UZ_NATIONAL_DIGITS + 1 && digits.startsWith("8")) {
    digits = digits.slice(1);
  }

  // Milliy format (9 ta raqam) — mamlakat kodini qo'shamiz.
  if (digits.length === UZ_NATIONAL_DIGITS) {
    digits = UZ_COUNTRY_CODE + digits;
  }

  // 998 bilan boshlanib, to'liq uzunlikka ega bo'lishi shart.
  if (digits.length !== UZ_COUNTRY_CODE.length + UZ_NATIONAL_DIGITS) return null;
  if (!digits.startsWith(UZ_COUNTRY_CODE)) return null;

  return "+" + digits;
}

/** Raqam haqiqiy o'zbek raqami ekanini tekshiradi. */
export function isValidUzPhone(input: string): boolean {
  return normalizeUzPhone(input) !== null;
}

/**
 * Raqamni o'qishga qulay ko'rinishda formatlaydi: +998 90 123 45 67.
 * Noto'g'ri raqam bo'lsa kiritilgan qiymatni o'zgartirmay qaytaradi.
 */
export function formatUzPhone(input: string): string {
  const normalized = normalizeUzPhone(input);
  if (!normalized) return input;
  const d = normalized.slice(1); // 998901234567
  return `+${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10, 12)}`;
}
