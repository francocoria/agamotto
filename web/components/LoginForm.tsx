"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = getBrowserSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  };

  const onGoogle = async () => {
    setLoading(true);
    const supabase = getBrowserSupabase();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <form onSubmit={onSubmit}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button type="button" onClick={onGoogle} className="agm-btn" disabled={loading}>
          G  Google
        </button>
        <button type="button" className="agm-btn" disabled>  Apple</button>
      </div>
      <div style={{ textAlign: "center", margin: "20px 0 16px", fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.16em" }}>
        O CONTINUÁ CON
      </div>

      <label className="agm-label">EMAIL</label>
      <input className="agm-input" type="email" required value={email}
        onChange={(e) => setEmail(e.target.value)} placeholder="lionel@10.ar" />

      <label className="agm-label" style={{ marginTop: 14 }}>CONTRASEÑA</label>
      <input className="agm-input" type="password" required value={password}
        onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••" />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, fontSize: 12 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--fg-2)" }}>
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Mantener sesión
        </label>
        <a className="agm-mono" style={{ color: "var(--green-deep)" }}>Olvidé la contraseña</a>
      </div>

      {error && (
        <div className="agm-pill agm-pill-red" style={{ marginTop: 14, width: "100%", justifyContent: "center" }}>
          {error}
        </div>
      )}

      <button type="submit" className="agm-btn agm-btn-primary" disabled={loading}
        style={{ width: "100%", marginTop: 20, justifyContent: "center", opacity: loading ? 0.5 : 1 }}>
        {loading ? "ENTRANDO..." : "ENTRAR"}
      </button>
    </form>
  );
}
