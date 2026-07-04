import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated } from "../supabase";

export default defineTool({
  name: "search_leads",
  title: "Lidlarni qidirish",
  description: "Ism yoki telefon raqami bo'yicha lidlarni qidiradi (case-insensitive).",
  inputSchema: {
    query: z.string().trim().min(1).describe("Ism yoki telefon fragmenti"),
    limit: z.number().int().min(1).max(50).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const like = `%${query.replace(/[%_]/g, "")}%`;
    const { data, error } = await supabase
      .from("leads")
      .select("id, full_name, phone, status, source, created_at")
      .or(`full_name.ilike.${like},phone.ilike.${like}`)
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `${data?.length ?? 0} ta natija` }],
      structuredContent: { leads: data ?? [] },
    };
  },
});
