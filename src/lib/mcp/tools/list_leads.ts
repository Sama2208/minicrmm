import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated } from "../supabase";

export default defineTool({
  name: "list_leads",
  title: "Lidlar ro'yxati",
  description:
    "Klinikadagi lidlarni oxirgi yaratilganidan boshlab qaytaradi. Ixtiyoriy 'status' filtri va limit (default 20, max 100).",
  inputSchema: {
    status: z
      .string()
      .optional()
      .describe("Lead status kodi, masalan 'yangi', 'konsultatsiyaga_yozildi'"),
    limit: z.number().int().min(1).max(100).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("leads")
      .select("id, full_name, phone, status, source, created_at, notes")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (status) q = q.eq("status", status as never);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `${data?.length ?? 0} ta lid topildi` }],
      structuredContent: { leads: data ?? [] },
    };
  },
});
