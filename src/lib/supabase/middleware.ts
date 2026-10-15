import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/notifications/send"];\nconst OWNER_PATHS = ["/owner-login", "/owners"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.includes(pathname);\n  const isOwnerPath = OWNER_PATHS.some((path) => pathname === path || (path === "/owners" && pathname.startsWith("/owners/")));

  let isStaff = false;
  if (user) {
    const { data: staff } = await supabase
      .from("staff_profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    isStaff = !!staff;
  }

  // Founder routes have their own server-side membership/capability guard.\n  // Do not send founders through the staff_profiles gate; that would make the\n  // dedicated owner login and workspace unreachable.\n  if (isOwnerPath) return supabaseResponse;\n\n  if (!isStaff && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isStaff && isPublicPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return supabaseResponse;
}
