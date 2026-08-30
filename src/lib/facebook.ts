export type FacebookFieldDatum = { name: string; values: string[] };

export type FacebookFormFieldMapping = Partial<{
  full_name: string;
  phone: string;
  nomer_asosiy: string;
  region: string;
  problem_type: string;
}>;

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

export const FACEBOOK_FORM_MAPPING_TARGETS = [
  "full_name",
  "phone",
  "nomer_asosiy",
  "region",
  "problem_type",
] as const;

export type FacebookFormMappingTarget = (typeof FACEBOOK_FORM_MAPPING_TARGETS)[number];

export type FacebookFormQuestion = {
  key: string;
  label?: string | null;
};

export function normalizeFacebookFieldKey(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/ё/g, "е")
    .replace(/[!?():,.;_\-]+/g, " ")
    .replace(/\s+/g, " ");
}

// Yangi forma sozlanayotganda standart savollarni oldindan tanlab beradi.
// Admin istasa ularni sozlamalardan bir marta o'zgartirib saqlaydi.
export function suggestFacebookFormFieldMapping(
  questions: FacebookFormQuestion[],
): FacebookFormFieldMapping {
  const find = (predicate: (value: string) => boolean): string | undefined =>
    questions.find((question) =>
      [question.key, question.label ?? ""].some((value) => predicate(normalizeFacebookFieldKey(value))),
    )?.key;

  const fullName = find(
    (key) =>
      key === "full name" ||
      key === "full_name" ||
      key === "полное имя" ||
      key.startsWith("ism") ||
      key.startsWith("исм") ||
      key.includes(" имя") ||
      key.startsWith("имя"),
  );
  const phone = find(
    (key) =>
      key === "phone number" ||
      key === "phone_number" ||
      key.includes("ishlaydigan") ||
      key.includes("ишлайдиган") ||
      key.includes("working phone") ||
      key.includes("telefon raqam") ||
      key.includes("телефон рақам") ||
      key.includes("telefon") ||
      key.includes("телефон") ||
      key.includes("phone"),
  );
  const nomerAsosiy = find(
    (key) =>
      key.includes("tekshir") ||
      key.includes("текшир") ||
      key.includes("contact information") ||
      key.includes("контактная информация"),
  );
  const region = find((key) =>
    ["viloyat", "вилоят", "istiqomat", "истиқомат", "manzil", "манзил", "address", "область", "город"].some(
      (part) => key.includes(part),
    ),
  );
  const problemType = find((key) =>
    ["ogriq", "оғриқ", "qismi", "қисми", "tanangiz", "танангиз", "pain", "боль", "kasallik", "болезн"].some(
      (part) => key.includes(part),
    ),
  );

  return {
    ...(fullName ? { full_name: fullName } : {}),
    ...(phone ? { phone } : {}),
    ...(nomerAsosiy ? { nomer_asosiy: nomerAsosiy } : {}),
    ...(region ? { region } : {}),
    ...(problemType ? { problem_type: problemType } : {}),
  };
}

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
export function extractFacebookLeadFields(
  fieldData: FacebookFieldDatum[],
  fieldMapping: FacebookFormFieldMapping | null = null,
): ExtractedFacebookLead {

  const fields = fieldData
    .map((field) => ({
      key: normalizeFacebookFieldKey(field.name),
      value: field.values?.find((value) => value.trim())?.trim() || null,
    }))
    .filter((field): field is { key: string; value: string } => !!field.value);

  const get = (...names: string[]): string | null => {
    const normalizedNames = names.map(normalizeFacebookFieldKey);
    return fields.find((field) => normalizedNames.includes(field.key))?.value ?? null;
  };

  const getMapped = (target: FacebookFormMappingTarget): string | null => {
    const mappedField = fieldMapping?.[target];
    if (!mappedField) return null;
    const mappedKey = normalizeFacebookFieldKey(mappedField);
    return fields.find((field) => field.key === mappedKey)?.value ?? null;
  };

  const findByKey = (predicate: (key: string) => boolean): string | null =>
    fields.find((field) => predicate(field.key))?.value ?? null;

  // Ism: standard maydonlar + "Doimiy forma" custom maydoni
  const fullName =
    getMapped("full_name") ||
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
    getMapped("phone") ||
    get("telefon_raqamingizni_kiriting!", "ishlaydigan_telefon_raqam") ||
    findByKey((key) =>
      ["ishlaydigan", "ишлайдиган", "working phone", "telefon raqam", "телефон рақам"].some(
        (part) => key.includes(part),
      ),
    );
  // Facebook profilidan avtomatik to'ldirilgan telefon (odatda to'g'ri format)
  const fbAutoPhone =
    getMapped("nomer_asosiy") ||
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
    getMapped("region") ||
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
    getMapped("problem_type") ||
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
