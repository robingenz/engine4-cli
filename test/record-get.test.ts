import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runCli } from '../src/cli';
import { BASE_URL, captureOutput, mockFetchRoutes, useTempConfigDir } from './helpers';

describe('record get', () => {
  let output: ReturnType<typeof captureOutput>;

  beforeEach(() => {
    useTempConfigDir();
    vi.stubEnv('ENGINE4_BASE_URL', BASE_URL);
    vi.stubEnv('ENGINE4_ACCESS_TOKEN', 'tok');
    output = captureOutput();
  });

  function getRequestUrl(fetchMock: ReturnType<typeof mockFetchRoutes>): URL {
    const [input] = fetchMock.mock.calls[0] ?? [];
    return new URL(String(input));
  }

  it('gets one record', async () => {
    const item = { DataId: 'd1', Custom_001: 'Smith' };
    const fetchMock = mockFetchRoutes({ '/webapi/external/get': item });

    expect(await runCli(['record', 'get', '--entity', 'e1', '--data-id', 'd1', '--json'])).toBe(0);

    const url = getRequestUrl(fetchMock);
    expect(url.searchParams.get('entityId')).toBe('e1');
    expect(url.searchParams.get('dataId')).toBe('d1');
    expect(url.searchParams.get('convertAllCustomDataToStrings')).toBe('true');
    expect(JSON.parse(output.stdout())).toEqual({ item });
  });

  it('gets several records', async () => {
    const items = [{ DataId: 'd1' }, { DataId: 'd2' }];
    const fetchMock = mockFetchRoutes({ '/webapi/external/getMultiple': items });

    const exitCode = await runCli([
      'record',
      'get',
      '--entity',
      'e1',
      '--data-id',
      'd1',
      '--data-id',
      'd2',
      '--raw',
      '--json',
    ]);

    expect(exitCode).toBe(0);
    const url = getRequestUrl(fetchMock);
    expect(url.searchParams.getAll('dataIds')).toEqual(['d1', 'd2']);
    expect(url.searchParams.get('convertAllCustomDataToStrings')).toBe('false');
    expect(JSON.parse(output.stdout())).toEqual({ items });
  });

  it('prints the record', async () => {
    mockFetchRoutes({ '/webapi/external/get': { DataId: 'd1', Custom_001: '' } });

    expect(await runCli(['record', 'get', '--entity', 'e1', '--data-id', 'd1'])).toBe(0);

    expect(output.stdout()).toBe('DataId  d1\n');
  });

  it('requires --data-id', async () => {
    expect(await runCli(['record', 'get', '--entity', 'e1'])).toBe(2);
  });
});
