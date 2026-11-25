"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/use-session";

const ROLE_LABEL: Record<string, string> = {
  user: "пользователь",
  moderator: "модератор",
  admin: "админ",
};

export function AppHeader() {
  const { loading, session, role } = useSession();
  const router = useRouter();

  const logout = async () => {
    await (await import("@/lib/supabase-browser")).getSupabase().auth.signOut();
    router.replace("/login");
  };

  return (
    <header className="header">
      <div className="header-inner">
        <Link className="brand" href="/bugs">
          Bug<span>Trace</span>
        </Link>
        {loading ? (
          <span className="muted">…</span>
        ) : session ? (
          <div className="header-user">
            <span className="badge badge-role">{ROLE_LABEL[role]}</span>
            <span>{session.user.email}</span>
            <button className="btn" onClick={logout}>
              Выйти
            </button>
          </div>
        ) : (
          <Link className="btn btn-primary" href="/login">
            Войти
          </Link>
        )}
      </div>
    </header>
  );
}
