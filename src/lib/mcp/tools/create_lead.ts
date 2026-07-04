import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, currentClinicId } from "../supabase";
import { normalizeUzPhone } from "@/lib/phone";

export default defineTool({
  name: "create_lead",
  title: "Yangi lid yaratish",
  description:
    "Yangi lidni CRM'ga qo'shadi. Telefon avtomatik +998 formatiga keltiriladi. Takror raqam bo'lsa mavjud lidga izoh qo'shiladi.",
  inputSchema: {
    full_name: z.string().trim().min(1),
    phone: z.string().trim().optional(),
    source: z
      .enum(["facebook", "instagram", "website", "telegram", "friends", "boshqa"])
      .optional(),
    notes: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ full_name, phone, source, notes }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const clinic_id = await currentClinicId(supabase);
    if (!clinic_id)
      return { content: [{ type: "text", text: "Klinika aniqlanmadi" }], isError: true };

    const normPhone = phone ? (normalizeUzPhone(phone) ?? phone) : null;
    const { data, error } = await supabase
      .from("leads")
      .insert({
        clinic_id,
        full_name,
        phone: normPhone,
        source: source ?? "boshqa",
        notes: notes ?? null,
        status: "yangi",
      })
      .select("id, full_name, phone, status")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data)
      return {
        content: [
          { type: "text", text: "Takror telefon raqami — mavjud lidga izoh qo'shildi." },
        ],
      };
    return {
      content: [{ type: "text", text: `Lid yaratildi: ${data.full_name}` }],
      structuredContent: { lead: data },
    };
  },
});
