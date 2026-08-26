import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated } from "../supabase";

const STATUSES = [
  "yangi",
  "qayta_qongiroq",
  "sifatsiz",
  "malumot_oldi",
  "instagram_direct",
  "konsultatsiyaga_yozildi",
  "ertangi_konsultatsiya",
  "bugungi_konsultatsiya",
  "konsultatsiyaga_keldi",
  "yotishga_yozildi",
  "bekor_qilindi",
  "qayta_qongiroq_2",
  "qayta_qongiroq_4",
  "qayta_qongiroq_6_sifatsiz",
  ] as const;

export default defineTool({
  name: "update_lead_status",
  title: "Lid statusini o'zgartirish",
  description: "Lidning statusini yangi qiymatga o'zgartiradi.",
  inputSchema: {
    lead_id: z.string().uuid(),
    status: z.enum(STATUSES),
  },
  annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ lead_id, status }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("leads")
      .update({ status })
      .eq("id", lead_id)
      .select("id, full_name, status")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Lid topilmadi" }], isError: true };
    return {
      content: [{ type: "text", text: `Status yangilandi: ${data.status}` }],
      structuredContent: { lead: data },
    };
  },
});
