import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runCli } from '../src/cli';
import { BASE_URL, captureOutput, mockFetchRoutes, useTempConfigDir } from './helpers';

describe('attachment', () => {
  let output: ReturnType<typeof captureOutput>;
  let directory: string;

  beforeEach(() => {
    useTempConfigDir();
    vi.stubEnv('ENGINE4_BASE_URL', BASE_URL);
    vi.stubEnv('ENGINE4_ACCESS_TOKEN', 'tok');
    output = captureOutput();
    directory = mkdtempSync(join(tmpdir(), 'engine4-cli-attachment-'));
  });

  describe('fetch', () => {
    const attachmentResponse = new Response(new Uint8Array([1, 2, 3]), {
      headers: {
        'content-disposition': 'attachment; filename="invoice.pdf"',
        'content-type': 'application/pdf',
      },
    });

    it('saves the attachment into the output directory', async () => {
      const fetchMock = mockFetchRoutes({
        '/webapi/external/fetchAttachment': attachmentResponse,
      });

      const exitCode = await runCli([
        'attachment',
        'fetch',
        '--data-id',
        'att-1',
        '--output',
        directory,
        '--json',
      ]);

      expect(exitCode).toBe(0);
      const path = join(directory, 'invoice.pdf');
      expect(JSON.parse(output.stdout())).toEqual({
        path,
        filename: 'invoice.pdf',
        mimeType: 'application/pdf',
        size: 3,
      });
      expect([...readFileSync(path)]).toEqual([1, 2, 3]);
      const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
      expect(url.searchParams.get('dataId')).toBe('att-1');
    });

    it('saves the attachment to the output file', async () => {
      mockFetchRoutes({ '/webapi/external/fetchAttachment': attachmentResponse });
      const path = join(directory, 'copy.pdf');

      const exitCode = await runCli([
        'attachment',
        'fetch',
        '--data-id',
        'att-1',
        '--output',
        path,
      ]);

      expect(exitCode).toBe(0);
      expect(output.stdout()).toBe(`Saved ${path} (3 bytes)\n`);
      expect([...readFileSync(path)]).toEqual([1, 2, 3]);
    });

    it('returns 2 without --data-id', async () => {
      expect(await runCli(['attachment', 'fetch'])).toBe(2);
    });
  });

  describe('save', () => {
    it('uploads the file with its name and MIME type', async () => {
      const fetchMock = mockFetchRoutes({
        '/webapi/external/saveAttachmentFormData': { DataId: 'att-2' },
      });
      const filePath = join(directory, 'photo.png');
      writeFileSync(filePath, 'png');

      const exitCode = await runCli([
        'attachment',
        'save',
        '--parent-entity',
        'ent-1',
        '--parent-data-id',
        'rec-1',
        '--file',
        filePath,
        '--max-width',
        '800',
        '--json',
      ]);

      expect(exitCode).toBe(0);
      expect(JSON.parse(output.stdout())).toEqual({ dataId: 'att-2' });
      const [, init] = fetchMock.mock.calls[0] ?? [];
      expect(init?.method).toBe('POST');
      const body = init?.body as FormData;
      expect(JSON.parse(String(body.get('input')))).toEqual({
        ParentEntityId: 'ent-1',
        ParentDataId: 'rec-1',
        Filename: 'photo.png',
        MimeType: 'image/png',
        MaxWidth: 800,
      });
      const file = body.get('file') as File;
      expect(file.name).toBe('photo.png');
      expect(file.type).toBe('image/png');
      expect(await file.text()).toBe('png');
    });

    it('prints the ID of the attachment', async () => {
      mockFetchRoutes({ '/webapi/external/saveAttachmentFormData': { DataId: 'att-2' } });
      const filePath = join(directory, 'notes.txt');
      writeFileSync(filePath, 'notes');

      const exitCode = await runCli([
        'attachment',
        'save',
        '--parent-entity',
        'ent-1',
        '--parent-data-id',
        'rec-1',
        '--data-id',
        'att-1',
        '--file',
        filePath,
        '--mime-type',
        'text/markdown',
      ]);

      expect(exitCode).toBe(0);
      expect(output.stdout()).toBe('Saved attachment att-2\n');
    });

    it('returns 2 for a missing file', async () => {
      const fetchMock = mockFetchRoutes({});
      const filePath = join(directory, 'missing.pdf');

      const exitCode = await runCli([
        'attachment',
        'save',
        '--parent-entity',
        'ent-1',
        '--parent-data-id',
        'rec-1',
        '--file',
        filePath,
      ]);

      expect(exitCode).toBe(2);
      expect(output.stderr()).toBe(`E_USAGE --file: Cannot read ${filePath}.\n`);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('returns 2 without --file', async () => {
      expect(
        await runCli([
          'attachment',
          'save',
          '--parent-entity',
          'ent-1',
          '--parent-data-id',
          'rec-1',
        ]),
      ).toBe(2);
    });
  });
});
