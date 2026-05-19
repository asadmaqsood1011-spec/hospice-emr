import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const visits = await prisma.visit.findMany({
    where: {
      providerId: session.user.id,
      startedAt: { gte: new Date(Date.now() - 30 * 86400000) },
    },
    include: { patient: { select: { firstName: true, lastName: true, mrn: true } } },
    orderBy: { startedAt: "asc" },
    take: 200,
  });

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Hospice EMR//Visits//EN",
    "CALSCALE:GREGORIAN",
    ...visits.flatMap((v) => {
      const start = toIcs(v.scheduledFor ?? v.startedAt);
      const end = toIcs(v.endedAt ?? new Date((v.scheduledFor ?? v.startedAt).getTime() + (v.durationMin ?? 60) * 60000));
      return [
        "BEGIN:VEVENT",
        `UID:${v.id}@hospice-emr`,
        `DTSTAMP:${toIcs(new Date())}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:${escapeIcs(`${v.type.replace(/_/g, " ")} - ${v.patient.firstName} ${v.patient.lastName}`)}`,
        `DESCRIPTION:${escapeIcs(`MRN ${v.patient.mrn}`)}`,
        "END:VEVENT",
      ];
    }),
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="hospice-visits.ics"',
      "Cache-Control": "no-store",
    },
  });
}

function toIcs(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}
