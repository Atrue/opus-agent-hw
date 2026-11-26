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
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pickFile = (picked: File | null) => {
    setFileError(null);
    if (!picked) {
      setFile(null);
      return;
    }
    const okTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!okTypes.includes(picked.type)) {
      setFileError("Скриншот должен быть PNG, JPEG или WebP");
      return;
    }
    if (picked.size > 5 * 1024 * 1024) {
      setFileError("Файл больше 5 МБ");
      return;
    }
    setFile(picked);
  };

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
      if (file) {
        const form = new FormData();
        form.set("file", file);
        try {
          await apiFetch(`/api/bugs/${bug.id}/screenshot`, { method: "POST", body: form });
        } catch (uploadErr) {
          setError(
            `Баг создан, но скриншот не загрузился: ${uploadErr instanceof Error ? uploadErr.message : uploadErr}`,
          );
          setBusy(false);
          return;
        }
      }
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
        <label htmlFor="screenshot">Скриншот (PNG/JPEG/WebP, до 5 МБ, необязательно)</label>
        <input
          id="screenshot"
          className="input"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
        {fileError && <div className="error">{fileError}</div>}
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
