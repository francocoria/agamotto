"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accept, setAccept] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accept) { setError("Tenés que aceptar los términos."); return; }
    setLoading(true);
    setError(null);
    const supabase = getBrowserSupabase();
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setDone(true);
  };

  const onGoogle = async () => {
    const supabase = getBrowserSupabase();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  if (done) {
    return (
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <div className="agm-display" style={{ fontSize: 20, color: "var(--green-deep)" }}>
          CHEQUEÁ TU EMAIL
        </div>
        <p style={{ marginTop: 12, color: "var(--fg-2)", fontSize: 13 }}>
          Te enviamos un link a <strong>{email}</strong> para confirmar tu cuenta.
        </p>
      </div>
    );
  }

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

      <label className="agm-label">NOMBRE</label>
      <input className="agm-input" type="text" required value={name}
        onChange={(e) => setName(e.target.value)} placeholder="Lionel Mendoza" />

      <label className="agm-label" style={{ marginTop: 14 }}>EMAIL</label>
      <input className="agm-input" type="email" required value={email}
        onChange={(e) => setEmail(e.target.value)} placeholder="lionel@10.ar" />

      <label className="agm-label" style={{ marginTop: 14 }}>CONTRASEÑA</label>
      <input className="agm-input" type="password" required minLength={8} value={password}
        onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••" />

      <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, fontSize: 12, color: "var(--fg-2)" }}>
        <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
        Acepto los <a className="agm-mono" style={{ color: "var(--green-deep)" }}>Términos</a> y la <a className="agm-mono" style={{ color: "var(--green-deep)" }}>Política de Privacidad</a>.
      </label>

      {error && (
        <div className="agm-pill agm-pill-red" style={{ marginTop: 14, width: "100%", justifyContent: "center" }}>
          {error}
        </div>
      )}

      <button type="submit" className="agm-btn agm-btn-primary" disabled={loading}
        style={{ width: "100%", marginTop: 20, justifyContent: "center", opacity: loading ? 0.5 : 1 }}>
        {loading ? "CREANDO CUENTA..." : "CREAR CUENTA GRATIS"}
      </button>
    </form>
  );
}
