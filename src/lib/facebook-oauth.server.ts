import {
  exchangeCodeForUserToken,
  getLongLivedUserToken,
  listPagesForUser,
} from "./facebook-graph.server";

// Facebook mijozning brauzerini shu manzilga GET so'rov bilan qaytaradi
// (?code=...&state=...). Bu createServerFn emas — chunki bu Meta'dan
// keladigan xom HTTP redirect, ichki RPC emas. src/server.ts orqali
// chaqiriladi.
export async function handleFacebookOAuthCallback(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const redirectTo = (params: string) =>
    Response.redirect(`${url.origin}/sozlamalar?${params}`, 302);

  const error = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (error) return redirectTo(`fb_error=${encodeURIComponent(error)}`);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return redirectTo("fb_error=invalid_request");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: session, error: sessionErr } = await supabaseAdmin
    .from("facebook_oauth_sessions")
    .select("state, clinic_id, expires_at")
    .eq("state", state)
    .single();
  if (sessionErr || !session || new Date(session.expires_at) < new Date()) {
    return redirectTo("fb_error=session_expired");
  }

  try {
    const redirectUri = `${url.origin}/api/facebook/oauth-callback`;
    const shortLivedToken = await exchangeCodeForUserToken(code, redirectUri);
    const userToken = await getLongLivedUserToken(shortLivedToken);
    const pages = await listPagesForUser(userToken);

    if (pages.length === 0) {
      return redirectTo("fb_error=no_pages");
    }

    const { error: updateErr } = await supabaseAdmin
      .from("facebook_oauth_sessions")
      .update({ pages })
      .eq("state", state);
    if (updateErr) throw new Error(updateErr.message);

    return redirectTo(`fb_session=${encodeURIComponent(state)}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Noma'lum xatolik";
    return redirectTo(`fb_error=${encodeURIComponent(message)}`);
  }
}
