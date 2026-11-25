"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "./supabase-browser";

export type Role = "user" | "moderator" | "admin";
export type SessionState = { loading: boolean; session: Session | null; role: Role };

const roleOf = (session: Session | null): Role => {
  const role = session?.user.app_metadata?.role;
  return role === "moderator" || role === "admin" ? role : "user";
};

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({
    loading: true,
    session: null,
    role: "user",
  });

  useEffect(() => {
    const sb = getSupabase();
    sb.auth.getSession().then(({ data }) =>
      setState({ loading: false, session: data.session, role: roleOf(data.session) }),
    );
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) =>
      setState({ loading: false, session, role: roleOf(session) }),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  return state;
}
