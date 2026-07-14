// Employee import module.
//
// Stage 1: parses a Zoho-style CSV, validates it, produces a preview with
// per-row flags (new / update / unchanged / error), and commits on confirm.
// Minimum-necessary fields only; extra columns ignored. Every import audited.
//
// No real employee data in the prototype — a heuristic warns if the upload
// looks like production data.

import { prisma } from "@/shared/lib/prisma";
import { recordAudit } from "@/core/audit";
import type { EmploymentStatus, RatingGuideCategory } from "@prisma/client";

export interface ParsedRow {
  rowNumber: number;
  workEmail: string;
  displayName: string;
  role?: string;
  department?: string;
  location?: string;
  employmentStatus?: string;
  managerEmail?: string;
  ratingGuideCategory?: string;
}

export type RowFlag = "NEW" | "UPDATE" | "UNCHANGED" | "ERROR" | "WARNING";

export interface PreviewRow {
  rowNumber: number;
  flag: RowFlag;
  workEmail: string;
  displayName: string;
  managerEmail?: string;
  ratingGuideCategory?: string;
  messages: string[];
}

const REQUIRED = ["workEmail", "displayName"];
const VALID_STATUS = ["ACTIVE", "INACTIVE"];
const VALID_GUIDE = [
  "ENGINEERING",
  "SALES_COMMERCIAL",
  "PRODUCT",
  "OPERATIONS",
  "SUPPORT_FUNCTIONS",
];

// A tiny dependency-free CSV parser (handles quoted fields and commas).
export function parseCsv(text: string): { header: string[]; rows: string[][] } {
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter((l) => l.length > 0);
  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') inQ = false;
        else cur += ch;
      } else {
        if (ch === '"') inQ = true;
        else if (ch === ",") { out.push(cur); cur = ""; }
        else cur += ch;
      }
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const header = lines.length ? parseLine(lines[0]) : [];
  const rows = lines.slice(1).map(parseLine);
  return { header, rows };
}

// Map header names (case-insensitive, space/underscore tolerant) to our fields.
function normaliseKey(k: string): string {
  return k.toLowerCase().replace(/[\s_]+/g, "");
}
const FIELD_ALIASES: Record<string, keyof ParsedRow> = {
  workemail: "workEmail",
  email: "workEmail",
  displayname: "displayName",
  name: "displayName",
  role: "role",
  jobtitle: "role",
  department: "department",
  location: "location",
  employmentstatus: "employmentStatus",
  status: "employmentStatus",
  manageremail: "managerEmail",
  manager: "managerEmail",
  ratingguidecategory: "ratingGuideCategory",
  guide: "ratingGuideCategory",
};

export function mapRows(header: string[], rows: string[][]): ParsedRow[] {
  const idx: Partial<Record<keyof ParsedRow, number>> = {};
  header.forEach((h, i) => {
    const field = FIELD_ALIASES[normaliseKey(h)];
    if (field) idx[field] = i;
  });
  return rows.map((cells, r) => {
    const get = (f: keyof ParsedRow) =>
      idx[f] !== undefined ? cells[idx[f]!] || undefined : undefined;
    return {
      rowNumber: r + 2, // +2: 1-based, plus header row
      workEmail: get("workEmail") ?? "",
      displayName: get("displayName") ?? "",
      role: get("role"),
      department: get("department"),
      location: get("location"),
      employmentStatus: get("employmentStatus"),
      managerEmail: get("managerEmail"),
      ratingGuideCategory: get("ratingGuideCategory"),
    };
  });
}

// Looks-like-production heuristic: real-looking corporate emails in bulk.
function looksLikeProduction(rows: ParsedRow[]): boolean {
  const real = rows.filter((r) =>
    /@tarabut\.com$/i.test(r.workEmail)
  ).length;
  return real > 0;
}

