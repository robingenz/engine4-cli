import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runCli } from '../src/cli';
import { BASE_URL, captureOutput, mockFetchRoutes, useTempConfigDir } from './helpers';

describe('record fetch', () => {
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

  it('sends the filter, sorting and paging', async () => {
    const items = [{ DataId: 'd1', Custom_001: 'Smith' }];
    const fetchMock = mockFetchRoutes({ '/webapi/external/fetch': items });
    const filter = {
      logic: 'AND',
      groups: [
        { genericName: 'Custom_001', compareOperator: 'CONTAINS', value: 'Smith' },
        { genericName: 'Custom_002', compareOperator: 'IN', value: ['open', 'pending'] },
        { genericName: 'Custom_003', compareOperator: 'ISNULL' },
      ],
    };

    const exitCode = await runCli([
      'record',
      'fetch',
      '--entity',
      'e1',
      '--filter',
      JSON.stringify(filter),
      '--active',
      'true',
      '--skip',
      '20',
      '--take',
      '10',
      '--sort',
      'CreatedDate:desc',
      '--sort',
      'Custom_001',
      '--json',
    ]);

    expect(exitCode).toBe(0);
    expect(getRequestBody(fetchMock)).toMatchObject({
      EntityId: 'e1',
      Skip: 20,
      Take: 10,
      IsActive: true,
      Sortings: [
        { GenericName: 'CreatedDate', Descending: true },
        { GenericName: 'Custom_001', Descending: false },
      ],
      Filter: { Logic: 'AND' },
    });
    expect(JSON.parse(output.stdout())).toEqual({ items, skip: 20, take: 10 });
  });

  it('fetches all records by default', async () => {
    const fetchMock = mockFetchRoutes({ '/webapi/external/fetch': [] });

    expect(await runCli(['record', 'fetch', '--entity', 'e1', '--json'])).toBe(0);

    expect(getRequestBody(fetchMock)).toMatchObject({
      IsActive: null,
      Filter: null,
      Skip: 0,
      Take: 50,
      ConvertAllCustomDataToStrings: true,
    });
  });

  it('prints the records and a hint for the next page', async () => {
    mockFetchRoutes({
      '/webapi/external/fetch': [
        { DataId: 'd1', Custom_001: 'Smith' },
        { DataId: 'd2', Custom_001: null },
      ],
    });

    expect(await runCli(['record', 'fetch', '--entity', 'e1', '--take', '2'])).toBe(0);

    expect(output.stdout()).toBe('DataId      d1\nCustom_001  Smith\n\nDataId  d2\n');
    expect(output.stderr()).toBe('Next page: --skip 2\n');
  });

  it('rejects an invalid filter', async () => {
    const fetchMock = mockFetchRoutes({});
    const filter = { genericName: 'Custom_001', compareOperator: 'IN', value: 'open' };

    const exitCode = await runCli([
      'record',
      'fetch',
      '--entity',
      'e1',
      '--filter',
      JSON.stringify(filter),
    ]);

    expect(exitCode).toBe(2);
    expect(output.stderr()).toMatch(/^E_USAGE --filter: /);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a filter that is not JSON', async () => {
    mockFetchRoutes({});

    expect(await runCli(['record', 'fetch', '--entity', 'e1', '--filter', '{nope'])).toBe(2);
    expect(output.stderr()).toBe('E_USAGE --filter: Expected valid JSON.\n');
  });

  it('rejects an invalid sort direction', async () => {
    mockFetchRoutes({});

    expect(await runCli(['record', 'fetch', '--entity', 'e1', '--sort', 'Custom_001:up'])).toBe(2);
    expect(output.stderr()).toContain('--sort');
  });

  it('requires --entity', async () => {
    expect(await runCli(['record', 'fetch'])).toBe(2);
  });
});
