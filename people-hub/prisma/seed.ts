// Seed the database with FICTIONAL data only.
// Creates a small org (HR admin, HR, managers, employees), the six rating guides,
// one open review cycle, and a few placeholder notifications.
//
// Run with: npm run db:seed

import { PrismaClient, Role, RatingGuideCategory, GuideKind } from "@prisma/client";

const prisma = new PrismaClient();

// --- fictional people ---
// email, name, role, dept, guide, managerEmail, appRoles
type P = {
  email: string; name: string; role: string; dept: string;
  guide: RatingGuideCategory | null; manager?: string; appRoles?: Role[];
};

const PEOPLE: P[] = [
  { email: "ceo@example.test", name: "Sara Haddad", role: "Chief Executive Officer", dept: "Executive", guide: "SUPPORT_FUNCTIONS" },
  { email: "wafa@example.test", name: "Wafa Al-Sayed", role: "People Ops Lead", dept: "People", guide: "SUPPORT_FUNCTIONS", appRoles: ["HR_ADMIN"], manager: "ceo@example.test" },
  { email: "hr.partner@example.test", name: "Dana Fischer", role: "HR Business Partner", dept: "People", guide: "SUPPORT_FUNCTIONS", manager: "wafa@example.test", appRoles: ["HR"] },

  { email: "a.khan@example.test", name: "Amir Khan", role: "Head of Product", dept: "Product", guide: "PRODUCT" , manager: "ceo@example.test" },
  { email: "s.park@example.test", name: "Soo-jin Park", role: "Engineering Manager", dept: "Engineering", guide: "ENGINEERING" , manager: "ceo@example.test" },
  { email: "r.mansour@example.test", name: "Rana Mansour", role: "Commercial Lead", dept: "Commercial", guide: "SALES_COMMERCIAL" , manager: "ceo@example.test" },

  { email: "l.ito@example.test", name: "Leo Ito", role: "Senior PM", dept: "Product", guide: "PRODUCT", manager: "a.khan@example.test" },
  { email: "n.haddad@example.test", name: "Nour Haddad", role: "Account Executive", dept: "Commercial", guide: "SALES_COMMERCIAL", manager: "r.mansour@example.test" },
  { email: "m.rossi@example.test", name: "Marco Rossi", role: "Backend Engineer", dept: "Engineering", guide: "ENGINEERING", manager: "s.park@example.test" },
  { email: "p.novak@example.test", name: "Petra Novak", role: "Frontend Engineer", dept: "Engineering", guide: null, manager: "s.park@example.test" },
  { email: "j.silva@example.test", name: "Joana Silva", role: "Ops Analyst", dept: "Operations", guide: "OPERATIONS", manager: "wafa@example.test" },
];

async function main() {
  console.log("Seeding fictional data…");

  // Clear (safe: this is a prototype DB).
  await prisma.notification.deleteMany();
  await prisma.roleAssignment.deleteMany();
  await prisma.reviewRating.deleteMany();
  await prisma.review.deleteMany();
  await prisma.reviewCycle.deleteMany();
  await prisma.ratingGuideAnchor.deleteMany();
  await prisma.ratingGuideVersion.deleteMany();
  await prisma.ratingGuide.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.employee.deleteMany();

  // Pass 1: people (no manager links yet).
  for (const p of PEOPLE) {
    await prisma.employee.create({
      data: {
        workEmail: p.email,
        displayName: p.name,
        role: p.role,
        department: p.dept,
        location: "Bahrain",
        ratingGuideCategory: p.guide,
        employmentStatus: "ACTIVE",
      },
    });
  }

  // Pass 2: manager links + app roles.
  for (const p of PEOPLE) {
    if (p.manager) {
      const mgr = await prisma.employee.findUnique({ where: { workEmail: p.manager } });
      await prisma.employee.update({
        where: { workEmail: p.email },
        data: { managerId: mgr!.id },
      });
    }
    if (p.appRoles?.length) {
      const emp = await prisma.employee.findUnique({ where: { workEmail: p.email } });
      for (const role of p.appRoles) {
        await prisma.roleAssignment.create({
          data: { employeeId: emp!.id, role },
        });
      }
    }
  }

  // Rating guides: five performance + one values. One current version each,
  // with placeholder anchors for the three criteria (performance) / four values.
  const CRITERIA = ["IMPACT", "QUALITY", "DELIVERY"];
  const VALUES = [
    "Innovate with Impact",
    "Drive Exceptional Results",
    "Deliver Value to Customers",
    "Win Collectively",
  ];
  const cats: RatingGuideCategory[] = [
    "ENGINEERING", "SALES_COMMERCIAL", "PRODUCT", "OPERATIONS", "SUPPORT_FUNCTIONS",
  ];

  for (const cat of cats) {
    const guide = await prisma.ratingGuide.create({
      data: { kind: "PERFORMANCE", category: cat },
    });
    const version = await prisma.ratingGuideVersion.create({
      data: { guideId: guide.id, version: 1, isCurrent: true },
    });
    for (const item of CRITERIA) {
      for (let score = 1; score <= 5; score++) {
        await prisma.ratingGuideAnchor.create({
          data: {
            versionId: version.id,
            item,
            score,
            text: `${cat} — ${item} — level ${score} (placeholder anchor)`,
          },
        });
      }
    }
  }

  const valuesGuide = await prisma.ratingGuide.create({
    data: { kind: "VALUES", category: null },
  });
  const vv = await prisma.ratingGuideVersion.create({
    data: { guideId: valuesGuide.id, version: 1, isCurrent: true },
  });
  for (const item of VALUES) {
    for (let score = 1; score <= 5; score++) {
      await prisma.ratingGuideAnchor.create({
        data: { versionId: vv.id, item, score, text: `${item} — level ${score} (placeholder)` },
      });
    }
  }

  // One open cycle so the top bar shows something.
  await prisma.reviewCycle.create({
    data: { type: "QUARTERLY", label: "Q2 2026", isOpen: true },
  });
  // An open annual values cycle for Stage 3.
  await prisma.reviewCycle.create({
    data: { type: "ANNUAL_VALUES", label: "Values 2026", isOpen: true },
  });
  await prisma.reviewCycle.create({
    data: { type: "YEAR_END", label: "Year-End 2026", isOpen: true },
  });
  // A couple of placeholder notifications for the HR admin.
  const wafa = await prisma.employee.findUnique({ where: { workEmail: "wafa@example.test" } });
  await prisma.notification.createMany({
    data: [
      { recipientId: wafa!.id, title: "Welcome to People Hub", body: "This is a placeholder notification. Reminders arrive in a later phase.", channel: "IN_APP" },
      { recipientId: wafa!.id, title: "Rating guide unassigned", body: "One employee has no rating-guide category assigned.", channel: "IN_APP" },
    ],
  });

  console.log(`Seeded ${PEOPLE.length} employees, 6 rating guides, 1 cycle.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
