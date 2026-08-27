import { describe, expect, it } from "vitest";
import { extractFacebookLeadFields } from "./facebook";

describe("extractFacebookLeadFields", () => {
  it("reads full_name, phone_number, and email directly", () => {
    const result = extractFacebookLeadFields([
      { name: "full_name", values: ["Dilnoza Karimova"] },
      { name: "phone_number", values: ["+998901234567"] },
      { name: "email", values: ["dilnoza@example.com"] },
    ]);
    expect(result).toEqual({
      fullName: "Dilnoza Karimova",
      phone: "+998901234567",
      email: "dilnoza@example.com",
      nomerAsosiy: null,
      region: null,
      problemType: null,
      answers: [
        { question: "full_name", answer: "Dilnoza Karimova" },
        { question: "phone_number", answer: "+998901234567" },
        { question: "email", answer: "dilnoza@example.com" },
      ],
    });
  });

  it("falls back to first_name + last_name when full_name is absent", () => {
    const result = extractFacebookLeadFields([
      { name: "first_name", values: ["Dilnoza"] },
      { name: "last_name", values: ["Karimova"] },
      { name: "phone_number", values: ["+998901234567"] },
    ]);
    expect(result.fullName).toBe("Dilnoza Karimova");
  });

  it("returns null for missing fields instead of throwing", () => {
    const result = extractFacebookLeadFields([{ name: "phone_number", values: ["+998901234567"] }]);
    expect(result.fullName).toBeNull();
    expect(result.email).toBeNull();
    expect(result.phone).toBe("+998901234567");
  });

  it("returns null fullName when no name fields are present at all", () => {
    const result = extractFacebookLeadFields([]);
    expect(result.fullName).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.email).toBeNull();
  });

  it("ignores fields with empty string values", () => {
    const result = extractFacebookLeadFields([
      { name: "full_name", values: [""] },
      { name: "phone_number", values: ["+998901234567"] },
    ]);
    expect(result.fullName).toBeNull();
  });

  // "Doimiy forma" custom maydon nomlari
  it("handles Doimiy forma custom field names (full name with space, Uzbek phone field)", () => {
    const result = extractFacebookLeadFields([
      { name: "full name", values: ["Aziza"] },
      { name: "telefon_raqamingizni_kiriting!", values: ["+998934211192"] },
      { name: "номер_телефона", values: ["+998934211192"] },
      { name: "qaysi_turdagi_kasallik_sizni_bezovta_qiladi?", values: ["Bolam 3yarim yoshda"] },
    ]);
    expect(result.fullName).toBe("Aziza");
    expect(result.phone).toBe("+998934211192");
    expect(result.nomerAsosiy).toBe("+998934211192");
    expect(result.problemType).toBe("Bolam 3yarim yoshda");
  });

  it("extracts both phones when telefon field is primary", () => {
    const result = extractFacebookLeadFields([
      { name: "full name", values: ["Test User"] },
      { name: "telefon_raqamingizni_kiriting!", values: ["+998901111111"] },
      { name: "номер_телефона", values: ["+998902222222"] },
    ]);
    expect(result.phone).toBe("+998901111111");
    expect(result.nomerAsosiy).toBe("+998902222222");
  });

  it("maps the exact Cyrillic questions from the Oa grija form", () => {
    const result = extractFacebookLeadFields([
      {
        name: "Танангизни қайси қисмида кўпроқ оғриқ бор?",
        values: ["Бел соҳасида"],
      },
      { name: "Исмингиз", values: ["Шахзод" ] },
      {
        name: "Телефон рақамингиз(ишлайдиган)",
        values: ["+998901234567"],
      },
      { name: "Рақамингизни текширинг!", values: ["+998909876543"] },
    ]);

    expect(result.fullName).toBe("Шахзод");
    expect(result.phone).toBe("+998901234567");
    expect(result.nomerAsosiy).toBe("+998909876543");
    expect(result.problemType).toBe("Бел соҳасида");
    expect(result.answers).toEqual([
      { question: "Танангизни қайси қисмида кўпроқ оғриқ бор?", answer: "Бел соҳасида" },
      { question: "Исмингиз", answer: "Шахзод" },
      { question: "Телефон рақамингиз(ишлайдиган)", answer: "+998901234567" },
      { question: "Рақамингизни текширинг!", answer: "+998909876543" },
    ]);
  });

  it("maps OA form's residence question to the card region field", () => {
    const result = extractFacebookLeadFields([
      { name: "qaysi_viloyatda_istiqomat_qilasiz?", values: ["Qashqadaryo"] },
      { name: "full_name", values: ["Shuxratovna"] },
      { name: "phone_number", values: ["+998976310154"] },
    ]);

    expect(result.region).toBe("Qashqadaryo");
  });

  it("maps Doctor Shoxyusupov OA disease question to the card problem field", () => {
    const result = extractFacebookLeadFields([
      { name: "qaysi_kasallik_sizni_bezovta_qiladi?", values: ["Bel og'rig'i"] },
      { name: "qaysi_viloyatda_istiqomat_qilasiz?", values: ["Samarqand"] },
      { name: "full_name", values: ["Shuxratovna"] },
      { name: "phone_number", values: ["+998976310154"] },
    ]);

    expect(result.fullName).toBe("Shuxratovna");
    expect(result.phone).toBe("+998976310154");
    expect(result.region).toBe("Samarqand");
    expect(result.problemType).toBe("Bel og'rig'i");
  });
});
