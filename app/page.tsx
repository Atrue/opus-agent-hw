"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase-browser";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    getSupabase()
      .auth.getSession()
      .then(({ data }) => router.replace(data.session ? "/bugs" : "/login"));
  }, [router]);

  return <p className="muted">Загрузка…</p>;
}
