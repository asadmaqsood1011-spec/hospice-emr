import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

const retentionDays = Number(process.env.AUDIT_RETENTION_DAYS ?? "2555"); // 7 years
const cutoff = new Date(Date.now() - retentionDays * 86400000);

async function main() {
  const rows = await prisma.auditLog.findMany({
    where: { ts: { lt: cutoff } },
    orderBy: { ts: "asc" },
  });

  await mkdir("audit-archives", { recursive: true });
  const file = path.join("audit-archives", `audit-before-${cutoff.toISOString().slice(0, 10)}.jsonl`);
  await writeFile(file, rows.map((row) => JSON.stringify(row)).join("\n") + (rows.length ? "\n" : ""));

  console.log(`Archived ${rows.length} audit rows to ${file}`);
  console.log("Archive-only. AuditLog rows are append-only and must not be pruned by the app.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
