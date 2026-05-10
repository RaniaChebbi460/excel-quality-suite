import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/auth/AuthContext";

type Mode = "signin" | "signup";

const LoginPage = () => {
  const { signInWithPassword, signUp, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const raw = params.get("redirectTo") ?? "/";
    return raw.startsWith("/") ? raw : "/";
  }, [location.search]);

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate(redirectTo, { replace: true });
  }, [navigate, redirectTo, user]);

  if (user) return null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        await signInWithPassword({ email, password });
        toast.success("Connecté");
      } else {
        await signUp({ email, password });
        toast.success("Compte créé", { description: "Vérifiez votre email si la confirmation est activée." });
      }
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      toast.error("Erreur d'authentification", { description: err?.message ?? String(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Connexion</CardTitle>
          <CardDescription>
            {mode === "signin" ? "Connectez-vous pour accéder à vos projets." : "Créez un compte pour enregistrer vos projets."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={busy}>
              {mode === "signin" ? "Se connecter" : "Créer un compte"}
            </Button>

            <div className="text-sm text-muted-foreground">
              {mode === "signin" ? (
                <button type="button" className="underline" onClick={() => setMode("signup")}>
                  Créer un compte
                </button>
              ) : (
                <button type="button" className="underline" onClick={() => setMode("signin")}>
                  J'ai déjà un compte
                </button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
