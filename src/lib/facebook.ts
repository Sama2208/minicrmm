export type FacebookFieldDatum = { name: string; values: string[] };

export type ExtractedFacebookLead = {
  fullName: string | null;
  phone: string | null;
  email: string | null;
};

// Meta Lead Ads (Instant Forms) `field_data` massivini bizga kerakli
// maydonlarga aylantiradi. Forma nomlari klinikadan klinikaga farq qilishi
// mumkin (full_name yoki first_name+last_name), shuning uchun ikkalasi ham
// qo'llab-quvvatlanadi.
export function extractFacebookLeadFields(fieldData: FacebookFieldDatum[]): ExtractedFacebookLead {
  const get = (name: string): string | null => {
    const field = fieldData.find((f) => f.name === name);
    return field?.values?.[0]?.trim() || null;
  };

  const fullName =
    get("full_name") || [get("first_name"), get("last_name")].filter(Boolean).join(" ").trim();

  return {
    fullName: fullName || null,
    phone: get("phone_number"),
    email: get("email"),
  };
}
