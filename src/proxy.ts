import { NextResponse } from "next/server";
import { auth } from "@/auth";

const authRoutes = new Set(["/login", "/register"]);

export default auth((request) => {
  const pathname = request.nextUrl.pathname;
  const isLoggedIn = Boolean(request.auth?.user);

  if (pathname.startsWith("/docs") && !isLoggedIn) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (authRoutes.has(pathname) && isLoggedIn) {
    return NextResponse.redirect(new URL("/docs", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/docs/:path*", "/login", "/register"],
};
