import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runCli } from '../src/cli';
import { BASE_URL, captureOutput, mockFetchRoutes, useTempConfigDir } from './helpers';

describe('record delete', () => {
  let output: ReturnType<typeof captureOutput>;

  beforeEach(() => {
    useTempConfigDir();
    vi.stubEnv('ENGINE4_BASE_URL', BASE_URL);
    vi.stubEnv('ENGINE4_ACCESS_TOKEN', 'tok');
    output = captureOutput();
  });

  it('refuses to delete without --yes when it cannot ask', async () => {
    const fetchMock = mockFetchRoutes({});

    expect(await runCli(['record', 'delete', '--entity', 'e1', '--data-id', 'd1'])).toBe(1);

    expect(output.stderr()).toBe(
      'E_CONFIRMATION_REQUIRED Delete 1 record(s) from entity e1? Pass --yes to confirm.\n',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('deletes one record with --yes', async () => {
    const fetchMock = mockFetchRoutes({ '/webapi/external/delete': {} });

    const exitCode = await runCli([
      'record',
      'delete',
      '--entity',
      'e1',
      '--data-id',
      'd1',
      '--yes',
    ]);

    expect(exitCode).toBe(0);
    const [input, init] = fetchMock.mock.calls[0] ?? [];
    const url = new URL(String(input));
    expect(init?.method).toBe('DELETE');
    expect(url.searchParams.get('entityId')).toBe('e1');
    expect(url.searchParams.get('dataId')).toBe('d1');
    expect(output.stderr()).toBe('Deleted 1 record(s).\n');
  });

  it('deletes several records', async () => {
    const fetchMock = mockFetchRoutes({ '/webapi/external/deleteMultiple': {} });

    const exitCode = await runCli([
      'record',
      'delete',
      '--entity',
      'e1',
      '--data-id',
      'd1',
      '--data-id',
      'd2',
      '--yes',
      '--json',
    ]);

    expect(exitCode).toBe(0);
    const [input] = fetchMock.mock.calls[0] ?? [];
    expect(new URL(String(input)).searchParams.getAll('dataIds')).toEqual(['d1', 'd2']);
    expect(JSON.parse(output.stdout())).toEqual({ entityId: 'e1', dataIds: ['d1', 'd2'] });
  });

  it('requires --entity', async () => {
    expect(await runCli(['record', 'delete', '--data-id', 'd1', '--yes'])).toBe(2);
  });
});
