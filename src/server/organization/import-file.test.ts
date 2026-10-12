import { describe, expect, it } from "vitest";
import { parseStudentImport } from "./import-file";

function storedZip(files: Record<string, string>) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let localOffset = 0;
  const entries = Object.entries(files);
  for (const [name, content] of entries) {
    const nameBytes = Buffer.from(name);
    const data = Buffer.from(content);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6); local.writeUInt16LE(0, 8);
    local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    localParts.push(local, nameBytes, data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6); central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10); central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24); central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(localOffset, 42);
    centralParts.push(central, nameBytes);
    localOffset += local.length + nameBytes.length + data.length;
  }
  const directory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(localOffset, 16);
  return Buffer.concat([...localParts, directory, end]);
}

describe("organization student spreadsheet import", () => {
  it("parses CSV quoted cells and only returns the declared columns", () => {
    const csv = [
      "firstName,lastName,nationalCode,birthDate,gender,phoneNumber,email",
      'سارا,"محمدی, رضایی",1234567891,2011-08-16,female,+989121234567,sara@example.test',
    ].join("\n");
    expect(parseStudentImport(Buffer.from(csv), "students.csv")).toEqual([{
      rowNumber: 2,
      values: {
        firstName: "سارا", lastName: "محمدی, رضایی", nationalCode: "1234567891",
        birthDate: "2011-08-16", gender: "female", phoneNumber: "+989121234567",
        email: "sara@example.test",
      },
    }]);
  });

  it("reads a simple XLSX first sheet and rejects formulas", () => {
    const row = (n: number, cells: string[]) => `<row r="${n}">${cells.map((value, i) => {
      const column = String.fromCharCode(65 + i);
      return `<c r="${column}${n}" t="inlineStr"><is><t>${value}</t></is></c>`;
    }).join("")}</row>`;
    const headings = ["firstName", "lastName", "nationalCode", "birthDate", "gender", "phoneNumber"];
    const values = ["Sara", "Mohammadi", "1234567891", "2011-08-16", "female", "+989121234567"];
    const xml = `<worksheet><sheetData>${row(1, headings)}${row(2, values)}</sheetData></worksheet>`;
    const bytes = storedZip({ "xl/worksheets/sheet1.xml": xml });
    expect(parseStudentImport(bytes, "students.xlsx")[0].values).toMatchObject({
      firstName: "Sara", nationalCode: "1234567891", phoneNumber: "+989121234567",
    });
    const formulaZip = storedZip({ "xl/worksheets/sheet1.xml": "<worksheet><sheetData><row><f>SUM(A1:A2)</f></row></sheetData></worksheet>" });
    expect(() => parseStudentImport(formulaZip, "students.xlsx")).toThrow("xlsx_formulas_not_allowed");
  });
});
