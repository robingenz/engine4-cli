import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runCli } from '../src/cli';
import { BASE_URL, captureOutput, mockFetchRoutes, useTempConfigDir } from './helpers';

describe('document', () => {
  let output: ReturnType<typeof captureOutput>;
  let directory: string;

  beforeEach(() => {
    useTempConfigDir();
    vi.stubEnv('ENGINE4_BASE_URL', BASE_URL);
    vi.stubEnv('ENGINE4_ACCESS_TOKEN', 'tok');
    output = captureOutput();
    directory = mkdtempSync(join(tmpdir(), 'engine4-cli-document-'));
  });

  describe('fetch', () => {
    it('saves the document with the record ID as fallback name', async () => {
      const fetchMock = mockFetchRoutes({
        '/webapi/external/fetchSingleDocument': new Response(new Uint8Array([4, 5])),
      });

      const exitCode = await runCli([
        'document',
        'fetch',
        '--entity',
        'ent-1',
        '--data-id',
        'rec-1',
        '--column',
        'Custom_021',
        '--output',
        directory,
        '--json',
      ]);

      expect(exitCode).toBe(0);
      const path = join(directory, 'rec-1');
      expect(JSON.parse(output.stdout())).toMatchObject({ path, filename: 'rec-1', size: 2 });
      expect([...readFileSync(path)]).toEqual([4, 5]);
      const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
      expect(Object.fromEntries(url.searchParams)).toEqual({
        entityId: 'ent-1',
        dataId: 'rec-1',
        columnName: 'Custom_021',
      });
    });

    it('returns 2 for an invalid column name', async () => {
      expect(
        await runCli([
          'document',
          'fetch',
          '--entity',
          'ent-1',
          '--data-id',
          'rec-1',
          '--column',
          'Title',
        ]),
      ).toBe(2);
    });
  });

  describe('save', () => {
    it('uploads the file to the column', async () => {
      const fetchMock = mockFetchRoutes({
        '/webapi/external/saveSingleDocumentFormData': { DataId: 'doc-1' },
      });
      const filePath = join(directory, 'contract.pdf');
      writeFileSync(filePath, 'pdf');

      const exitCode = await runCli([
        'document',
        'save',
        '--entity',
        'ent-1',
        '--data-id',
        'rec-1',
        '--column',
        'Custom_021',
        '--file',
        filePath,
      ]);

      expect(exitCode).toBe(0);
      expect(output.stdout()).toBe('Saved document doc-1\n');
      const body = fetchMock.mock.calls[0]?.[1]?.body as FormData;
      expect(JSON.parse(String(body.get('input')))).toEqual({
        EntityId: 'ent-1',
        DataId: 'rec-1',
        ColumnName: 'Custom_021',
        Filename: 'contract.pdf',
        MimeType: 'application/pdf',
      });
      expect((body.get('file') as File).name).toBe('contract.pdf');
    });

    it('returns 2 for a missing file', async () => {
      const exitCode = await runCli([
        'document',
        'save',
        '--entity',
        'ent-1',
        '--data-id',
        'rec-1',
        '--column',
        'Custom_021',
        '--file',
        join(directory, 'missing.pdf'),
      ]);

      expect(exitCode).toBe(2);
    });
  });
});
