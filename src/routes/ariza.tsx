import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { submitPublicLead } from "@/lib/leads.functions";
import { CheckCircle2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/ariza")({
  component: ArizaPage,
  head: () => ({
    meta: [
      { title: "Klinikaga qabulga yozilish" },
      { name: "description", content: "Formani to'ldiring, operatorimiz siz bilan bog'lanadi." },
    ],
  }),
});

function ArizaPage() {
  const submit = useServerFn(submitPublicLead);
  const navigate = useNavigate();
  const [done, setDone] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState("");
  const [problem, setProblem] = useState("");
  const phoneRef = useRef<HTMLInputElement>(null);
  const fullNameRef = useRef<HTMLInputElement>(null);

  // Auto-capture campaign from URL (client-only to avoid SSR mismatch)
  const [campaign, setCampaign] = useState<string | null>(null);
  useMemo(() => {
    // This is just to satisfy the linter; we'll set in useEffect
    return campaign;
  }, [campaign]);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setCampaign(p.get("utm_campaign") || p.get("campaign") || null);
  }, []);

  const mut = useMutation({
    mutationFn: async () => {
      const resolvedPhone = phone || phoneRef.current?.value || "";
      const resolvedName = fullName || fullNameRef.current?.value || "";
      if (!resolvedPhone.trim()) {
        throw new Error("Telefon raqamni kiriting");
      }
      await submit({
        data: {
          full_name: resolvedName,
          phone: resolvedPhone,
          region,
          problem_description: problem,
          campaign_name: campaign,
        },
      });
    },
    onSuccess: () => setDone(true),
    onError: (e: Error) => {
      let msg = e.message;
      try {
        const parsed = JSON.parse(msg);
        if (Array.isArray(parsed) && parsed[0]?.message) {
          msg = parsed[0].message;
        }
      } catch {
        // keep raw message
      }
      toast.error(msg);
    },
  });

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-white px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
          <h1 className="text-2xl font-bold">Arizangiz qabul qilindi!</h1>
          <p className="text-muted-foreground">Tez orada bog'lanamiz.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white px-4 py-10">
      <div className="max-w-xl mx-auto">
        <Button
          variant="ghost"
          className="mb-4 gap-2 text-slate-600 hover:text-slate-900 -ml-2"
          onClick={() => navigate({ to: "/lidlar" })}
        >
          <ArrowLeft className="h-4 w-4" />
          Orqaga
        </Button>
      </div>
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
              ref={fullNameRef}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onInput={(e) => setFullName((e.target as HTMLInputElement).value)}
              className="mt-1"
              placeholder="Ismingizni kiriting"
              required
              maxLength={120}
            />
          </div>
          <div>
            <Label>Telefon raqam *</Label>
            <Input
              ref={phoneRef}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onInput={(e) => setPhone((e.target as HTMLInputElement).value)}
              className="mt-1"
              placeholder="+998 90 123 45 67"
              required
              maxLength={40}
              type="tel"
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
