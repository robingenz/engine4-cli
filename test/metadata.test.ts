import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runCli } from '../src/cli';
import { BASE_URL, captureOutput, mockFetchRoutes, useTempConfigDir } from './helpers';

describe('metadata commands', () => {
  let output: ReturnType<typeof captureOutput>;

  beforeEach(() => {
    useTempConfigDir();
    vi.stubEnv('ENGINE4_BASE_URL', BASE_URL);
    vi.stubEnv('ENGINE4_ACCESS_TOKEN', 'tok');
    output = captureOutput();
  });

  function getRequest(fetchMock: ReturnType<typeof mockFetchRoutes>) {
    const [input, init] = fetchMock.mock.calls[0] ?? [];
    return { url: new URL(String(input)), headers: new Headers(init?.headers) };
  }

  describe('entity list', () => {
    const entities = [
      {
        EntityId: 'e1',
        EntityName: 'Customer',
        EntityFriendlyName: 'Customers',
        AllowExternalApi: true,
      },
      { EntityId: 'e2', EntityName: 'User', EntityFriendlyName: 'Users', AllowExternalApi: false },
    ];

    it('lists only the entities with external API access', async () => {
      const fetchMock = mockFetchRoutes({ '/webapi/external/GetGenericEntities': entities });

      expect(await runCli(['entity', 'list', '--json'])).toBe(0);

      const { url, headers } = getRequest(fetchMock);
      expect(url.href).toBe(`${BASE_URL}/webapi/external/GetGenericEntities`);
      expect(headers.get('Authorization')).toBe('Bearer tok');
      expect(JSON.parse(output.stdout())).toEqual({ items: [entities[0]] });
    });

    it('lists all entities with --all', async () => {
      mockFetchRoutes({ '/webapi/external/GetGenericEntities': entities });

      expect(await runCli(['entity', 'list', '--all', '--json'])).toBe(0);

      expect(JSON.parse(output.stdout())).toEqual({ items: entities });
    });

    it('prints a table', async () => {
      mockFetchRoutes({ '/webapi/external/GetGenericEntities': entities });

      expect(await runCli(['entity', 'list'])).toBe(0);

      expect(output.stdout()).toBe(
        'ID  NAME      FRIENDLY NAME  EXTERNAL API\ne1  Customer  Customers      true\n',
      );
    });
  });

  describe('property list', () => {
    it('lists the properties of an entity', async () => {
      const properties = [{ GenericColumnName: 'Custom_001', PropertyName: 'Name' }];
      const fetchMock = mockFetchRoutes({ '/webapi/external/GetGenericProperties': properties });

      expect(await runCli(['property', 'list', '--entity', 'e1', '--json'])).toBe(0);

      const { url, headers } = getRequest(fetchMock);
      expect(url.pathname).toBe('/webapi/external/GetGenericProperties');
      expect(url.searchParams.get('entityId')).toBe('e1');
      expect(headers.get('Authorization')).toBe('Bearer tok');
      expect(JSON.parse(output.stdout())).toEqual({ items: properties });
    });

    it('requires --entity', async () => {
      expect(await runCli(['property', 'list', '--json'])).toBe(2);
    });
  });

  describe('view list', () => {
    it('lists the views of an entity by type', async () => {
      const views = [{ ViewId: 'v1', ViewName: 'All', ViewType: 'List' }];
      const fetchMock = mockFetchRoutes({ '/webapi/external/GetGenericViews': views });

      expect(await runCli(['view', 'list', '--entity', 'e1', '--type', 'List', '--json'])).toBe(0);

      const { url, headers } = getRequest(fetchMock);
      expect(url.pathname).toBe('/webapi/external/GetGenericViews');
      expect(url.searchParams.get('entityId')).toBe('e1');
      expect(url.searchParams.get('viewType')).toBe('List');
      expect(headers.get('Authorization')).toBe('Bearer tok');
      expect(JSON.parse(output.stdout())).toEqual({ items: views });
    });

    it('requires --entity', async () => {
      expect(await runCli(['view', 'list', '--json'])).toBe(2);
    });
  });

  describe('view-field list', () => {
    it('lists the fields of a view', async () => {
      const fields = [
        {
          GenericColumnName: 'Custom_001',
          PropertyName: 'Name',
          ViewFieldLabel: 'Name',
          ViewFieldId: 'f1',
        },
      ];
      const fetchMock = mockFetchRoutes({ '/webapi/external/GetGenericViewFields': fields });

      expect(await runCli(['view-field', 'list', '--view', 'v1', '--json'])).toBe(0);

      const { url, headers } = getRequest(fetchMock);
      expect(url.pathname).toBe('/webapi/external/GetGenericViewFields');
      expect(url.searchParams.get('viewId')).toBe('v1');
      expect(headers.get('Authorization')).toBe('Bearer tok');
      expect(JSON.parse(output.stdout())).toEqual({ items: fields });
    });

    it('requires --view', async () => {
      expect(await runCli(['view-field', 'list', '--json'])).toBe(2);
    });
  });
});
