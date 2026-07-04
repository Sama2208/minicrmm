// Har bir MCP tool chaqiruvida foydalanuvchining o'z tokenini Supabase'ga
// uzatib, RLS aynan o'sha user sifatida ishlashini ta'minlaymiz.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";
import type { Database } from "@/integrations/supabase/types";

export function supabaseForUser(ctx: ToolContext): SupabaseClient<Database> {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export function notAuthenticated() {
  return {
    content: [{ type: "text" as const, text: "Tizimga kirilmagan" }],
    isError: true,
  };
}

export async function currentClinicId(supabase: SupabaseClient<Database>): Promise<string | null> {
  const { data } = await supabase.rpc("current_clinic_id");
  return (data as string | null) ?? null;
}
