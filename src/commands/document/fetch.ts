import { defineCommand } from 'zodline';
import { createApiClient } from '../../utils/api-client';
import { outputParam, writeDownload } from '../../utils/files';
import {
  columnNameParam,
  dataIdParam,
  defineCommandOptions,
  entityIdParam,
} from '../../utils/options';
import { printJson } from '../../utils/output';

export default defineCommand({
  description: 'Download the file of a single document column.',
  examples: [
    'engine4 document fetch --entity 4a1b --data-id 7c2d --column Custom_021',
    'engine4 document fetch --entity 4a1b --data-id 7c2d --column Custom_021 --output ./contract.pdf --json',
  ],
  options: defineCommandOptions({
    entity: entityIdParam,
    dataId: dataIdParam,
    column: columnNameParam,
    output: outputParam,
  }),
  action: async (options) => {
    const { client, accessToken } = await createApiClient();
    const result = await client.fetchSingleDocument({
      accessToken,
      entityId: options.entity,
      dataId: options.dataId,
      columnName: options.column,
    });
    const download = writeDownload(result, options.dataId, options.output);
    if (options.json) {
      printJson(download);
    } else {
      process.stdout.write(`Saved ${download.path} (${download.size} bytes)\n`);
    }
  },
});
