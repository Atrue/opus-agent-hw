"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError, type Bug } from "@/lib/api-client";
import { useSession } from "@/lib/use-session";

export default function NewBugPage() {
  const router = useRouter();
  const { loading, session } = useSession();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <p className="muted">Загрузка…</p>;
  if (!session) {
    return (
      <div className="empty">
        Требуется вход. <Link href="/login">Войти</Link>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const bug = await apiFetch<Bug>("/api/bugs", {
        method: "POST",
        json: { title, description },
      });
      router.replace(`/bugs/${bug.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 401 ? "Сессия истекла — войдите заново." : err.message);
      } else {
        setError(String(err));
      }
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 560, margin: "0 auto" }}>
      <h1>Новый багрепорт</h1>
      {error && <div className="error">{error}</div>}
      <form onSubmit={submit}>
        <label htmlFor="title">Что случилось? (кратко, 3–200 символов)</label>
        <input
          id="title"
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder="Например: Кнопка «Сохранить» ничего не делает"
        />
        <label htmlFor="description">Подробности: шаги, ожидаемое и фактическое поведение</label>
        <textarea
          id="description"
          className="textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="1. Открыть страницу …
2. Нажать …
Ожидал: …
Получил: …"
        />
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Отправка…" : "Отправить баг"}
        </button>{" "}
        <Link className="btn" href="/bugs">
          Отмена
        </Link>
      </form>
    </div>
  );
}
