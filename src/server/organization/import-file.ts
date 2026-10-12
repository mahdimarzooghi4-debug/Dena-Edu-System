import { inflateRawSync } from "node:zlib";

const MAX_INPUT_BYTES = 5 * 1024 * 1024;
const MAX_EXPANDED_BYTES = 20 * 1024 * 1024;
const MAX_ROWS = 501; // header + at most 500 records
const MAX_COLUMNS = 16;

export type ImportedRow = { rowNumber: number; values: Record<string, string> };

function csvRows(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') { field += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field.length === 0) quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      row.push(field); field = "";
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      if (rows.length > MAX_ROWS) throw new Error("too_many_rows");
    } else field += char;
  }
  if (quoted) throw new Error("invalid_csv_quotes");
  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  if (rows.length > MAX_ROWS) throw new Error("too_many_rows");
  return rows;
}

function xmlEntities(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

function zipFiles(bytes: Buffer) {
  if (bytes.length > MAX_INPUT_BYTES) throw new Error("file_too_large");
  const min = Math.max(0, bytes.length - 65_557);
  let end = -1;
  for (let offset = bytes.length - 22; offset >= min; offset -= 1) {
    if (bytes.readUInt32LE(offset) === 0x06054b50) { end = offset; break; }
  }
  if (end < 0) throw new Error("invalid_xlsx_zip");
  const count = bytes.readUInt16LE(end + 10);
  const directorySize = bytes.readUInt32LE(end + 12);
  let cursor = bytes.readUInt32LE(end + 16);
  if (count < 1 || count > 128 || directorySize > 128 * 1024) throw new Error("invalid_xlsx_directory");
  const out = new Map<string, Buffer>();
  let expandedTotal = 0;
  for (let entry = 0; entry < count; entry += 1) {
    if (cursor + 46 > bytes.length || bytes.readUInt32LE(cursor) !== 0x02014b50) throw new Error("invalid_xlsx_directory");
    const method = bytes.readUInt16LE(cursor + 10);
    const compressedSize = bytes.readUInt32LE(cursor + 20);
    const expandedSize = bytes.readUInt32LE(cursor + 24);
    const nameSize = bytes.readUInt16LE(cursor + 28);
    const extraSize = bytes.readUInt16LE(cursor + 30);
    const commentSize = bytes.readUInt16LE(cursor + 32);
    const localOffset = bytes.readUInt32LE(cursor + 42);
    const name = bytes.subarray(cursor + 46, cursor + 46 + nameSize).toString("utf8");
    cursor += 46 + nameSize + extraSize + commentSize;
    if (name.includes("..") || name.startsWith("/") || expandedSize > MAX_EXPANDED_BYTES) throw new Error("invalid_xlsx_entry");
    expandedTotal += expandedSize;
    if (expandedTotal > MAX_EXPANDED_BYTES) throw new Error("xlsx_expansion_limit");
    if (!/^xl\/(?:sharedStrings\.xml|workbook\.xml|_rels\/workbook\.xml\.rels|worksheets\/sheet\d+\.xml)$/.test(name)) continue;
    if (localOffset + 30 > bytes.length || bytes.readUInt32LE(localOffset) !== 0x04034b50) throw new Error("invalid_xlsx_entry");
    const localNameSize = bytes.readUInt16LE(localOffset + 26);
    const localExtraSize = bytes.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameSize + localExtraSize;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > bytes.length) throw new Error("invalid_xlsx_entry");
    const packed = bytes.subarray(dataStart, dataEnd);
    const unpacked = method === 0 ? Buffer.from(packed)
      : method === 8 ? inflateRawSync(packed, { maxOutputLength: MAX_EXPANDED_BYTES })
        : null;
    if (!unpacked || unpacked.length !== expandedSize) throw new Error("unsupported_xlsx_compression");
    out.set(name, unpacked);
  }
  return out;
}

function readXlsx(bytes: Buffer): string[][] {
  const files = zipFiles(bytes);
  const workbook = files.get("xl/workbook.xml")?.toString("utf8") ?? "";
  const firstSheet = /<sheet\b[^>]*\br:id="([^"]+)"/.exec(workbook)?.[1];
  const relationships = files.get("xl/_rels/workbook.xml.rels")?.toString("utf8") ?? "";
  const target = firstSheet && [...relationships.matchAll(/<Relationship\b([^>]*)\/?\s*>/g)]
    .map((match) => match[1])
    .map((attributes) => ({
      id: /\bId="([^"]+)"/.exec(attributes)?.[1],
      target: /\bTarget="([^"]+)"/.exec(attributes)?.[1],
    }))
    .find((relation) => relation.id === firstSheet)?.target;
  const sheetPath = target ? (target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`) : "xl/worksheets/sheet1.xml";
  const sheet = files.get(sheetPath);
  if (!sheet) throw new Error("missing_first_sheet");
  const shared = files.get("xl/sharedStrings.xml")?.toString("utf8") ?? "";
  const sharedStrings = [...shared.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((match) =>
    [...match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((part) => xmlEntities(part[1])).join(""),
  );
  const xml = sheet.toString("utf8");
  const rowMatches = [...xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)];
  if (rowMatches.length > MAX_ROWS) throw new Error("too_many_rows");
  return rowMatches.map((rowMatch) => {
    if (/<f\b/.test(rowMatch[1])) throw new Error("xlsx_formulas_not_allowed");
    const row: string[] = [];
    for (const cell of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const ref = /\br="([A-Z]+)\d+"/.exec(cell[1])?.[1];
      if (!ref) throw new Error("invalid_xlsx_cell");
      const column = [...ref].reduce((number, letter) => number * 26 + letter.charCodeAt(0) - 64, 0) - 1;
      if (column >= MAX_COLUMNS) throw new Error("too_many_columns");
      const type = /\bt="([^"]+)"/.exec(cell[1])?.[1];
      const raw = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(cell[2])?.[1] ??
        [...cell[2].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((part) => xmlEntities(part[1])).join("");
      const value = type === "s" ? sharedStrings[Number(raw)] : xmlEntities(raw);
      if (value === undefined) throw new Error("invalid_shared_string");
      row[column] = value;
    }
    return row.map((value) => value ?? "");
  });
}

const requiredHeaders = ["firstName", "lastName", "nationalCode", "birthDate", "gender", "phoneNumber"];
export function parseStudentImport(bytes: Buffer, fileName: string): ImportedRow[] {
  if (bytes.length > MAX_INPUT_BYTES) throw new Error("file_too_large");
  let rows: string[][];
  if (/\.csv$/i.test(fileName)) {
    const csv = bytes.toString("utf8");
    if (csv.includes("\uFFFD")) throw new Error("invalid_csv_encoding");
    rows = csvRows(csv.replace(/^\uFEFF/, ""));
  } else if (/\.xlsx$/i.test(fileName)) rows = readXlsx(bytes);
  else throw new Error("unsupported_file_type");
  if (rows.length < 2) throw new Error("empty_import");
  const headers = rows[0].map((header) => header.trim());
  if (headers.length > MAX_COLUMNS || requiredHeaders.some((key) => !headers.includes(key)) ||
      headers.some((key) => ![...requiredHeaders, "email"].includes(key)) ||
      new Set(headers).size !== headers.length) throw new Error("invalid_headers");
  return rows.slice(1).map((row, index) => ({
    rowNumber: index + 2,
    values: Object.fromEntries(headers.map((header, column) => [header, row[column]?.trim() ?? ""])),
  }));
}
