const AD_ACCOUNT_ID = Deno.env.get("META_AD_ACCOUNT_ID") ?? "act_3356671387908032";
const ACCESS_TOKEN  = Deno.env.get("META_CAPI_ACCESS_TOKEN") ??
  "EAANuWeX60pEBR8VaeyndF7CAZAUk2Q0urWSUH54MpZCZBo3QwecFCXAdku9jW9adwxChFZCKZBxZBf95JN4DIPVSXtZBhEH83TnGbOgxTudQlPNaDYLlSn3r4QJbo8oXmTqO0hdJVHz4ZCvCZBL0BaUVNJGDKCbjffLhMhwtRaXySqbsjYkox1n9oZBJe4iSf3uAZDZD";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const url    = new URL(req.url);
  const since  = url.searchParams.get("since")  ?? new Date().toISOString().slice(0, 10);
  const until  = url.searchParams.get("until")  ?? since;

  const fields = "campaign_id,campaign_name,spend,impressions,clicks,cpm,cpc";
  const apiUrl =
    `https://graph.facebook.com/v19.0/${AD_ACCOUNT_ID}/insights` +
    `?fields=${fields}` +
    `&level=campaign` +
    `&time_range={"since":"${since}","until":"${until}"}` +
    `&access_token=${ACCESS_TOKEN}`;

  try {
    const res  = await fetch(apiUrl);
    const json = await res.json();

    if (json.error) {
      return new Response(JSON.stringify({ error: json.error.message }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const rows = (json.data ?? []).map((d: Record<string, string>) => ({
      campaign_id:   d.campaign_id,
      campaign_name: d.campaign_name,
      spend:         parseFloat(d.spend ?? "0"),
      impressions:   parseInt(d.impressions ?? "0"),
      clicks:        parseInt(d.clicks ?? "0"),
      cpm:           parseFloat(d.cpm ?? "0"),
      cpc:           parseFloat(d.cpc ?? "0"),
    }));

    return new Response(JSON.stringify({ data: rows }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
