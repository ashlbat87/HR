"use server";

import { getCurrentUser } from "@/core/auth";
import { isHRAdmin } from "@/core/access";
import { parseCsv, mapRows, buildPreview, commitImport } from "@/core/employees/import";

export async function previewAction(csvText: string) {
  const user = await getCurrentUser();
  if (!user || !isHRAdmin(user)) {
    return { error: "HR Admin access required." };
  }
  const { header, rows } = parseCsv(csvText);
  if (header.length === 0) return { error: "The file appears to be empty." };
  const mapped = mapRows(header, rows);
  const result = await buildPreview(mapped);
  return { ...result, csvText };
}

export async function commitAction(csvText: string) {
  const user = await getCurrentUser();
  if (!user || !isHRAdmin(user)) {
    return { error: "HR Admin access required." };
  }
  const { header, rows } = parseCsv(csvText);
  const mapped = mapRows(header, rows);
  const result = await commitImport(mapped, user.email);
  return result;
}
