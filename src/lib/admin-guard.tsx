import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { requireAdmin } from "@/components/admin-shell";
import { toast } from "sonner";

export function AdminGuard({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [state, setState] = useState<"checking" | "ok">("checking");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await requireAdmin();
      if (cancelled) return;
      if (!res.ok) {
        if (res.reason === "no-admin") toast.error("Admin huquqi yo'q");
        navigate({ to: "/admin/login", replace: true });
        return;
      }
      setState("ok");
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  if (state === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Tekshirilmoqda...
      </div>
    );
  }
  return <>{children}</>;
}
