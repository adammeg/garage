import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (!request.cookies.get("atelier_session")?.value) return NextResponse.redirect(new URL("/connexion", request.url));
  return NextResponse.next();
}

export const config = { matcher: ["/"] };
