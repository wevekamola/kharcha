import { parse } from 'csv-parse/sync';
import xlsx from 'xlsx';

/**
 * Reads a file buffer and returns an array of plain objects (one per data row).
 * @param {Buffer} buffer
 * @param {'delimited'|'csv'|'excel'} format
 * @returns {Array<Object>}
 */
export function readFile(buffer, format) {
  if (format === 'excel') return readExcel(buffer);
  return readDelimited(buffer);
}

function readDelimited(buffer) {
  const text = buffer.toString('utf8');
  const records = parse(text, {
    columns:          true,
    skip_empty_lines: true,
    trim:             true,
    // First line may be blank — bom + relax_column_count handles edge cases
    bom:              true,
    relax_column_count: true,
  });
  return records.filter(r => {
    // Drop rows where all values are empty (header-only artifacts)
    return Object.values(r).some(v => v !== '' && v != null);
  });
}

function readExcel(buffer) {
  const wb = xlsx.read(buffer, { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(ws, { defval: '' });
  return rows;
}
