import { createServerFn } from "@tanstack/react-start";

// TEMPORARY: One-time fix for admin user login
// DELETE this file after use
export const fixAdminLogin = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Find the admin user
  const { data: listData, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
  if (listErr) throw new Error("listUsers error: " + listErr.message);

  const user = listData.users.find(u => u.email === "samandarumirzogaliyev2208@gmail.com");
  if (!user) throw new Error("User not found: samandarumirzogaliyev2208@gmail.com");

  // Fix: confirm email + reset password
  const { data: updated, error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
    user.id,
    {
      email_confirm: true,
      password: "Samandar2208!",
    }
  );
  if (updateErr) throw new Error("updateUser error: " + updateErr.message);

  return {
    ok: true,
    user_id: updated.user.id,
    email: updated.user.email,
    email_confirmed_at: updated.user.email_confirmed_at,
  };
});
