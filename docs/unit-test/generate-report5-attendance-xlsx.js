import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

const ROOT = path.resolve(process.cwd());

const INPUT_CSV = path.join(
  ROOT,
  'docs',
  'unit-test',
  'Report5.1_Attendance_Unit_Test.csv',
);
const OUTPUT_XLSX = path.join(
  ROOT,
  'docs',
  'unit-test',
  'Report5.1_Attendance_Unit_Test.xlsx',
);

function parseCsvLine(line) {
  // Minimal CSV parser for our generated CSV (supports quoted fields).
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function hexArgb(hex) {
  return { argb: `FF${hex.replace('#', '').toUpperCase()}` };
}

function applyBorder(cell, style = 'thin') {
  cell.border = {
    top: { style },
    left: { style },
    bottom: { style },
    right: { style },
  };
}

async function main() {
  if (!fs.existsSync(INPUT_CSV)) {
    throw new Error(`Missing input CSV: ${INPUT_CSV}`);
  }

  const csv = fs.readFileSync(INPUT_CSV, 'utf8').trimEnd();
  const lines = csv.split(/\r?\n/).filter((l) => l.length > 0);

  // Header rows are 1..5, then UTCID table starts at line index 6.
  const header = lines.slice(0, 5).map(parseCsvLine);
  const table = lines.slice(6).map(parseCsvLine);

  const utcids = table
    .filter((r) => r[0] && r[0].startsWith('UTCID'))
    .map((r) => r[0]);

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('External', {
    views: [{ state: 'frozen', xSplit: 3, ySplit: 7 }],
  });

  // Column sizing similar to screenshot.
  ws.getColumn(1).width = 14; // A
  ws.getColumn(2).width = 28; // B
  ws.getColumn(3).width = 18; // C

  const gridStartCol = 4; // D (first UTCID column)
  const gridStartRow = 8; // row with Condition/Precondition headers

  // Make enough columns for UTCIDs
  for (let i = 0; i < utcids.length; i++) {
    ws.getColumn(gridStartCol + i).width = 4;
  }

  // Colors (approximate)
  const COLOR_GREEN = hexArgb('C6EFCE');
  const COLOR_BLUE = hexArgb('002060');
  const COLOR_LIGHTBLUE = hexArgb('D9E1F2');
  const COLOR_WHITE = hexArgb('FFFFFF');
  const COLOR_YELLOW = hexArgb('FFF2CC');

  // --- Top header block (rows 1-5) ---
  // Row 1: Code Module | value ; ModuleName | value ; Method | value
  ws.mergeCells('A1:B1');
  ws.mergeCells('C1:D1');
  ws.mergeCells('E1:F1');
  ws.mergeCells('G1:H1');
  ws.getCell('A1').value = 'Code Module';
  ws.getCell('C1').value = 'ModuleName';
  ws.getCell('E1').value = 'Method';
  ws.getCell('B1').value = header[0]?.[1] || 'Attendance';
  ws.getCell('D1').value = header[0]?.[3] || 'AttendanceService';
  ws.getCell('F1').value = header[0]?.[5] || 'attendance.service.js';

  // Row 2
  ws.mergeCells('A2:B2');
  ws.mergeCells('C2:D2');
  ws.mergeCells('E2:F2');
  ws.getCell('A2').value = 'Created By';
  ws.getCell('C2').value = header[1]?.[2] || '<Developer Name>';
  ws.getCell('E2').value = 'Executed By';

  // Row 3
  ws.mergeCells('A3:B3');
  ws.mergeCells('C3:F3');
  ws.getCell('A3').value = 'Test requirement';
  ws.getCell('C3').value = header[2]?.[1] || '';

  // Row 4 stats headers
  ws.getCell('A4').value = 'Passed';
  ws.getCell('C4').value = 'Failed';
  ws.getCell('E4').value = 'Untested';
  ws.getCell('F4').value = 'N/A/B';
  ws.getCell('G4').value = 'Total Test Cases';

  // Row 5 stats values (default)
  ws.getCell('A5').value = Number(header[4]?.[0] ?? 0);
  ws.getCell('C5').value = Number(header[4]?.[1] ?? 0);
  ws.getCell('E5').value = Number(header[4]?.[2] ?? utcids.length);
  ws.getCell('F5').value = Number(header[4]?.[3] ?? 0);
  ws.getCell('G5').value = Number(header[4]?.[4] ?? utcids.length);

  // Style header block
  const labelCells = ['A1', 'C1', 'E1', 'A2', 'E2', 'A3', 'A4', 'C4', 'E4', 'F4', 'G4'];
  for (const addr of labelCells) {
    const cell = ws.getCell(addr);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: COLOR_GREEN };
    cell.font = { bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    applyBorder(cell);
  }
  // Values in top block
  for (const addr of ['B1', 'D1', 'F1', 'C2', 'C3']) {
    const cell = ws.getCell(addr);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: COLOR_LIGHTBLUE };
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    applyBorder(cell);
  }

  // Stats styling
  for (const addr of ['A5', 'C5', 'E5', 'F5', 'G5']) {
    const cell = ws.getCell(addr);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: COLOR_YELLOW };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    applyBorder(cell);
    cell.font = { bold: true };
  }

  // --- UTCID vertical header row (row 7) ---
  const utcHeaderRow = 7;
  for (let i = 0; i < utcids.length; i++) {
    const cell = ws.getCell(utcHeaderRow, gridStartCol + i);
    cell.value = utcids[i];
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: COLOR_BLUE };
    cell.font = { bold: true, color: COLOR_WHITE };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      textRotation: 90,
      wrapText: true,
    };
    applyBorder(cell);
  }

  // Left blue band for row 7 (A7:C7)
  ws.mergeCells('A7:C7');
  const band = ws.getCell('A7');
  band.fill = { type: 'pattern', pattern: 'solid', fgColor: COLOR_BLUE };
  applyBorder(band);

  // --- Main grid headers (row 8): Condition / Precondition ---
  ws.getCell('A8').value = 'Condition';
  ws.getCell('B8').value = 'Precondition';
  ws.mergeCells('B8:C8');

  for (const addr of ['A8', 'B8']) {
    const cell = ws.getCell(addr);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: COLOR_BLUE };
    cell.font = { bold: true, color: COLOR_WHITE };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    applyBorder(cell);
  }

  // Grid body rows count (roughly like screenshot)
  const bodyRows = 22;
  for (let r = 9; r < 9 + bodyRows; r++) {
    // Left band (A..C) blue fill
    for (let c = 1; c <= 3; c++) {
      const cell = ws.getCell(r, c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: COLOR_BLUE };
      applyBorder(cell);
    }
    // Grid cells with dropdown
    for (let i = 0; i < utcids.length; i++) {
      const cell = ws.getCell(r, gridStartCol + i);
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: COLOR_WHITE };
      cell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"O,"'], // O or blank
      };
      applyBorder(cell);
    }
  }

  // --- Footer sections (Confirm/Return/Exception/Log/Result...) ---
  const footerStart = 31;
  const footerLabels = [
    { row: footerStart, col: 1, value: 'Confirm' },
    { row: footerStart, col: 2, value: 'Return' },
    { row: footerStart + 7, col: 1, value: 'Exception' },
    { row: footerStart + 9, col: 1, value: 'Log message' },
    { row: footerStart + 12, col: 1, value: 'Result' },
  ];
  for (const item of footerLabels) {
    const cell = ws.getCell(item.row, item.col);
    cell.value = item.value;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: COLOR_BLUE };
    cell.font = { bold: true, color: COLOR_WHITE };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    applyBorder(cell);
  }
  // Fill left band for footer area rows
  for (let r = footerStart; r <= footerStart + 15; r++) {
    for (let c = 1; c <= 3; c++) {
      const cell = ws.getCell(r, c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: COLOR_BLUE };
      applyBorder(cell);
    }
    for (let i = 0; i < utcids.length; i++) {
      const cell = ws.getCell(r, gridStartCol + i);
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: COLOR_WHITE };
      cell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"O,"'],
      };
      applyBorder(cell);
    }
  }

  // Put "Type / Passed-Failed / Executed Date / Defect ID" hints similar to screenshot
  ws.getCell(footerStart + 13, 2).value =
    'Type(N : Normal, A : Abnormal, B : Boundary)';
  ws.getCell(footerStart + 14, 2).value = 'Passed/Failed';
  ws.getCell(footerStart + 15, 2).value = 'Executed Date';
  ws.getCell(footerStart + 16, 2).value = 'Defect ID';
  for (const r of [footerStart + 13, footerStart + 14, footerStart + 15, footerStart + 16]) {
    const cell = ws.getCell(r, 2);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: COLOR_BLUE };
    cell.font = { bold: true, color: COLOR_WHITE };
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    applyBorder(cell);
  }

  // Outline border around whole block area (approx A1 to last column footer)
  const lastCol = gridStartCol + utcids.length - 1;
  const lastRow = footerStart + 16;
  for (let c = 1; c <= lastCol; c++) {
    applyBorder(ws.getCell(1, c));
    applyBorder(ws.getCell(lastRow, c));
  }
  for (let r = 1; r <= lastRow; r++) {
    applyBorder(ws.getCell(r, 1));
    applyBorder(ws.getCell(r, lastCol));
  }

  await workbook.xlsx.writeFile(OUTPUT_XLSX);
  // eslint-disable-next-line no-console
  console.log(`Generated: ${OUTPUT_XLSX}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

