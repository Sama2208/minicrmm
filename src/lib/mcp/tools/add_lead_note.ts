import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated } from "../supabase";

export default defineTool({
  name: "add_lead_note",
  title: "Lidga izoh qo'shish",
  description: "Mavjud lidning izohlar (notes) maydoniga yangi qatorni qo'shadi.",
  inputSchema: {
    lead_id: z.string().uuid(),
    note: z.string().trim().min(1),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ lead_id, note }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const { data: existing, error: readErr } = await supabase
      .from("leads")
      .select("notes")
      .eq("id", lead_id)
      .maybeSingle();
    if (readErr) return { content: [{ type: "text", text: readErr.message }], isError: true };
    if (!existing) return { content: [{ type: "text", text: "Lid topilmadi" }], isError: true };

    const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
    const merged = (existing.notes ? existing.notes + "\n" : "") + `[${stamp}] ${note}`;
    const { error } = await supabase.from("leads").update({ notes: merged }).eq("id", lead_id);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: "Izoh qo'shildi" }] };
  },
});
