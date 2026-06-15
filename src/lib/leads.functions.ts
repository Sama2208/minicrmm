import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PublicLeadSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(5).max(40),
  region: z.string().trim().min(1).max(120),
  problem_description: z.string().trim().min(2).max(2000),
  can_visit_clinic: z.enum(["ha", "yoq", "bilmayman"]),
  campaign_name: z.string().trim().max(200).optional().nullable(),
  source: z.enum(["facebook", "instagram", "website", "boshqa"]).optional(),
});

export const submitPublicLead = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => PublicLeadSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("leads").insert({
      full_name: data.full_name,
      phone: data.phone,
      region: data.region,
      problem_type: data.problem_description,
      can_visit_clinic: data.can_visit_clinic,
      campaign_name: data.campaign_name || null,
      source: data.source ?? "website",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
