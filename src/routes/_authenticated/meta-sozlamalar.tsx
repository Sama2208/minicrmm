import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, XCircle, AlertCircle, RefreshCw,
  ExternalLink, Copy, Shield, Wifi,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/meta-sozlamalar")({
  component: MetaSozlamalarPage,
});

const EDGE_URL = "https://uddkghraacwlflxrpcdq.supabase.co/functions/v1/meta-ads-insights";
const AD_ACCOUNT_ID = "act_3356671387908032";

function MetaSozlamalarPage() {
  const [copied, setCopied] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ["meta-account-check", refreshKey],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(EDGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adAccountId: AD_ACCOUNT_ID, since: today, until: today }),
      });
      if (!res.ok) throw new Error("API xatosi: " + res.status);
      const json = await res.json();
      const campaigns = (json.data ?? []) as { spend: number }[];
      return {
        campaigns_count: campaigns.length,
        total_spend_today: campaigns.reduce((s, c) => s + c.spend, 0),
      };
    },
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  const isConnected = !error && !isLoading;

  const copyAccountId = () => {
    navigator.clipboard.writeText(AD_ACCOUNT_ID).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const stats = [
    { label: "JAMI AKKAUNTLAR", value: "1", icon: Shield, color: "text-slate-700", bg: "bg-slate-50" },
    { label: "ULANGAN", value: isConnected ? "1" : "0", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "ULANMAGAN", value: isConnected ? "0" : "1", icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
    {
      label: "BUGUN XARAJAT",
      value: isLoading ? "…" : error ? "—" : `$${(data?.total_spend_today ?? 0).toFixed(2)}`,
      icon: Wifi,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Meta Sozlamalar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Facebook & Instagram reklama akkauntlari
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={isLoading}
          className="gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Tekshirish
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className={`${bg} border-0 shadow-sm`}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon className={`h-3.5 w-3.5 ${color}`} />
                <span className="text-xs text-muted-foreground font-medium">{label}</span>
              </div>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Connected account card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Ulangan reklama akkauntlari</span>
            <Badge variant="secondary">1 ta</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 rounded-lg border p-4">
            {/* Status */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {isLoading ? (
                  <div className="h-5 w-5 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />
                ) : error ? (
                  <XCircle className="h-5 w-5 text-red-500" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                )}
                <span className="font-medium text-sm">
                  {isLoading ? "Tekshirilmoqda…" : error ? "Ulanishda xatolik" : "Ulangan · Faol"}
                </span>
              </div>
              <Badge
                variant={error ? "destructive" : "secondary"}
                className={!error && !isLoading ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : ""}
              >
                {isLoading ? "Tekshirilmoqda" : error ? "Xatolik" : "Faol"}
              </Badge>
            </div>

            {/* Account ID */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Akkaunt ID:</span>
              <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono">{AD_ACCOUNT_ID}</code>
              <Button variant="ghost" size="sm" onClick={copyAccountId} className="h-7 gap-1.5">
                <Copy className="h-3 w-3" />
                {copied && <span className="text-xs text-emerald-600">Nusxalandi</span>}
              </Button>
            </div>

            {/* Today's campaigns */}
            {!isLoading && !error && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Bugun faol:</span>
                <span className="font-medium">{data?.campaigns_count ?? 0} ta kampaniya</span>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md p-3">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                <p className="text-xs text-red-700">
                  Meta API ga ulanishda xatolik yuz berdi. Access token muddati tugagan yoki API bilan muammo bo'lishi mumkin.
                </p>
              </div>
            )}

            {/* Links */}
            <div className="flex gap-2 flex-wrap pt-1">
              <Button variant="outline" size="sm" asChild className="gap-1.5">
                <a href={`https://business.facebook.com/adsmanager/manage/campaigns?act=${AD_ACCOUNT_ID.replace("act_", "")}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Ads Manager
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild className="gap-1.5">
                <a href="https://business.facebook.com/" target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Business Manager
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">API ulanish ma'lumotlari</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-muted-foreground">Edge function:</span>
            <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono">
              uddkghraacwlflxrpcdq.supabase.co
            </code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Meta Graph API:</span>
            <span className="font-medium">v25.0</span>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-muted-foreground">Token ruxsatlari:</span>
            <div className="flex gap-1.5 flex-wrap">
              <Badge variant="secondary" className="text-xs">ads_read</Badge>
              <Badge variant="secondary" className="text-xs">public_profile</Badge>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-md p-3 mt-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800">
              Token muddati tugashi mumkin. Muammo bo'lsa, Facebook Developer Console'dan yangi token olib, Supabase edge function'ni yangilang.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
