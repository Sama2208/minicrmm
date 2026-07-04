export type FacebookFieldDatum = { name: string; values: string[] };

export type ExtractedFacebookLead = {
  fullName: string | null;
  phone: string | null;
  email: string | null;
  nomerAsosiy: string | null;
  problemType: string | null;
};

// Meta Lead Ads (Instant Forms) `field_data` massivini bizga kerakli
// maydonlarga aylantiradi. Forma nomlari klinikadan klinikaga farq qilishi
// mumkin (full_name yoki first_name+last_name), shuning uchun ikkalasi ham
// qo'llab-quvvatlanadi.
//
// "Doimiy forma" custom maydon nomlari:
//   ism → "full name" (bo'sh joy bilan, underscore emas)
//   asosiy telefon → "telefon_raqamingizni_kiriting!"
//   Facebook profile telefoni → "номер_телефона"
//   muammo turi → "qaysi_turdagi_kasallik_sizni_bezovta_qiladi?"
export function extractFacebookLeadFields(fieldData: FacebookFieldDatum[]): ExtractedFacebookLead {
  const get = (name: string): string | null => {
    const field = fieldData.find((f) => f.name === name);
    return field?.values?.[0]?.trim() || null;
  };

  // Ism: standard maydonlar + "Doimiy forma" custom maydoni
  const fullName =
    get("full_name") ||
    get("full name") ||
    [get("first_name"), get("last_name")].filter(Boolean).join(" ").trim() ||
    null;

  // Asosiy telefon: foydalanuvchi o'zi kiritgan raqam ustunlik qiladi
  const phone =
    get("telefon_raqamingizni_kiriting!") ||
    get("phone_number") ||
    null;

  // Ikkinchi telefon: Facebook profilidan avtomatik to'ldirilgan
  const nomerAsosiy = get("номер_телефона") || null;

  // Kasallik turi — leads.problem_type ga saqlanadi
  const problemType = get("qaysi_turdagi_kasallik_sizni_bezovta_qiladi?") || null;

  return {
    fullName: fullName || null,
    phone,
    email: get("email"),
    nomerAsosiy,
    problemType,
  };
}
