import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { fixAdminLogin } from "@/lib/fix-admin.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/fix-login")({ ssr: false, component: FixLoginPage });

function FixLoginPage() {
  const fix = useServerFn(fixAdminLogin);
  const [result, setResult] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: async () => {
      const r = await fix({ data: undefined });
      return r;
    },
    onSuccess: (r) => setResult("✅ Muvaffaqiyat! Email tasdiqlandi, parol yangilandi.\n" + JSON.stringify(r, null, 2)),
    onError: (e: Error) => setResult("❌ Xato: " + e.message),
  });

  return (
    <div style={{ padding: 40, fontFamily: "monospace", maxWidth: 600, margin: "0 auto" }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>Admin Login Tuzatish</h1>
      <p style={{ marginBottom: 24, color: "#555" }}>
        Bu sahifa <code>samandarumirzogaliyev2208@gmail.com</code> foydalanuvchisining email tasdiqlashini va parolini tuzatadi.
      </p>
      <button
        onClick={() => mut.mutate()}
        disabled={mut.isPending}
        style={{
          background: "#059669", color: "white", border: "none",
          padding: "10px 24px", borderRadius: 6, cursor: "pointer",
          fontSize: 15, marginBottom: 20,
        }}
      >
        {mut.isPending ? "Tuzatilmoqda..." : "Tuzatishni boshlash"}
      </button>
      {result && (
        <pre style={{
          background: "#f1f5f9", padding: 16, borderRadius: 8,
          fontSize: 13, whiteSpace: "pre-wrap", wordBreak: "break-all",
        }}>
          {result}
        </pre>
      )}
    </div>
  );
}
