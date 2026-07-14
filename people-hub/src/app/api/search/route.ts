import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth";
import { globalSearch } from "@/core/search";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json([], { status: 401 });
  const q = req.nextUrl.searchParams.get("q") ?? "";
  // globalSearch itself returns [] for non-HR users (defence in depth).
  const results = await globalSearch(user, q);
  return NextResponse.json(results);
}
