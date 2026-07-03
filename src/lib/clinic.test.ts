import { describe, expect, it } from "vitest";
import { isSubscriptionBlocked, slugify, type ClinicStatus } from "./clinic";

function makeStatus(overrides: Partial<ClinicStatus> = {}): ClinicStatus {
  return {
    clinic_id: "c1",
    clinic_name: "Test klinika",
    is_active: true,
    subscription_status: "active",
    subscription_current_period_end: null,
    plan_name: "Pro",
    ...overrides,
  };
}

describe("slugify", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(slugify("Shifo Klinikasi")).toBe("shifo-klinikasi");
  });

  it("collapses repeated non-alphanumeric characters", () => {
    expect(slugify("Shifo   Klinikasi!!")).toBe("shifo-klinikasi");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("  -Shifo-  ")).toBe("shifo");
  });

  it("keeps existing hyphens and digits", () => {
    expect(slugify("Klinika-2")).toBe("klinika-2");
  });
});

describe("isSubscriptionBlocked", () => {
  it("blocks when status is missing (no clinic membership)", () => {
    expect(isSubscriptionBlocked(null)).toBe(true);
    expect(isSubscriptionBlocked(undefined)).toBe(true);
  });

  it("blocks when clinic is deactivated", () => {
    expect(isSubscriptionBlocked(makeStatus({ is_active: false }))).toBe(true);
  });

  it("blocks canceled or past_due subscriptions", () => {
    expect(isSubscriptionBlocked(makeStatus({ subscription_status: "canceled" }))).toBe(true);
    expect(isSubscriptionBlocked(makeStatus({ subscription_status: "past_due" }))).toBe(true);
  });

  it("allows trialing and active subscriptions with no expiry", () => {
    expect(isSubscriptionBlocked(makeStatus({ subscription_status: "trialing" }))).toBe(false);
    expect(isSubscriptionBlocked(makeStatus({ subscription_status: "active" }))).toBe(false);
  });

  it("blocks when the current period has already ended", () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    expect(isSubscriptionBlocked(makeStatus({ subscription_current_period_end: past }))).toBe(true);
  });

  it("allows when the current period ends in the future", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(isSubscriptionBlocked(makeStatus({ subscription_current_period_end: future }))).toBe(
      false,
    );
  });
});
