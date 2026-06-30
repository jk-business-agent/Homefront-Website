// Records a security-relevant event for a user (sign-in, password/2FA change, etc).
// Best-effort: never throws.
import { prisma } from "./prisma";
import { clientIp } from "./rate-limit";

export async function logSecurityEvent(userId: string, type: string, req?: Request) {
  try {
    await prisma.securityEvent.create({
      data: {
        userId,
        type,
        ip: req ? clientIp(req) : null,
        userAgent: req?.headers.get("user-agent")?.slice(0, 300) ?? null,
      },
    });
  } catch {
    // logging must never break the action
  }
}
