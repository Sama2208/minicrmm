import { describe, expect, it } from "vitest";
import { extractPhoneFromText, instagramLeadName, messagePreview } from "./instagram";
import { DEFAULT_COLUMNS } from "./kanban";
import { STATUS_LABEL, STATUS_ORDER, STATUS_BADGE } from "./crm";

describe("extractPhoneFromText", () => {
  it("extracts an E.164 number from a plain message", () => {
    expect(extractPhoneFromText("Salom, mening raqamim +998 90 123 45 67")).toBe("+998901234567");
  });
  it("handles a national 9-digit number", () => {
    expect(extractPhoneFromText("901234567 ga qo'ng'iroq qiling")).toBe("+998901234567");
  });
  it("handles a number with dashes and parentheses", () => {
    expect(extractPhoneFromText("tel: (90) 123-45-67")).toBe("+998901234567");
  });
  it("handles a 998-prefixed number without plus", () => {
    expect(extractPhoneFromText("998901234567")).toBe("+998901234567");
  });
  it("returns null when there is no phone", () => {
    expect(extractPhoneFromText("Narxi qancha?")).toBeNull();
  });
  it("returns null for empty input", () => {
    expect(extractPhoneFromText(null)).toBeNull();
    expect(extractPhoneFromText("")).toBeNull();
  });
  it("ignores numbers that are not valid uz phones", () => {
    expect(extractPhoneFromText("12345")).toBeNull();
  });
  it("picks the first valid number when several appear", () => {
    expect(extractPhoneFromText("12345 yoki 901234567")).toBe("+998901234567");
  });
});

describe("instagramLeadName", () => {
  it("prefixes the username with @", () => {
    expect(instagramLeadName("clinic_user")).toBe("@clinic_user");
  });
  it("does not double the @", () => {
    expect(instagramLeadName("@clinic_user")).toBe("@clinic_user");
  });
  it("falls back when there is no username", () => {
    expect(instagramLeadName(null)).toBe("Instagram Direct");
  });
});

describe("messagePreview", () => {
  it("collapses whitespace", () => {
    expect(messagePreview("  salom   dunyo ")).toBe("salom dunyo");
  });
  it("shows a media placeholder for empty text", () => {
    expect(messagePreview(null)).toBe("📎 Media");
  });
  it("truncates long text", () => {
    expect(messagePreview("a".repeat(200)).length).toBe(120);
  });
});

describe("Direct kanban column", () => {
  const keys = DEFAULT_COLUMNS.map((c) => c.key);

  it("sits exactly between Ma'lumot oldi and Konsultatsiyaga yozildi", () => {
    const i = keys.indexOf("instagram_direct");
    expect(i).toBeGreaterThan(-1);
    expect(keys[i - 1]).toBe("malumot_oldi");
    expect(keys[i + 1]).toBe("konsultatsiyaga_yozildi");
  });

  it("is titled Direct and mapped to the instagram_direct status", () => {
    const col = DEFAULT_COLUMNS.find((c) => c.key === "instagram_direct");
    expect(col?.title).toBe("Direct");
    expect(col?.status).toBe("instagram_direct");
  });

  it("matches the same position in STATUS_ORDER", () => {
    const i = STATUS_ORDER.indexOf("instagram_direct");
    expect(STATUS_ORDER[i - 1]).toBe("malumot_oldi");
    expect(STATUS_ORDER[i + 1]).toBe("konsultatsiyaga_yozildi");
  });

  it("has a label and badge style", () => {
    expect(STATUS_LABEL.instagram_direct).toBe("Direct");
    expect(STATUS_BADGE.instagram_direct).toBeTruthy();
  });
});
