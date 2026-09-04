import { parseCsv, transformCsvToRIn3 } from "./csv-importer.js";
import { SAMPLE_RIN3_CSV } from "./sample-data.js";
import { importRegisterEntriesBatch, getRegisterEntries } from "../db/queries.js";

export async function ensureRIn3DataSeeded() {
  try {
    const existing = await getRegisterEntries("R.IN.3");
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