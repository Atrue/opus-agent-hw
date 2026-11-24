import { NextResponse } from "next/server";

export const json = <T>(data: T, status = 200) => NextResponse.json(data, { status });

export const fail = (status: number, message: string) =>
  NextResponse.json({ error: message }, { status });
