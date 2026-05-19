import { PrismaClient } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding hospice-emr...");

  // Wipe existing (dev only)
  await prisma.auditLog.deleteMany();
  await prisma.note.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.eSAS.deleteMany();
  await prisma.pPS.deleteMany();
  await prisma.medication.deleteMany();
  await prisma.allergy.deleteMany();
  await prisma.caregiver.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();

  const pw = await bcrypt.hash("hospice123!", 10);

  // Users
  const [admin, md, rn1, rn2, sw] = await Promise.all([
    prisma.user.create({
      data: { email: "admin@clinic.test", passwordHash: pw, name: "Admin User", role: "ADMIN" },
    }),
    prisma.user.create({
      data: { email: "md@clinic.test", passwordHash: pw, name: "Dr. Sarah Chen", role: "MD" },
    }),
    prisma.user.create({
      data: { email: "rn@clinic.test", passwordHash: pw, name: "Maria Lopez RN", role: "RN" },
    }),
    prisma.user.create({
      data: { email: "rn2@clinic.test", passwordHash: pw, name: "James Patel RN", role: "RN" },
    }),
    prisma.user.create({
      data: { email: "sw@clinic.test", passwordHash: pw, name: "Linda Brooks MSW", role: "SW" },
    }),
  ]);

  // Patients (fictional)
  const patients = await Promise.all([
    prisma.patient.create({
      data: {
        mrn: "HSP-1001",
        firstName: "Eleanor",
        lastName: "Whitfield",
        dob: new Date("1942-03-12"),
        sex: "F",
        phone: "705-555-0123",
        address: "12 Maple St, Sault Ste Marie, ON",
        primaryDx: "Metastatic breast cancer",
        primaryDxIcd: "C50.911",
        codeStatus: "DNR",
        levelOfCare: "ROUTINE",
        prognosisMo: 4,
        consentOnFile: true,
        contacts: {
          create: [
            { name: "John Whitfield", relationship: "Husband", phone: "705-555-0124", isPrimary: true },
            { name: "Sarah Whitfield", relationship: "Daughter", phone: "705-555-0125" },
          ],
        },
        allergies: {
          create: [{ substance: "Penicillin", reaction: "Rash", severity: "moderate" }],
        },
        meds: {
          create: [
            { name: "Morphine sulfate", dose: "10mg", route: "PO", frequency: "q4h", indication: "Pain", controlled: true },
            { name: "Lorazepam", dose: "0.5mg", route: "SL", frequency: "q6h PRN", indication: "Anxiety", controlled: true },
            { name: "Ondansetron", dose: "4mg", route: "PO", frequency: "q8h PRN", indication: "Nausea" },
          ],
        },
      },
    }),
    prisma.patient.create({
      data: {
        mrn: "HSP-1002",
        firstName: "Robert",
        lastName: "Anderson",
        dob: new Date("1938-07-22"),
        sex: "M",
        phone: "705-555-0145",
        primaryDx: "End-stage COPD",
        primaryDxIcd: "J44.9",
        codeStatus: "DNR_DNI",
        levelOfCare: "CONTINUOUS",
        prognosisMo: 2,
        consentOnFile: true,
        contacts: {
          create: [{ name: "Margaret Anderson", relationship: "Wife", phone: "705-555-0146", isPrimary: true }],
        },
        meds: {
          create: [
            { name: "Morphine sulfate", dose: "5mg", route: "SC", frequency: "q4h", indication: "Dyspnea", controlled: true },
            { name: "Albuterol", dose: "2.5mg", route: "neb", frequency: "q4h PRN", indication: "SOB" },
            { name: "Furosemide", dose: "40mg", route: "PO", frequency: "daily", indication: "Edema" },
          ],
        },
      },
    }),
    prisma.patient.create({
      data: {
        mrn: "HSP-1003",
        firstName: "Margaret",
        lastName: "OBrien",
        dob: new Date("1935-11-05"),
        sex: "F",
        primaryDx: "Alzheimer disease, late stage",
        primaryDxIcd: "G30.9",
        codeStatus: "COMFORT_ONLY",
        levelOfCare: "ROUTINE",
        prognosisMo: 3,
        consentOnFile: true,
        lockbox: false,
        contacts: {
          create: [{ name: "Thomas OBrien", relationship: "Son (POA)", phone: "705-555-0167", isPrimary: true }],
        },
        meds: {
          create: [
            { name: "Acetaminophen", dose: "650mg", route: "PO", frequency: "q6h", indication: "Comfort" },
            { name: "Haloperidol", dose: "0.5mg", route: "SC", frequency: "q6h PRN", indication: "Agitation" },
          ],
        },
      },
    }),
    prisma.patient.create({
      data: {
        mrn: "HSP-1004",
        firstName: "Harold",
        lastName: "Kowalski",
        dob: new Date("1945-02-18"),
        sex: "M",
        primaryDx: "Pancreatic carcinoma",
        primaryDxIcd: "C25.9",
        codeStatus: "DNR",
        levelOfCare: "ROUTINE",
        prognosisMo: 5,
        consentOnFile: true,
        contacts: {
          create: [{ name: "Ella Kowalski", relationship: "Wife", phone: "705-555-0188", isPrimary: true }],
        },
        meds: {
          create: [
            { name: "Hydromorphone", dose: "2mg", route: "PO", frequency: "q4h", indication: "Pain", controlled: true },
            { name: "Pantoprazole", dose: "40mg", route: "PO", frequency: "daily", indication: "GI prophylaxis" },
          ],
        },
      },
    }),
    prisma.patient.create({
      data: {
        mrn: "HSP-1005",
        firstName: "Patricia",
        lastName: "Singh",
        dob: new Date("1950-09-30"),
        sex: "F",
        primaryDx: "End-stage CHF",
        primaryDxIcd: "I50.9",
        codeStatus: "DNR",
        levelOfCare: "ROUTINE",
        prognosisMo: 6,
        consentOnFile: true,
        contacts: {
          create: [{ name: "Raj Singh", relationship: "Husband", phone: "705-555-0199", isPrimary: true }],
        },
        meds: {
          create: [
            { name: "Furosemide", dose: "80mg", route: "PO", frequency: "BID", indication: "CHF" },
            { name: "Morphine", dose: "2mg", route: "PO", frequency: "q6h PRN", indication: "Dyspnea", controlled: true },
          ],
        },
      },
    }),
  ]);

  // ESAS + PPS history (trends declining)
  for (const p of patients) {
    const days = 14;
    for (let i = days; i >= 0; i -= 2) {
      const date = new Date(Date.now() - i * 86400000);
      const decline = (days - i) / days;
      await prisma.eSAS.create({
        data: {
          patientId: p.id,
          pain: Math.min(10, Math.round(3 + decline * 5 + Math.random() * 2)),
          tiredness: Math.min(10, Math.round(4 + decline * 4)),
          drowsiness: Math.min(10, Math.round(2 + decline * 5)),
          nausea: Math.round(Math.random() * 4),
          appetite: Math.min(10, Math.round(3 + decline * 5)),
          shortBreath: Math.min(10, Math.round(2 + decline * 4)),
          depression: Math.round(2 + Math.random() * 3),
          anxiety: Math.round(2 + Math.random() * 4),
          wellbeing: Math.min(10, Math.round(4 + decline * 4)),
          recordedAt: date,
          recordedById: rn1.id,
        },
      });
      await prisma.pPS.create({
        data: {
          patientId: p.id,
          score: Math.max(10, 70 - Math.round(decline * 50)),
          recordedAt: date,
          recordedById: rn1.id,
        },
      });
    }
  }

  // A few signed notes
  await prisma.note.create({
    data: {
      patientId: patients[0].id,
      authorId: rn1.id,
      subjective: "Pt reports increasing hip pain, 7/10 at worst.",
      objective: "Alert, oriented x3. Skin warm and dry. No new edema.",
      assessment: "Pain not controlled on current regimen. Disease progression noted.",
      plan: "Increase morphine 10mg → 15mg PO q4h. Recheck in 48h. Family supported.",
      transcript: "Visited Mrs Whitfield. Pain seven out of ten in her hip. She's still alert. We're increasing morphine to 15 milligrams every four hours and I'll come back in two days.",
      signed: true,
      signedAt: new Date(),
      aiModel: "gpt-4o",
      aiConfidence: 0.92,
    },
  });

  console.log("✅ Seed complete");
  console.log("");
  console.log("Login credentials (password = hospice123!):");
  console.log("  admin@clinic.test   (ADMIN)");
  console.log("  md@clinic.test      (MD)");
  console.log("  rn@clinic.test      (RN)");
  console.log("  sw@clinic.test      (SW)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
