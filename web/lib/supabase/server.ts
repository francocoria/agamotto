import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function getServerSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {
          // server components can't write cookies; route handlers/middleware do it
        },
        remove() {
          // idem
        },
      },
    },
  );
}

export async function getServerUser() {
  const supabase = getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
