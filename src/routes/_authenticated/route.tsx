import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClinicStatus, isSubscriptionBlocked } from "@/lib/clinic";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Sessiyani tekshir
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/login" });
      }
      setChecking(false);
    });

    // Sessiya o'zgarishlarini kuzat (logout, token expire)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate({ to: "/login" });
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-500">Yuklanmoqda...</div>
      </div>
    );
  }

  return <ClinicGate />;
}

function ClinicGate() {
  const clinicStatusQ = useClinicStatus();

  if (clinicStatusQ.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-500">Yuklanmoqda...</div>
      </div>
    );
  }

  if (isSubscriptionBlocked(clinicStatusQ.data)) {
    return <SubscriptionBlockedScreen />;
  }

  return <Outlet />;
}

function SubscriptionBlockedScreen() {
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-sm text-center space-y-3 bg-white border rounded-xl shadow-sm p-8">
        <h1 className="text-lg font-semibold text-slate-800">Obuna muddati tugagan</h1>
        <p className="text-sm text-slate-500">
          Klinikangizning obunasi faol emas yoki muddati tugagan. Davom etish uchun to'lovni amalga
          oshirib, administrator bilan bog'laning.
        </p>
        <Button variant="outline" onClick={signOut}>
          Chiqish
        </Button>
      </div>
    </div>
  );
}
