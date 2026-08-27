export type FacebookFieldDatum = { name: string; values: string[] };

export type FacebookLeadAnswer = {
  question: string;
  answer: string;
};

export type ExtractedFacebookLead = {
  fullName: string | null;
  phone: string | null;
  email: string | null;
  nomerAsosiy: string | null;
  region: string | null;
  problemType: string | null;
  answers: FacebookLeadAnswer[];
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
  const normalizeKey = (value: string) =>
    value
      .trim()
      .toLocaleLowerCase()
      .replace(/ё/g, "е")
      .replace(/[!?():,.;_\-]+/g, " ")
      .replace(/\s+/g, " ");

  const fields = fieldData
    .map((field) => ({
      key: normalizeKey(field.name),
      value: field.values?.find((value) => value.trim())?.trim() || null,
    }))
    .filter((field): field is { key: string; value: string } => !!field.value);

  const get = (...names: string[]): string | null => {
    const normalizedNames = names.map(normalizeKey);
    return fields.find((field) => normalizedNames.includes(field.key))?.value ?? null;
  };

  const findByKey = (predicate: (key: string) => boolean): string | null =>
    fields.find((field) => predicate(field.key))?.value ?? null;

  // Ism: standard maydonlar + "Doimiy forma" custom maydoni
  const fullName =
    get("full_name", "full name", "полное_имя") ||
    findByKey(
      (key) =>
        key.startsWith("ism") ||
        key.startsWith("исм") ||
        key.includes(" имя") ||
        key.startsWith("имя"),
    ) ||
    [get("first_name"), get("last_name")].filter(Boolean).join(" ").trim() ||
    null;

  // Foydalanuvchi kiritgan telefon (ba'zan noto'g'ri formatda kelishi mumkin)
  const rawCustomPhone =
    get("telefon_raqamingizni_kiriting!", "ishlaydigan_telefon_raqam") ||
    findByKey((key) =>
      ["ishlaydigan", "ишлайдиган", "working phone", "telefon raqam", "телефон рақам"].some(
        (part) => key.includes(part),
      ),
    );
  // Facebook profilidan avtomatik to'ldirilgan telefon (odatda to'g'ri format)
  const fbAutoPhone =
    get("номер_телефона") ||
    (rawCustomPhone
      ? get("phone_number", "phone number") ||
        findByKey((key) =>
          ["tekshir", "текшир", "contact information", "контактная информация"].some((part) =>
            key.includes(part),
          ),
        )
      : null);

  // Agar custom phone faqat raqam/+ dan iborat bo'lsa (yaroqli) — uni ishlat,
  // aks holda Facebook'ning avtomatik raqamini asosiy sifatida ol
  const isValidPhoneChars = (s: string) => /^[0-9+\s\-()]+$/.test(s);
  const phone =
    (rawCustomPhone && isValidPhoneChars(rawCustomPhone) ? rawCustomPhone : null) ||
    fbAutoPhone ||
    findByKey((key) =>
      ["telefon", "телефон", "raqam", "рақам", "phone", "номер"].some((part) =>
        key.includes(part),
      ),
    ) ||
    rawCustomPhone || // oxirgi chora: noto'g'ri formatda bo'lsa ham saqla
    null;

  // nomer_asosiy: Facebook profilidan avtomatik to'ldirilgan raqam
  const nomerAsosiy = fbAutoPhone;

  // Manzil/viloyat: custom savol nomi forma bo'yicha farq qiladi.
  const region =
    get("region", "viloyat", "manzil", "address", "область", "город") ||
    findByKey((key) =>
      [
        "viloyat",
        "вилоят",
        "istiqomat",
        "истиқомат",
        "manzil",
        "манзил",
        "address",
        "область",
        "город",
      ].some((part) => key.includes(part)),
    ) ||
    null;

  // Kasallik turi — leads.problem_type ga saqlanadi
  const problemType =
    get(
      "qaysi_turdagi_kasallik_sizni_bezovta_qiladi?",
      "qaysi_turdagi_kasallik_bezovta_qiladi?",
      "qaysi_kasallik_sizni_bezovta_qiladi?",
    ) ||
    findByKey((key) =>
      [
        "ogriq",
        "оғриқ",
        "qismi",
        "қисми",
        "tanangiz",
        "танангиз",
        "pain",
        "боль",
        "kasallik",
        "болезн",
      ].some((part) => key.includes(part)),
    ) ||
    null;

  const answers = fieldData.flatMap((field) => {
    const question = field.name.trim();
    const answer = field.values
      .map((value) => value.trim())
      .filter(Boolean)
      .join(", ");
    return question && answer ? [{ question, answer }] : [];
  });

  return {
    fullName: fullName || null,
    phone,
    email: get("email"),
    nomerAsosiy,
    region,
    problemType,
    answers,
  };
}
