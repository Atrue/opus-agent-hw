"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, ApiError, fmtDate, type Bug } from "@/lib/api-client";
import { useSession } from "@/lib/use-session";

export default function BugDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { loading, session, role } = useSession();

  const [bug, setBug] = useState<Bug | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tagsInput, setTagsInput] = useState("");

  const isStaff = role === "moderator" || role === "admin";

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiFetch<Bug>(`/api/bugs/${id}`);
      setBug(data);
      setTagsInput((data.tags ?? []).join(", "));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    }
  }, [id]);

  useEffect(() => {
    if (loading || !session) return;
    void load();
  }, [loading, session, load]);

  if (loading) return <p className="muted">Загрузка…</p>;
  if (!session) {
    return (
      <div className="empty">
        Требуется вход. <Link href="/login">Войти</Link>
      </div>
    );
  }
  if (error) {
    return (
      <div className="empty">
        {error.includes("не найден") || error.includes("404")
          ? "Баг не найден или недоступен."
          : `Ошибка: ${error}`}
        <div style={{ marginTop: 12 }}>
          <Link className="btn" href="/bugs">
            ← К списку
          </Link>
        </div>
      </div>
    );
  }
  if (!bug) return <p className="muted">Загрузка…</p>;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const resolve = () =>
    run(() => apiFetch<Bug>(`/api/bugs/${id}`, { method: "PATCH", json: { status: "resolved" } }));

  const saveTags = () =>
    run(() =>
      apiFetch<Bug>(`/api/bugs/${id}`, {
        method: "PATCH",
        json: { tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean) },
      }),
    );

  const remove = async () => {
    if (!confirm("Удалить баг безвозвратно?")) return;
    setBusy(true);
    setActionError(null);
    try {
      await apiFetch(`/api/bugs/${id}`, { method: "DELETE" });
      router.replace("/bugs");
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <div className="row">
        <h1 style={{ margin: 0 }}>{bug.title}</h1>
        <span className={`badge badge-${bug.status}`}>
          {bug.status === "open" ? "открыт" : "решён"}
        </span>
      </div>

      <p className="muted">
        Отправлен {fmtDate(bug.created_at)}
        {bug.status === "resolved" ? ` · обновлён ${fmtDate(bug.updated_at)}` : ""}
      </p>

      {bug.tags.length > 0 && (
        <div>
          {bug.tags.map((t) => (
            <span className="chip" key={t}>
              {t}
            </span>
          ))}
        </div>
      )}

      {bug.description && <p className="pre">{bug.description}</p>}

      {bug.similar_bug_ids !== null && (
        <div style={{ marginTop: 12 }}>
          <h2>Похожие баги (AI)</h2>
          {bug.similar_bug_ids.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              Не найдены.
            </p>
          ) : (
            <ul className="mono" style={{ margin: "4px 0", paddingLeft: 20 }}>
              {bug.similar_bug_ids.map((sid) => (
                <li key={sid}>
                  <Link href={`/bugs/${sid}`}>{sid.slice(0, 8)}…</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {actionError && <div className="error" style={{ marginTop: 12 }}>{actionError}</div>}

      <div className="actions">
        <Link className="btn" href="/bugs">
          ← К списку
        </Link>
        {isStaff && bug.status === "open" && (
          <button className="btn btn-primary" onClick={resolve} disabled={busy}>
            Пометить решённым
          </button>
        )}
        {role === "admin" && (
          <button className="btn btn-danger" onClick={remove} disabled={busy}>
            Удалить
          </button>
        )}
      </div>

      {isStaff && (
        <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
          <label htmlFor="tags">Теги (через запятую) — правка staff</label>
          <input
            id="tags"
            className="input"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="ui, auth, payments"
          />
          <button className="btn" onClick={saveTags} disabled={busy}>
            Сохранить теги
          </button>
        </div>
      )}
    </div>
  );
}
