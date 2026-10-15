import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UsageError } from '../src/utils/errors';
import { lookUpMimeType, readUpload, writeDownload } from '../src/utils/files';

describe('lookUpMimeType', () => {
  it.each([
    ['photo.png', 'image/png'],
    ['photo.JPG', 'image/jpeg'],
    ['report.pdf', 'application/pdf'],
    ['sheet.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    ['archive.tar.gz', 'application/octet-stream'],
    ['README', 'application/octet-stream'],
  ])('maps %s to %s', (filePath, mimeType) => {
    expect(lookUpMimeType(filePath)).toBe(mimeType);
  });
});

describe('readUpload', () => {
  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'engine4-cli-files-'));
  });

  it('reads the file with its name and MIME type', () => {
    const filePath = join(directory, 'note.txt');
    writeFileSync(filePath, 'hello');

    expect(readUpload(filePath, undefined, 800)).toEqual({
      file: Buffer.from('hello'),
      filename: 'note.txt',
      mimeType: 'text/plain',
      maxWidth: 800,
    });
  });

  it('prefers the given MIME type', () => {
    const filePath = join(directory, 'note.txt');
    writeFileSync(filePath, 'hello');

    expect(readUpload(filePath, 'text/markdown').mimeType).toBe('text/markdown');
  });

  it('throws a usage error for a missing file', () => {
    expect(() => readUpload(join(directory, 'missing.txt'))).toThrow(UsageError);
  });
});

describe('writeDownload', () => {
  const result = {
    item: Buffer.from('content'),
    filename: 'report.pdf',
    mimeType: 'application/pdf',
  };
  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'engine4-cli-files-'));
  });

  it('writes to the given file path', () => {
    const path = join(directory, 'renamed.pdf');

    expect(writeDownload(result, 'fallback', path)).toEqual({
      path,
      filename: 'report.pdf',
      mimeType: 'application/pdf',
      size: 7,
    });
    expect(readFileSync(path, 'utf8')).toBe('content');
  });

  it('writes into the given directory with the server file name', () => {
    const outputDirectory = join(directory, 'downloads');
    mkdirSync(outputDirectory);

    const { path } = writeDownload(result, 'fallback', outputDirectory);

    expect(path).toBe(join(outputDirectory, 'report.pdf'));
    expect(readFileSync(path, 'utf8')).toBe('content');
  });

  it('writes into the current directory by default', () => {
    vi.spyOn(process, 'cwd').mockReturnValue(directory);

    const { path } = writeDownload(result, 'fallback');

    expect(path).toBe(join(directory, 'report.pdf'));
    expect(readFileSync(path, 'utf8')).toBe('content');
  });

  it('falls back to the given file name', () => {
    const { filename, path } = writeDownload({ item: result.item }, 'fallback', directory);

    expect(filename).toBe('fallback');
    expect(path).toBe(join(directory, 'fallback'));
  });

  it('keeps a server file name inside the target directory', () => {
    const { path } = writeDownload({ ...result, filename: '../evil.pdf' }, 'fallback', directory);

    expect(path).toBe(join(directory, 'evil.pdf'));
  });
});
