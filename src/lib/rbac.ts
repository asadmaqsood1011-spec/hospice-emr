import type { Role } from "@/generated/prisma";

type Permission =
  | "patient.read"
  | "patient.create"
  | "patient.update"
  | "patient.delete"
  | "note.read"
  | "note.create"
  | "note.sign"
  | "med.prescribe"
  | "audit.read"
  | "user.manage";

const PERMS: Record<Role, Permission[]> = {
  ADMIN: [
    "patient.read", "patient.create", "patient.update", "patient.delete",
    "note.read", "note.create", "note.sign",
    "med.prescribe",
    "audit.read", "user.manage",
  ],
  MD: [
    "patient.read", "patient.create", "patient.update",
    "note.read", "note.create", "note.sign",
    "med.prescribe",
  ],
  RN: [
    "patient.read", "patient.create", "patient.update",
    "note.read", "note.create", "note.sign",
  ],
  SW: ["patient.read", "note.read", "note.create", "note.sign"],
  CHAPLAIN: ["patient.read", "note.read", "note.create", "note.sign"],
  AIDE: ["patient.read", "note.read", "note.create"],
  VOLUNTEER: ["patient.read", "note.read"],
};

export function can(role: Role | undefined | null, perm: Permission): boolean {
  if (!role) return false;
  return PERMS[role].includes(perm);
}

export function requirePerm(role: Role | undefined | null, perm: Permission): void {
  if (!can(role, perm)) {
    throw new Error(`Forbidden: role ${role ?? "anon"} lacks ${perm}`);
  }
}
