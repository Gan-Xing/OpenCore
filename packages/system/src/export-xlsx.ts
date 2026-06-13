import { strToU8, zipSync } from 'fflate';

export const OPENCORE_XLSX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function createOpenCoreXlsxWorkbookBase64(input: {
  worksheetRows: readonly (readonly string[])[];
  generatedAt: string;
  sheetName: string;
}): string {
  const workbook = zipSync(
    {
      '[Content_Types].xml': strToU8(createXlsxContentTypesXml()),
      '_rels/.rels': strToU8(createXlsxRootRelationshipsXml()),
      'docProps/app.xml': strToU8(createXlsxAppPropertiesXml()),
      'docProps/core.xml': strToU8(
        createXlsxCorePropertiesXml(input.generatedAt),
      ),
      'xl/workbook.xml': strToU8(createXlsxWorkbookXml(input.sheetName)),
      'xl/_rels/workbook.xml.rels': strToU8(
        createXlsxWorkbookRelationshipsXml(),
      ),
      'xl/styles.xml': strToU8(createXlsxStylesXml()),
      'xl/worksheets/sheet1.xml': strToU8(
        createXlsxWorksheetXml(input.worksheetRows),
      ),
    },
    { level: 6 },
  );

  return Buffer.from(workbook).toString('base64');
}

function createXlsxContentTypesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;
}

function createXlsxRootRelationshipsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
}

function createXlsxAppPropertiesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>OpenCore</Application>
</Properties>`;
}

function createXlsxCorePropertiesXml(generatedAt: string): string {
  const timestamp = escapeXml(generatedAt);

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:creator>OpenCore</dc:creator>
  <cp:lastModifiedBy>OpenCore</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:modified>
</cp:coreProperties>`;
}

function createXlsxWorkbookXml(sheetName: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${escapeXml(normalizeSheetName(sheetName))}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;
}

function createXlsxWorkbookRelationshipsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

function createXlsxStylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/></font>
  </fonts>
  <fills count="2">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
  </fills>
  <borders count="1"><border/></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
  </cellXfs>
</styleSheet>`;
}

function createXlsxWorksheetXml(rows: readonly (readonly string[])[]): string {
  const rowXml = rows
    .map((row, rowIndex) => {
      const excelRow = rowIndex + 1;
      const cellXml = row
        .map((value, columnIndex) =>
          createXlsxTextCell(columnIndex, excelRow, value, rowIndex === 0),
        )
        .join('');
      return `<row r="${excelRow}">${cellXml}</row>`;
    })
    .join('');
  const columnCount = Math.max(
    1,
    ...rows.map((row) => Math.max(row.length, 1)),
  );
  const lastRow = Math.max(rows.length, 1);
  const range = `A1:${columnIndexToName(columnCount - 1)}${lastRow}`;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="${range}"/>
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <cols>${createXlsxColumnXml(columnCount)}</cols>
  <sheetData>${rowXml}</sheetData>
  <autoFilter ref="${range}"/>
</worksheet>`;
}

function createXlsxColumnXml(columnCount: number): string {
  return Array.from({ length: columnCount }, (_, index) => {
    const column = index + 1;
    const width = index === 0 ? 24 : 28;
    return `<col min="${column}" max="${column}" width="${width}" customWidth="1"/>`;
  }).join('');
}

function createXlsxTextCell(
  columnIndex: number,
  rowIndex: number,
  value: string,
  header: boolean,
): string {
  const style = header ? ' s="1"' : '';
  return `<c r="${columnIndexToName(columnIndex)}${rowIndex}" t="inlineStr"${style}><is><t>${escapeXml(value)}</t></is></c>`;
}

function columnIndexToName(index: number): string {
  let remaining = index + 1;
  let name = '';

  while (remaining > 0) {
    const modulo = (remaining - 1) % 26;
    name = String.fromCharCode(65 + modulo) + name;
    remaining = Math.floor((remaining - modulo) / 26);
  }

  return name;
}

function normalizeSheetName(value: string): string {
  const unsafeCharacters = new Set(['[', ']', ':', '*', '?', '/', '\\']);
  const normalized = Array.from(value)
    .map((character) => (unsafeCharacters.has(character) ? ' ' : character))
    .join('')
    .trim();
  return (normalized || 'Data').slice(0, 31);
}

function escapeXml(value: string): string {
  return stripInvalidXmlControlCharacters(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stripInvalidXmlControlCharacters(value: string): string {
  return Array.from(value)
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code === 0x09 || code === 0x0a || code === 0x0d || code >= 0x20;
    })
    .join('');
}
