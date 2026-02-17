import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

function buildCsvUrl(sheetId: string, tabName: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
}

async function fetchSheetCsv(sheetId: string, tabName: string): Promise<string> {
  const url = buildCsvUrl(sheetId, tabName);
  console.log(`Fetching "${tabName}" tab...\n`);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch "${tabName}" (HTTP ${response.status})`);
  }

  return response.text();
}

function parseCsvToRows(csv: string): Record<string, string>[] {
  const lines = csv.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
  console.log('Headers found:', headers);
  console.log('');

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < Math.min(6, lines.length); i++) {
    const values = lines[i].split(',').map(v => v.replace(/^"|"$/g, '').trim());
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    rows.push(row);
  }

  return rows;
}

async function main() {
  if (!SHEET_ID) {
    throw new Error('GOOGLE_SHEET_ID not set');
  }

  const csv = await fetchSheetCsv(SHEET_ID, 'LinkedIn');

  console.log("=== RAW CSV (first 300 chars) ===");
  console.log(csv.substring(0, 300));
  console.log("\n=== END RAW CSV ===\n");

  const rows = parseCsvToRows(csv);

  console.log(`Found ${rows.length} data rows\n`);

  rows.forEach((row, idx) => {
    console.log(`Row ${idx + 1}:`);
    console.log(`  Status: "${row['Status']}"`);
    console.log(`  Name: "${row['Name']}"`);
    console.log(`  Date: "${row['Date']}"`);
    console.log(`  LinkedIn URL: "${row['LinkedIn URL']}"`);
    console.log('');
  });
}

main().catch(console.error);
