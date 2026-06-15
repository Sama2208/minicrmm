import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6).max(128),
  full_name: z.string().min(1).max(255),
  operator_id: z.string().uuid().optional(),
});

export const createOperatorUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }) => {
    // Authorize: only admins
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _role: "admin" });
    if (!isAdmin) throw new Error("Faqat admin operator yarata oladi");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Create auth user
    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (cErr || !created.user) throw new Error(cErr?.message ?? "Foydalanuvchi yaratilmadi");
    const newUserId = created.user.id;

    // 2. Find or create operator row, attach user_id
    let opId = data.operator_id;
    if (opId) {
      const { error } = await supabaseAdmin.from("operators")
        .update({ user_id: newUserId, is_active: true }).eq("id", opId);
      if (error) throw new Error(error.message);
    } else {
      const { data: existing } = await supabaseAdmin.from("operators")
        .select("id").eq("full_name", data.full_name).is("user_id", null).maybeSingle();
      if (existing) {
        opId = existing.id;
        await supabaseAdmin.from("operators").update({ user_id: newUserId, is_active: true }).eq("id", existing.id);
      } else {
        const { data: ins, error } = await supabaseAdmin.from("operators")
          .insert({ full_name: data.full_name, user_id: newUserId, is_active: true })
          .select("id").single();
        if (error) throw new Error(error.message);
        opId = ins.id;
      }
    }

    // 3. Grant operator role
    const { error: rErr } = await supabaseAdmin.from("user_roles")
      .insert({ user_id: newUserId, role: "operator" });
    if (rErr && !rErr.message.includes("duplicate")) throw new Error(rErr.message);

    return { ok: true, user_id: newUserId, operator_id: opId };
  });
