// Records an admin action to the audit log. Best-effort — never throws.
import { prisma } from "./prisma";

export async function logAudit(admin: { id: string; name: string }, action: string, detail?: string) {
  try {
    await prisma.auditLog.create({ data: { adminId: admin.id, adminName: admin.name, action, detail: detail ?? null } });
  } catch {
    // logging must never break the action
  }
}
