import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PublicLeadSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(1).max(40),
  region: z.string().trim().max(120).optional().nullable(),
  problem_description: z.string().trim().max(2000).optional().nullable(),
  campaign_name: z.string().trim().max(200).optional().nullable(),
});

export const submitPublicLead = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => PublicLeadSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Round-robin operator assignment (same logic as n8n flow)
    let assignedTo: string | null = null;
    const { data: opId, error: opErr } = await supabaseAdmin.rpc("get_next_operator");
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
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
