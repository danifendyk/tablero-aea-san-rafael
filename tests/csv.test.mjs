import assert from 'node:assert/strict';
import test from 'node:test';
import { toExcelCsv } from '../lib/csv.ts';

test('CSV para Excel es-AR: BOM, punto y coma, coma decimal, sin separador de miles y CRLF', () => {
  const csv = toExcelCsv([
    ['Tablero', 'Ib', 'Sección'],
    ['SALÓN', 1234.56, 1.5],
  ]);
  assert.equal(
    csv,
    '\uFEFF"Tablero";"Ib";"Sección"\r\n"SALÓN";"1234,56";"1,5"\r\n',
  );
});

test('CSV: escapa comillas, punto y coma, comas y saltos de línea dentro de nombres', () => {
  const csv = toExcelCsv([['TP "Principal"; salón, audio\nCocina', 'L1']]);
  assert.equal(csv, '\uFEFF"TP ""Principal""; salón, audio\nCocina";"L1"\r\n');
});

test('CSV: texto controlado por el usuario no se ejecuta como fórmula', () => {
  for (const value of [
    '=1+2',
    '+SUM(A1:A2)',
    '-1+2',
    '@SUM(A1)',
    '  =1',
    '\t=1',
    '\r=1',
  ]) {
    assert.equal(toExcelCsv([[value]]), `\uFEFF"'${value}"\r\n`);
  }
});

test('CSV: conserva números negativos numéricos y representa valores vacíos sin NaN', () => {
  assert.equal(
    toExcelCsv([[0, -1.5, undefined, null, NaN, Infinity]]),
    '\uFEFF"0";"-1,5";"";"";"";""\r\n',
  );
});
