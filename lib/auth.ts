import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession, configuredSessionSecret } from "@/lib/auth-core";

export async function isAdminAuthenticated() {
  const jar = await cookies();
  return verifySession(
    jar.get(SESSION_COOKIE)?.value,
    configuredSessionSecret(),
  );
}
