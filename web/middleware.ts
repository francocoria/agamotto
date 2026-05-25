import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Public routes — no auth required
const PUBLIC_PATHS = [
  "/",
  "/sobre",
  "/login",
  "/signup",
  "/auth/callback",
  "/auth/signout",
];
// Routes that need any authenticated user
const PROTECTED_PREFIXES = [
  "/comparar",
  "/escenarios",
  "/llave",
  "/modelo",
  "/pivotes",
  "/jugadores",
  "/matches",
  "/teams",
  "/venues",
  "/partido",
];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/_next") || pathname.startsWith("/data") || pathname.startsWith("/api")) return true;
  if (pathname.startsWith("/auth/")) return true;
  if (/\.(svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|css|js|json|map)$/.test(pathname)) return true;
  return false;
}

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Redirect protected routes if not authed
  if (!user && isProtected(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  // Redirect authed users away from /login or /signup
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    const from = request.nextUrl.searchParams.get("from");
    url.pathname = from && from.startsWith("/") ? from : "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
