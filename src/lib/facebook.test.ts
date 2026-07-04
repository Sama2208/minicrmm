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
      problemType: null,
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
});
