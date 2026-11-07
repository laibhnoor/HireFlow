import { redirect } from "next/navigation";

import { auth } from "@/auth";

/**
 * Server-side guard for workspace routes. Returns the signed-in user or
 * redirects to the login page.
 */
export async function requireUser() {
  const session = await auth();
  const user = session?.user;

  if (!user?.id || !user.email) {
    redirect("/login");
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name ?? user.email.split("@")[0],
  };
}
