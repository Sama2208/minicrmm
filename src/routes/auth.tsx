import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();
  const { session, role, loading } = useAuth();

  useEffect(() => {
    if (loading || !session) return;
    navigate({ to: role === "admin" ? "/lidlar" : "/mening-lidlarim", replace: true });
  }, [session, role, loading, navigate]);

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      setSent(true);
      toast.success("Kirish linki emailingizga yuborildi");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>CRM Tizim</CardTitle>
          <CardDescription>
            {sent
              ? "Emailingizni tekshiring — kirish linki yuborildi"
              : "Emailingizni kiriting, sizga kirish linki yuboramiz"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setSent(false);
                setEmail("");
              }}
            >
              Boshqa email bilan urinish
            </Button>
          ) : (
            <form onSubmit={onSend} className="space-y-3">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1"
                  placeholder="siz@example.com"
                />
              </div>
              <Button
                type="submit"
                disabled={busy}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                {busy ? "Yuborilmoqda..." : "Kirish linkini yuborish"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
