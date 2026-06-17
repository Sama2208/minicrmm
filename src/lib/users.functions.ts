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
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _role: "admin" });
    if (!isAdmin) throw new Error("Faqat admin operator yarata oladi");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (cErr || !created.user) throw new Error(cErr?.message ?? "Foydalanuvchi yaratilmadi");
    const newUserId = created.user.id;

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

    const { error: rErr } = await supabaseAdmin.from("user_roles")
      .insert({ user_id: newUserId, role: "operator" });
    if (rErr && !rErr.message.includes("duplicate")) throw new Error(rErr.message);

    return { ok: true, user_id: newUserId, operator_id: opId };
  });

const DeleteInput = z.object({ operator_id: z.string().uuid() });

export const deleteOperatorUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DeleteInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _role: "admin" });
    if (!isAdmin) throw new Error("Faqat admin o'chira oladi");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: op } = await supabaseAdmin.from("operators")
      .select("user_id").eq("id", data.operator_id).maybeSingle();

    // Unassign leads first so FK doesn't block deletion
    await supabaseAdmin.from("leads").update({ assigned_to: null }).eq("assigned_to", data.operator_id);

    const { error: opErr } = await supabaseAdmin.from("operators").delete().eq("id", data.operator_id);
    if (opErr) throw new Error(opErr.message);

    if (op?.user_id) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", op.user_id);
      const { error: uErr } = await supabaseAdmin.auth.admin.deleteUser(op.user_id);
      if (uErr) throw new Error(uErr.message);
    }

    return { ok: true };
  });
