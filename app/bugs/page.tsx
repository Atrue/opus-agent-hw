"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, fmtDate, type Bug } from "@/lib/api-client";
import { useSession } from "@/lib/use-session";

type Tab = "mine" | "resolved" | "all";

const TABS: { key: Tab; label: string; staffOnly?: boolean }[] = [
  { key: "mine", label: "Мои баги" },
  { key: "resolved", label: "Решённые" },
  { key: "all", label: "Все", staffOnly: true },
];

export default function BugsPage() {
  const { loading, session, role } = useSession();
  const [tab, setTab] = useState<Tab>("mine");
  const [items, setItems] = useState<Bug[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isStaff = role === "moderator" || role === "admin";
  const staff = isStaff;

  const load = useCallback(async () => {
    setError(null);
    setItems(null);
    const params = new URLSearchParams();
    if (tab === "mine") params.set("mine", "1");
    if (tab === "resolved") params.set("status", "resolved");
    try {
      const data = await apiFetch<{ items: Bug[] }>(`/api/bugs?${params}`);
      setItems(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [tab]);

  useEffect(() => {
    if (loading) return;
    if (!session) return;
    if (tab === "all" && !staff) setTab("mine");
    else void load();
  }, [loading, session, tab, staff, load]);

  if (loading) return <p className="muted">Загрузка…</p>;
  if (!session) {
    return (
      <div className="empty">
        Требуется вход. <Link href="/login">Войти</Link>
      </div>
    );
  }

  return (
    <>
      <div className="row">
        <h1>Багрепорты</h1>
        <Link className="btn btn-primary" href="/bugs/new">
          + Новый баг
        </Link>
      </div>

      <div className="tabs">
        {TABS.filter((t) => !t.staffOnly || staff).map((t) => (
          <button
            key={t.key}
            className={`tab${tab === t.key ? " active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
        <button className="tab" onClick={() => void load()}>
          ⟳ Обновить
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {items === null && !error && <p className="muted">Загрузка…</p>}
      {items !== null && items.length === 0 && (
        <div className="empty">
          {tab === "mine" ? "Вы ещё не отправляли баги." : "Здесь пока пусто."}
        </div>
      )}
      {items?.map((bug) => (
        <div className="card" key={bug.id}>
          <div className="row">
            <Link className="bug-title" href={`/bugs/${bug.id}`}>
              {bug.title}
            </Link>
            <span className={`badge badge-${bug.status}`}>
              {bug.status === "open" ? "открыт" : "решён"}
            </span>
          </div>
          <div style={{ marginTop: 6 }}>
            {bug.tags.map((t) => (
              <span className="chip" key={t}>
                {t}
              </span>
            ))}
          </div>
          <p className="muted" style={{ margin: "8px 0 0" }}>
            {fmtDate(bug.created_at)}
          </p>
        </div>
      ))}
    </>
  );
}
