import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { submitPublicLead } from "@/lib/leads.functions";
import { CAN_VISIT_LABEL, type CanVisitClinic } from "@/lib/crm";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/ariza")({
  component: ArizaPage,
  head: () => ({
    meta: [
      { title: "Ariza qoldirish — Nevrologiya markazi" },
      { name: "description", content: "Bemorlar uchun onlayn ariza. Ma'lumotlaringizni qoldiring — operatorimiz tez orada bog'lanadi." },
    ],
  }),
});

function ArizaPage() {
  const submit = useServerFn(submitPublicLead);
  const [done, setDone] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState("");
  const [problem, setProblem] = useState("");
  const [canVisit, setCanVisit] = useState<CanVisitClinic | "">("");

  // Auto-capture campaign from URL
  const campaign = useMemo(() => {
    if (typeof window === "undefined") return null;
    const p = new URLSearchParams(window.location.search);
    return p.get("utm_campaign") || p.get("campaign") || null;
  }, []);

  const mut = useMutation({
    mutationFn: async () => {
      if (!canVisit) throw new Error("Klinikaga kelish imkoniyatingizni tanlang");
      await submit({
        data: {
          full_name: fullName,
          phone,
          region,
          problem_description: problem,
          can_visit_clinic: canVisit,
          campaign_name: campaign,
          source: "website",
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
            Operatorimiz tez orada siz bilan ko'rsatilgan telefon raqami orqali bog'lanadi.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white px-4 py-10">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-lg p-6 md:p-8">
        <h1 className="text-2xl font-bold mb-1">Ariza qoldirish</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Ma'lumotlaringizni to'ldiring — mutaxassisimiz siz bilan tez orada bog'lanadi.
        </p>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mut.mutate();
          }}
        >
          <div>
            <Label>Ism va familiya *</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1"
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
            <Label>Viloyat / Shahar *</Label>
            <Input
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="mt-1"
              placeholder="Toshkent"
              required
              maxLength={120}
            />
          </div>
          <div>
            <Label>Muammoni qisqacha tasvirlab bering *</Label>
            <Textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              rows={4}
              className="mt-1"
              placeholder="Masalan: 5 yoshli bolam yaxshi gapira olmayapti..."
              required
              maxLength={2000}
            />
          </div>
          <div>
            <Label>Klinikaga kela olasizmi? *</Label>
            <RadioGroup
              value={canVisit}
              onValueChange={(v) => setCanVisit(v as CanVisitClinic)}
              className="mt-2 flex gap-4"
            >
              {(Object.keys(CAN_VISIT_LABEL) as CanVisitClinic[]).map((k) => (
                <label key={k} className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value={k} id={`cv-${k}`} />
                  <span className="text-sm">{CAN_VISIT_LABEL[k]}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <Button
            type="submit"
            disabled={mut.isPending}
            className="w-full bg-emerald-600 hover:bg-emerald-700 h-11 text-base"
          >
            {mut.isPending ? "Yuborilmoqda..." : "Arizani yuborish"}
          </Button>
        </form>
      </div>
    </div>
  );
}
