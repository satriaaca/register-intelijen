import { parseCsv, transformCsvToRIn3 } from "./csv-importer.js";
import { SAMPLE_RIN3_CSV } from "./sample-data.js";
import { importRegisterEntriesBatch } from "../db/queries.js";
import { db } from "../db/index.js";
import { registerEntries } from "../db/schema.js";
import { eq } from "drizzle-orm";

export async function ensureRIn3DataSeeded() {
  try {
    const existing = await db
      .select({ id: registerEntries.id })
      .from(registerEntries)
      .where(eq(registerEntries.registerCode, "R.IN.3"))
      .limit(1);

    if (existing.length === 0) {
      console.log("Seeding 124 initial R.IN.3 records from user CSV...");
      const rawRows = parseCsv(SAMPLE_RIN3_CSV);
      const transformed = transformCsvToRIn3(rawRows);
      await importRegisterEntriesBatch("R.IN.3", transformed, { clearExisting: false });
      console.log(`Successfully seeded ${transformed.length} R.IN.3 records.`);
    }
  } catch (err) {
    console.warn("Could not auto-seed R.IN.3 records (will allow user to import via UI):", err);
  }
}