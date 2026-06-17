import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { submitPublicLead } from "@/lib/leads.functions";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/ariza")({
  component: ArizaPage,
  head: () => ({
    meta: [
      { title: "Klinikaga qabulga yozilish" },
      { name: "description", content: "Formani to'ldiring, operatorimiz siz bilan bog'lanadi." },
    ],
  }),
});

const SOURCE_OPTIONS = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "telegram", label: "Telegram" },
  { value: "friends", label: "Do'stlar orqali" },
  { value: "boshqa", label: "Boshqa" },
];

function ArizaPage() {
  const submit = useServerFn(submitPublicLead);
  const [done, setDone] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState("");
  const [problem, setProblem] = useState("");
  const [source, setSource] = useState("");

  // Auto-capture campaign from URL
  const campaign = useMemo(() => {
    if (typeof window === "undefined") return null;
    const p = new URLSearchParams(window.location.search);
    return p.get("utm_campaign") || p.get("campaign") || null;
  }, []);

  const mut = useMutation({
    mutationFn: async () => {
      await submit({
        data: {
          full_name: fullName,
          phone,
          region,
          problem_description: problem,
          campaign_name: campaign,
          source: source as "facebook" | "instagram" | "telegram" | "friends" | "website" | "boshqa" | undefined,
        },
      });
    },
    onSuccess: () => setDone(true),
    onError: (e: Error) => toast.error(e.message),
  });

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-white px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
          <h1 className="text-2xl font-bold">Arizangiz qabul qilindi!</h1>
          <p className="text-muted-foreground">
            Tez orada bog'lanamiz.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white px-4 py-10">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-lg p-6 md:p-8">
        <h1 className="text-2xl font-bold mb-1">Klinikaga qabulga yozilish</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Formani to'ldiring, operatorimiz siz bilan bog'lanadi
        </p>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mut.mutate();
          }}
        >
          <div>
            <Label>Ism *</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1"
              placeholder="Ismingizni kiriting"
              required
              maxLength={120}
            />
          </div>
          <div>
            <Label>Telefon raqam *</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1"
              placeholder="+998 90 123 45 67"
              required
              maxLength={40}
            />
          </div>
          <div>
            <Label>Shahar / Viloyat</Label>
            <Input
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="mt-1"
              placeholder="Toshkent"
              maxLength={120}
            />
          </div>
          <div>
            <Label>Muammo tavsifi</Label>
            <Textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              rows={4}
              className="mt-1"
              placeholder="Muammongizni qisqacha tavsiflab bering..."
              maxLength={2000}
            />
          </div>
          <div>
            <Label>Qayerdan bildingiz?</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder="Tanlang" />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            disabled={mut.isPending}
            className="w-full bg-emerald-600 hover:bg-emerald-700 h-11 text-base"
          >
            {mut.isPending ? "Yuborilmoqda..." : "Yuborish"}
          </Button>
        </form>
      </div>
    </div>
  );
}