export async function buildPreview(rows: ParsedRow[]): Promise<{
  preview: PreviewRow[];
  summary: { new: number; update: number; unchanged: number; error: number; warning: number };
  productionWarning: boolean;
}> {
  const emailsInFile = new Set(rows.map((r) => r.workEmail.toLowerCase()));
  const existing = await prisma.employee.findMany({
    select: { workEmail: true, displayName: true, department: true },
  });
  const existingByEmail = new Map(
    existing.map((e) => [e.workEmail.toLowerCase(), e])
  );

  const preview: PreviewRow[] = [];
  const summary = { new: 0, update: 0, unchanged: 0, error: 0, warning: 0 };

  for (const row of rows) {
    const messages: string[] = [];
    let flag: RowFlag = "NEW";

    for (const req of REQUIRED) {
      if (!(row as any)[req]) messages.push(`Missing required field: ${req}`);
    }
    if (row.workEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(row.workEmail)) {
      messages.push(`Invalid email: "${row.workEmail}"`);
    }
    if (
      row.employmentStatus &&
      !VALID_STATUS.includes(row.employmentStatus.toUpperCase())
    ) {
      messages.push(
        `Status "${row.employmentStatus}" not recognised (expected Active / Inactive)`
      );
    }
    if (
      row.ratingGuideCategory &&
      !VALID_GUIDE.includes(row.ratingGuideCategory.toUpperCase())
    ) {
      messages.push(
        `Rating-guide category "${row.ratingGuideCategory}" not one of the five; assign manually later`
      );
    }
    if (row.managerEmail && !emailsInFile.has(row.managerEmail.toLowerCase())) {
      const mgrExists = existingByEmail.has(row.managerEmail.toLowerCase());
      if (!mgrExists) messages.push(`Manager "${row.managerEmail}" not found`);
    }

    const hasBlockingError = messages.some(
     (m) => m.startsWith("Missing") || m.startsWith("Invalid") || m.includes("not found") || m.startsWith("Status")
    )

    if (hasBlockingError) {
      flag = "ERROR";
    } else if (existingByEmail.has(row.workEmail.toLowerCase())) {
      const prev = existingByEmail.get(row.workEmail.toLowerCase())!;
      const changed =
        prev.displayName !== row.displayName ||
        (prev.department ?? undefined) !== (row.department ?? undefined);
      flag = changed ? "UPDATE" : "UNCHANGED";
      if (flag === "UPDATE" && prev.department !== row.department)
        messages.push("Department changed");
    } else if (messages.length > 0) {
      flag = "WARNING";
    }

    summary[flag.toLowerCase() as keyof typeof summary]++;
    preview.push({
      rowNumber: row.rowNumber,
      flag,
      workEmail: row.workEmail,
      displayName: row.displayName,
      managerEmail: row.managerEmail,
      ratingGuideCategory: row.ratingGuideCategory,
      messages,
    });
  }

  return { preview, summary, productionWarning: looksLikeProduction(rows) };
}

// Commit: upsert non-error rows in two passes (people first, then manager links).
export async function commitImport(
  rows: ParsedRow[],
  actorEmail: string
): Promise<{ imported: number; updated: number; skipped: number }> {
  const { preview } = await buildPreview(rows);
  const flagByRow = new Map(preview.map((p) => [p.rowNumber, p.flag]));

  let imported = 0;
  let updated = 0;
  let skipped = 0;

  // Pass 1: upsert people (no manager link yet).
  for (const row of rows) {
    const flag = flagByRow.get(row.rowNumber);
    if (flag === "ERROR") { skipped++; continue; }
    const status = (row.employmentStatus?.toUpperCase() ?? "ACTIVE") as EmploymentStatus;
    const guide = row.ratingGuideCategory
      ? (VALID_GUIDE.includes(row.ratingGuideCategory.toUpperCase()) ? (row.ratingGuideCategory.toUpperCase() as RatingGuideCategory)
       : null)
      : null;
    const existing = await prisma.employee.findUnique({
      where: { workEmail: row.workEmail },
    });
    await prisma.employee.upsert({
      where: { workEmail: row.workEmail },
      create: {
        workEmail: row.workEmail,
        displayName: row.displayName,
        role: row.role,
        department: row.department,
        location: row.location,
        employmentStatus: status,
        ratingGuideCategory: guide,
      },
      update: {
        displayName: row.displayName,
        role: row.role,
        department: row.department,
        location: row.location,
        employmentStatus: status,
        ratingGuideCategory: guide,
      },
    });
    if (existing) updated++; else imported++;
  }

  // Pass 2: link managers now that everyone exists.
  for (const row of rows) {
    if (!row.managerEmail) continue;
    const flag = flagByRow.get(row.rowNumber);
    if (flag === "ERROR") continue;
    const manager = await prisma.employee.findUnique({
      where: { workEmail: row.managerEmail },
    });
    if (manager) {
      await prisma.employee.update({
        where: { workEmail: row.workEmail },
        data: { managerId: manager.id },
      });
    }
  }

  await recordAudit({
    actorEmail,
    action: "import.run",
    entityType: "Employee",
    detail: `imported=${imported}, updated=${updated}, skipped=${skipped}`,
  });

  return { imported, updated, skipped };
}
