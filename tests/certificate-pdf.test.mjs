import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
// Isolate the existing PDF helpers from the App, so no browser session or database is started.
const source = await readFile(
  new URL("../src/App.jsx", import.meta.url),
  "utf8",
);
const helpers = source.slice(
  source.indexOf("async function buildCertificatePdf("),
  source.indexOf("async function downloadBinaryFile("),
);
const gradeHelpers = source.slice(
  source.indexOf("function extractGrades("),
  source.indexOf("async function buildCertificatePdf("),
);
const context = new Function(
  "fetch",
  `const formatDate=value=>value?new Intl.DateTimeFormat('hr-HR').format(new Date(value)):'-';\n${gradeHelpers}\n${helpers}\nreturn {pdfBuild:buildCertificatePdf,genderResolve:resolveStudentGender};`,
)(async (path) => ({
  ok: true,
  arrayBuffer: async () => {
    const b = await readFile(new URL("../public" + path, import.meta.url));
    return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  },
}));
test("Certificate PDF retains every real grade, Croatian glyphs and pages without inventing success or gender", async () => {
  const summary = {
    school_name: "Škola Čakovec",
    full_name: "Željka Čović",
    gender: "Ž",
    class_name: "4.A",
    school_year_label: "2026./2027.",
    final_grades: Array.from({ length: 63 }, (_, i) => ({
      subject_name: `Čitanje ${i + 1}`,
      value: 3,
    })),
    certificate_payload: {
      gender: "Ž",
      birth_country: "Slovenija",
      citizenship: "slovensko",
    },
  };
  const bytes = await context.pdfBuild(summary);
  const doc = await PDFDocument.load(bytes);
  assert.equal(doc.getPageCount(), 3);
  await writeFile("/tmp/skolehr-certificate-many-subjects.pdf", bytes);
  const { execFileSync } = await import("node:child_process");
  const text = execFileSync(
    "python",
    [
      "-c",
      "import fitz;d=fitz.open('/tmp/skolehr-certificate-many-subjects.pdf');print(''.join(p.get_text() for p in d))",
    ],
    { encoding: "utf8" },
  );
  for (let i = 1; i <= 63; i++) assert(text.includes(`Čitanje ${i}`));
  assert(text.includes("Željka Čović"));
  assert(text.includes("rođena"));
  assert(text.includes("Slovenija"));
  assert(text.includes("PROBNI ISPIS"));
  assert(!text.includes("odličan (5) uspjehom"));
  assert.equal(context.genderResolve({ full_name: "Ana Test" }, {}).key, null);
});
