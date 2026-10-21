import { test } from "node:test";
import assert from "node:assert/strict";
import { unzipSync, strFromU8 } from "fflate";
import { csvBytes, xlsxBytes } from "../src/lib/exportData.mjs";
test("CSV protects formulas and XLSX preserves Croatian characters as literal cells", () => {
  const rows = [
    {
      ime: "Željka Čović",
      napomena: '=HYPERLINK("https://example.invalid")',
      adresa: "Škola <1> & 2",
    },
  ];
  const csv = strFromU8(csvBytes(rows));
  assert(csv.includes("Željka Čović"));
  assert(csv.includes("'=HYPERLINK"));
  const zip = unzipSync(xlsxBytes(rows)),
    sheet = strFromU8(zip["xl/worksheets/sheet1.xml"]);
  assert(sheet.includes("Željka Čović"));
  assert(sheet.includes("&lt;1&gt; &amp; 2"));
  assert(sheet.includes('t="inlineStr"'));
  assert(!sheet.includes("<f>"));
  assert(zip["xl/workbook.xml"]);
});
