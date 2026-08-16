import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/ulanish")({
  ssr: false,
  component: UlanishPage,
  head: () => ({
    meta: [
      { title: "AI yordamchini ulash — Shaxzod CRM" },
      {
        name: "description",
        content:
          "ChatGPT, Claude yoki boshqa AI yordamchini Shaxzod CRM'ga ulash bo'yicha bosqichma-bosqich yo'riqnoma.",
      },
      { property: "og:title", content: "AI yordamchini ulash — Shaxzod CRM" },
      {
        property: "og:description",
        content: "AI yordamchini CRM'ga ulash va yangilash bo'yicha qo'llanma.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const APP_NAME = "Shaxzod CRM";
const SLUG = "shaxzod-crm";

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          toast.success("Nusxalandi");
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("Nusxalab bo'lmadi");
        }
      }}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {label ?? "Nusxalash"}
    </Button>
  );
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ol>
  );
}

function UlanishPage() {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const mcpUrl = origin ? new URL("/mcp", origin).toString() : "";
  const claudeCodeCmd = `claude mcp add --scope user --transport http ${SLUG} '${mcpUrl}'`;
  const chatgptDeveloper = "https://chatgpt.com/#settings/Connectors/Advanced";
  const chatgptCreate =
    "https://chatgpt.com/plugins#settings/Connectors?create-connector=true&redirectAfter=%2Fplugins";
  const claudeUrl = `https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=${encodeURIComponent(
    APP_NAME,
  )}&connectorUrl=${encodeURIComponent(mcpUrl)}`;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">AI yordamchini ulash</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ChatGPT, Claude yoki boshqa AI yordamchini shu CRM'ga ulang — u lidlarni ko'rishi,
          qidirishi, yangi lid qo'shishi, holatini o'zgartirishi va izoh yozishi mumkin bo'ladi.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Server manzili</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <code className="flex-1 min-w-[240px] rounded-md border bg-muted px-3 py-2 font-mono text-sm break-all">
            {mcpUrl || "Yuklanmoqda..."}
          </code>
          {mcpUrl && <CopyButton value={mcpUrl} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ulanish bosqichlari</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="chatgpt">
            <TabsList className="flex-wrap">
              <TabsTrigger value="chatgpt">ChatGPT</TabsTrigger>
              <TabsTrigger value="claude">Claude</TabsTrigger>
              <TabsTrigger value="claude-code">Claude Code</TabsTrigger>
              <TabsTrigger value="other">Boshqalar</TabsTrigger>
            </TabsList>

            <TabsContent value="chatgpt" className="pt-4">
              <Steps
                items={[
                  <>
                    <a
                      className="text-emerald-700 underline inline-flex items-center gap-1"
                      href={chatgptDeveloper}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Sozlamalar → Connectors → Advanced <ExternalLink className="h-3 w-3" />
                    </a>{" "}
                    bo'limini oching va Developer mode'ni yoqing (u yerdagi ogohlantirishni
                    o'qing). Agar bu imkoniyat ko'rinmasa, ChatGPT administratoridan yoqishni
                    so'rang.
                  </>,
                  <>
                    <a
                      className="text-emerald-700 underline inline-flex items-center gap-1"
                      href={chatgptCreate}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Yangi plugin oynasini oching <ExternalLink className="h-3 w-3" />
                    </a>
                    .
                  </>,
                  <>
                    Nom maydoniga <strong>{APP_NAME}</strong>, URL maydoniga yuqoridagi server
                    manzilini qo'ying.
                  </>,
                  <>
                    Ma'lumotlarni tekshiring, “I understand and want to continue” katagini
                    belgilang (ChatGPT bu ogohlantirishni har qanday maxsus server uchun
                    ko'rsatadi) va “Create” tugmasini bosing.
                  </>,
                  <>Suhbat oynasida ilovani yoqing va ChatGPT'dan CRM bilan ishlashni so'rang.</>,
                ]}
              />
            </TabsContent>

            <TabsContent value="claude" className="pt-4">
              <Steps
                items={[
                  <>
                    <a
                      className="text-emerald-700 underline inline-flex items-center gap-1"
                      href={claudeUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Claude'da connector oynasini oching <ExternalLink className="h-3 w-3" />
                    </a>{" "}
                    — nom va manzil oldindan to'ldirilgan bo'ladi.
                  </>,
                  <>Ma'lumotlarni tekshirib, “Add” tugmasini bosing.</>,
                  <>
                    Agar oyna to'ldirilgan holda ochilmasa: Claude → Connectors → “Add custom
                    connector” ni tanlang, nom bering va yuqoridagi manzilni joylashtiring.
                  </>,
                  <>Suhbat oynasida connector'ni yoqing va Claude'dan CRM bilan ishlashni so'rang.</>,
                ]}
              />
            </TabsContent>

            <TabsContent value="claude-code" className="space-y-3 pt-4">
              <div className="flex flex-wrap items-center gap-3">
                <code className="flex-1 min-w-[240px] rounded-md border bg-muted px-3 py-2 font-mono text-xs break-all">
                  {claudeCodeCmd}
                </code>
                {mcpUrl && <CopyButton value={claudeCodeCmd} />}
              </div>
              <Steps
                items={[
                  <>Ushbu buyruqni terminalda ishga tushiring.</>,
                  <>
                    Claude Code'ni oching va <code>/mcp</code> buyrug'i bilan ulanishni
                    tekshiring — kerak bo'lsa o'sha menyudan tizimga kiring.
                  </>,
                  <>Claude Code'dan CRM bilan ishlashni so'rang.</>,
                ]}
              />
            </TabsContent>

            <TabsContent value="other" className="pt-4">
              <Steps
                items={[
                  <>Yordamchining MCP server yoki custom connector sozlamalarini oching.</>,
                  <>Yangi masofaviy (remote) MCP server ulanishini yarating.</>,
                  <>Ulanishga nom bering va yuqoridagi server manzilini joylashtiring.</>,
                  <>Kirish yoki ruxsat so'ralsa, uni yakunlang.</>,
                  <>Ulanishni yoqing va yordamchidan CRM bilan ishlashni so'rang.</>,
                ]}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CRM yangilangandan keyin yangilash</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="chatgpt">
            <TabsList className="flex-wrap">
              <TabsTrigger value="chatgpt">ChatGPT</TabsTrigger>
              <TabsTrigger value="claude">Claude</TabsTrigger>
              <TabsTrigger value="claude-code">Claude Code</TabsTrigger>
              <TabsTrigger value="other">Boshqalar</TabsTrigger>
            </TabsList>

            <TabsContent value="chatgpt" className="pt-4">
              <Steps
                items={[
                  <>ChatGPT'ning Plugins sahifasini oching va shu ilovani tanlang.</>,
                  <>“Information” bo'limigacha pastga tushing va “Refresh” tugmasini bosing.</>,
                  <>
                    ChatGPT mavjud ilovaning manzilini o'zgartira olmaydi — manzil o'zgargan
                    bo'lsa, ilovani o'chirib, yuqoridagi ulanish bosqichlarini yangi manzil bilan
                    takrorlang.
                  </>,
                  <>Yangi suhbat boshlab, ilovadan foydalanishni so'rang.</>,
                ]}
              />
            </TabsContent>

            <TabsContent value="claude" className="pt-4">
              <Steps
                items={[
                  <>Connectors sahifasini oching va shu connector'ni tanlang.</>,
                  <>Connector tool'larini yangilang (refresh/update).</>,
                  <>
                    Claude mavjud connector manzilini o'zgartira olmaydi — manzil o'zgargan
                    bo'lsa, connector'ni o'chirib, qaytadan ulang.
                  </>,
                  <>Claude'dan CRM bilan ishlashni so'rang.</>,
                ]}
              />
            </TabsContent>

            <TabsContent value="claude-code" className="pt-4">
              <Steps
                items={[
                  <>Yangi Claude Code sessiyasini boshlang — u eng so'nggi tool'larni yuklaydi.</>,
                  <>
                    Manzil o'zgargan bo'lsa: <code>claude mcp remove {SLUG}</code> buyrug'ini
                    bajaring va o'rnatish buyrug'ini yangi manzil bilan qayta ishga tushiring.
                  </>,
                  <>Claude Code'dan CRM bilan ishlashni so'rang.</>,
                ]}
              />
            </TabsContent>

            <TabsContent value="other" className="pt-4">
              <Steps
                items={[
                  <>Yordamchining MCP server yoki connector sozlamalarini oching.</>,
                  <>Shu ilova uchun yaratilgan ulanishni tanlang.</>,
                  <>Tool ro'yxatini yangilang yoki serverni qayta ulang.</>,
                  <>Manzil o'zgargan bo'lsa, yuqoridagi yangi manzilni joylashtiring.</>,
                  <>Yangi suhbat boshlab, yordamchidan CRM bilan ishlashni so'rang.</>,
                ]}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
