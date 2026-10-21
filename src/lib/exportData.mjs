import { zipSync, strToU8 } from "fflate";
const value = (v) =>
  v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
const xml = (s) =>
  value(s)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const safe = (v) =>
  /^[\s]*[=+\-@]/.test(value(v)) ? "'" + value(v) : value(v);
export const csvCell = (v) => {
  const s = safe(v).replaceAll('"', '""');
  return /[",\n\r]/.test(s) ? `"${s}"` : s;
};
export function csvBytes(rows) {
  if (!rows.length) return new Uint8Array();
  const keys = Object.keys(rows[0]);
  return strToU8(
    "\uFEFF" +
      [
        keys.map(csvCell).join(","),
        ...rows.map((r) => keys.map((k) => csvCell(r[k])).join(",")),
      ].join("\r\n"),
  );
}
function column(n) {
  let s = "";
  for (n++; n; n = Math.floor((n - 1) / 26))
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}
export function xlsxBytes(rows) {
  const keys = Object.keys(rows[0] || {}),
    all = [keys, ...rows.map((r) => keys.map((k) => r[k]))];
  const sheet =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' +
    all
      .map(
        (r, i) =>
          `<row r="${i + 1}">` +
          r
            .map(
              (v, j) =>
                `<c r="${column(j)}${i + 1}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`,
            )
            .join("") +
          "</row>",
      )
      .join("") +
    "</sheetData></worksheet>";
  // All cells use inlineStr: imported values can never become formulas or external links.
  const files = {
    "[Content_Types].xml":
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    "_rels/.rels":
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    "xl/workbook.xml":
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Evidencija" sheetId="1" r:id="rId1"/></sheets></workbook>',
    "xl/_rels/workbook.xml.rels":
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    "xl/worksheets/sheet1.xml": sheet,
  };
  return zipSync(
    Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)])),
  );
}
export function downloadRows(rows, filename, format = "csv") {
  if (!rows?.length) return;
  const bytes = format === "xlsx" ? xlsxBytes(rows) : csvBytes(rows),
    url = URL.createObjectURL(
      new Blob([bytes], {
        type:
          format === "xlsx"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "text/csv;charset=utf-8",
      }),
    );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.replace(/\.(csv|xlsx)$/i, "") + "." + format;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
