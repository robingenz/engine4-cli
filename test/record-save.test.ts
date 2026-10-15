import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runCli } from '../src/cli';
import { BASE_URL, captureOutput, mockFetchRoutes, useTempConfigDir } from './helpers';

describe('record save', () => {
  let output: ReturnType<typeof captureOutput>;

  beforeEach(() => {
    useTempConfigDir();
    vi.stubEnv('ENGINE4_BASE_URL', BASE_URL);
    vi.stubEnv('ENGINE4_ACCESS_TOKEN', 'tok');
    output = captureOutput();
  });

  function getRequestBody(fetchMock: ReturnType<typeof mockFetchRoutes>): unknown {
    const [, init] = fetchMock.mock.calls[0] ?? [];
    return JSON.parse(String(init?.body));
  }

  function writeTempJsonFile(content: unknown): string {
    const path = join(mkdtempSync(join(tmpdir(), 'engine4-cli-test-')), 'records.json');
    writeFileSync(path, JSON.stringify(content));
    return path;
  }

  it('updates a record from --set values', async () => {
    const fetchMock = mockFetchRoutes({
      '/webapi/external/saveAll': [{ DataId: 'd1', EntityId: 'e1' }],
    });

    const exitCode = await runCli([
      'record',
      'save',
      '--entity',
      'e1',
      '--data-id',
      'd1',
      '--set',
      'Custom_001=a=b',
      '--set',
      'Custom_002=',
    ]);

    expect(exitCode).toBe(0);
    expect(getRequestBody(fetchMock)).toEqual({
      items: [{ Custom_001: 'a=b', Custom_002: '', EntityId: 'e1', DataId: 'd1' }],
      returnType: 'dataId',
    });
    expect(output.stdout()).toBe('DATAID  ENTITYID\nd1      e1\n');
  });

  it('saves the records of --file and fills in the entity', async () => {
    const items = [{ Custom_001: 'Smith' }, { EntityId: 'e2', Custom_002: 5 }];
    const fetchMock = mockFetchRoutes({ '/webapi/external/saveAll': [] });

    const exitCode = await runCli([
      'record',
      'save',
      '--entity',
      'e1',
      '--file',
      writeTempJsonFile(items),
      '--return',
      'none',
      '--json',
    ]);

    expect(exitCode).toBe(0);
    expect(getRequestBody(fetchMock)).toEqual({
      items: [
        { Custom_001: 'Smith', EntityId: 'e1' },
        { Custom_002: 5, EntityId: 'e2' },
      ],
      returnType: 'none',
    });
    expect(JSON.parse(output.stdout())).toEqual({ items: [] });
  });

  it('accepts a single record in --file', async () => {
    const fetchMock = mockFetchRoutes({ '/webapi/external/saveAll': [] });

    const exitCode = await runCli([
      'record',
      'save',
      '--entity',
      'e1',
      '--file',
      writeTempJsonFile({ Custom_001: 'Smith' }),
      '--return',
      'none',
    ]);

    expect(exitCode).toBe(0);
    expect(getRequestBody(fetchMock)).toMatchObject({
      items: [{ Custom_001: 'Smith', EntityId: 'e1' }],
    });
    expect(output.stderr()).toBe('Saved 1 record(s).\n');
  });

  it('rejects --set together with --file', async () => {
    const fetchMock = mockFetchRoutes({});

    const exitCode = await runCli([
      'record',
      'save',
      '--entity',
      'e1',
      '--set',
      'Custom_001=a',
      '--file',
      'records.json',
    ]);

    expect(exitCode).toBe(2);
    expect(output.stderr()).toBe('E_USAGE Pass either --set or --file, not both.\n');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires --set or --file', async () => {
    expect(await runCli(['record', 'save', '--entity', 'e1'])).toBe(2);
    expect(output.stderr()).toBe('E_USAGE Missing --set or --file.\n');
  });

  it('rejects an unknown column in --set', async () => {
    expect(await runCli(['record', 'save', '--entity', 'e1', '--set', 'Name=a'])).toBe(2);
    expect(output.stderr()).toContain('--set: Expected a generic column name');
  });
});
