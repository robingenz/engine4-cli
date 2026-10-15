import { styleText } from 'node:util';
import { isColorEnabled } from './environment';
import type { CliError } from './errors';

export interface TableColumn<Row> {
  key: keyof Row & string;
  header: string;
}

type TextFormat = Parameters<typeof styleText>[0];

export function printJson(data: unknown): void {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

/**
 * Rows as aligned columns under uppercase headers. An empty list prints a note on stderr instead.
 */
export function printTable<Row extends object>(rows: Row[], columns: TableColumn<Row>[]): void {
  if (rows.length === 0) {
    printInfo('No results.');
    return;
  }
  const headerCells = columns.map(({ header }) => header.toUpperCase());
  const bodyCells = rows.map((row) => columns.map(({ key }) => formatValue(row[key])));
  const widths = headerCells.map((header, index) =>
    Math.max(header.length, ...bodyCells.map((cells) => cells[index]?.length ?? 0)),
  );
  for (const cells of [headerCells, ...bodyCells]) {
    const line = cells.map((cell, index) => cell.padEnd(widths[index] ?? 0)).join('  ');
    process.stdout.write(`${line.trimEnd()}\n`);
  }
}

/**
 * One record as `label  value` lines with aligned labels. Empty values (`null`, `undefined`, `''`) are left out.
 */
export function printDetails(record: object): void {
  const entries = Object.entries(record).filter(([, value]) => !isEmptyValue(value));
  const labelWidth = Math.max(0, ...entries.map(([label]) => label.length));
  for (const [label, value] of entries) {
    process.stdout.write(`${colorize(label.padEnd(labelWidth), 'bold')}  ${formatValue(value)}\n`);
  }
}

export function printInfo(message: string): void {
  process.stderr.write(`${message}\n`);
}

export function printError(error: CliError): void {
  const code = colorize(error.code, ['bold', 'red'], process.stderr);
  process.stderr.write(`${code} ${error.message}\n`);
}

export function colorize(
  text: string,
  format: TextFormat,
  stream: NodeJS.WriteStream = process.stdout,
): string {
  return isColorEnabled(stream) ? styleText(format, text, { validateStream: false }) : text;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

/**
 * Records one after another, each as details, separated by a blank line.
 */
export function printRecords(records: object[]): void {
  if (records.length === 0) {
    printInfo('No results.');
    return;
  }
  records.forEach((record, index) => {
    if (index > 0) {
      process.stdout.write('\n');
    }
    printDetails(record);
  });
}
