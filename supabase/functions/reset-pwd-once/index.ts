import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

Deno.serve(async () => {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const { data, error } = await admin.auth.admin.updateUserById(
    "ccdf7b84-1deb-48b0-ba95-c69c5de27bea",
    { password: "Samandar2208" }
  );
  return new Response(
    JSON.stringify({ ok: !error, error: error?.message, email: data?.user?.email }),
    { headers: { "content-type": "application/json" } }
  );
});
