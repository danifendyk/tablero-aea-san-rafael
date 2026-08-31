type CsvCell = string | number | null | undefined;

/** Excel es-AR: semicolon columns, decimal comma, UTF-8 BOM and CRLF.
 * Quoting also escapes delimiters, line breaks and quotes in user-entered names.
 * Text beginning like a spreadsheet formula is explicitly neutralized.
 */
export function toExcelCsv(rows: CsvCell[][]): string {
  const numberFormat = new Intl.NumberFormat('es-AR', {
    useGrouping: false,
    maximumFractionDigits: 6,
  });
  const cell = (value: CsvCell) => {
    let text =
      typeof value === 'number'
        ? Number.isFinite(value)
          ? numberFormat.format(value)
          : ''
        : (value ?? '');
    if (typeof value === 'string' && /^\s*[=+@-]/.test(value))
      text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  return (
    '\uFEFF' + rows.map((row) => row.map(cell).join(';')).join('\r\n') + '\r\n'
  );
}
