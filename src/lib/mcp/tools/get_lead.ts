import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated } from "../supabase";

export default defineTool({
  name: "get_lead",
  title: "Lid tafsilotlari",
  description: "Bitta lidning to'liq ma'lumotlarini id bo'yicha qaytaradi.",
  inputSchema: {
    lead_id: z.string().uuid().describe("Lid UUID"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ lead_id }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Lid topilmadi" }], isError: true };
    return {
      content: [{ type: "text", text: `Lid: ${data.full_name}` }],
      structuredContent: { lead: data },
    };
  },
});
