import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { normalizeUzPhone } from "@/lib/phone";

const PublicLeadSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  // Raqamni E.164 (+998...) ko'rinishiga keltiramiz; tushunib bo'lmasa,
  // mijozni rad etmasdan kiritilgan qiymatni tozalab saqlaymiz.
  phone: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .transform((value) => normalizeUzPhone(value) ?? value),
  region: z.string().trim().max(120).optional().nullable(),
  problem_description: z.string().trim().max(2000).optional().nullable(),
  campaign_name: z.string().trim().max(200).optional().nullable(),
});

export const submitPublicLead = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => PublicLeadSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: clinic } = await supabaseAdmin
      .from("clinics")
      .select("id")
      .eq("slug", "default")
      .single();
    if (!clinic) throw new Error("Klinika topilmadi");

    let assignedTo: string | null = null;
    const { data: opId, error: opErr } = await supabaseAdmin.rpc("get_next_operator", {
      p_clinic_id: clinic.id,
    });
    if (!opErr && opId) assignedTo = opId as unknown as string;

    const { error } = await supabaseAdmin.from("leads").insert({
      full_name: data.full_name,
      phone: data.phone,
      region: data.region || null,
      problem_type: data.problem_description || null,
      campaign_name: data.campaign_name || null,
      source: "boshqa",
      source_detail: "Ariza forma",
      status: "yangi",
      assigned_to: assignedTo,
      clinic_id: clinic.id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
