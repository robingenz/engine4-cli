import { defineCommand } from 'zodline';
import { createApiClient } from '../../utils/api-client';
import { outputParam, writeDownload } from '../../utils/files';
import { dataIdParam, defineCommandOptions } from '../../utils/options';
import { printJson } from '../../utils/output';

export default defineCommand({
  description: 'Download an attachment.',
  examples: [
    'engine4 attachment fetch --data-id 0f9c1d2e',
    'engine4 attachment fetch --data-id 0f9c1d2e --output ./downloads --json',
  ],
  options: defineCommandOptions({
    dataId: dataIdParam.describe('ID of the attachment.'),
    output: outputParam,
  }),
  action: async (options) => {
    const { client, accessToken } = await createApiClient();
    const result = await client.fetchAttachment({ accessToken, dataId: options.dataId });
    const download = writeDownload(result, options.dataId, options.output);
    if (options.json) {
      printJson(download);
    } else {
      process.stdout.write(`Saved ${download.path} (${download.size} bytes)\n`);
    }
  },
});
