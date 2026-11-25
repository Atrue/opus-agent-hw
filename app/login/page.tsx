"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase-browser";
import { useSession } from "@/lib/use-session";

export default function LoginPage() {
  const router = useRouter();
  const { loading, session } = useSession();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session) router.replace("/bugs");
  }, [loading, session, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const supabase = getSupabase();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message === "Invalid login credentials" ? "Неверный email или пароль" : error.message);
        setBusy(false);
        return;
      }
      router.replace("/bugs");
      return;
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(
        /already/i.test(error.message)
          ? "Пользователь с таким email уже зарегистрирован"
          : error.message,
      );
      setBusy(false);
      return;
    }
    if (data.session) {
      router.replace("/bugs");
      return;
    }
    setInfo("Аккаунт создан. Подтвердите email по письму, затем войдите.");
    setBusy(false);
    setMode("login");
  };

  return (
    <div className="card" style={{ maxWidth: 420, margin: "40px auto" }}>
      <h1>{mode === "login" ? "Вход" : "Регистрация"}</h1>
      {error && <div className="error">{error}</div>}
      {info && <div className="info">{info}</div>}
      <form onSubmit={submit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          className="input"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <label htmlFor="password">Пароль</label>
        <input
          id="password"
          className="input"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
        <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: "100%" }}>
          {busy ? "…" : mode === "login" ? "Войти" : "Зарегистрироваться"}
        </button>
      </form>
      <p className="muted" style={{ marginTop: 12 }}>
        {mode === "login" ? "Нет аккаунта? " : "Уже есть аккаунт? "}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setMode(mode === "login" ? "register" : "login");
            setError(null);
            setInfo(null);
          }}
        >
          {mode === "login" ? "Зарегистрируйтесь" : "Войдите"}
        </a>
      </p>
    </div>
  );
}
