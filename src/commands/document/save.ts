import { defineCommand } from 'zodline';
import { createApiClient } from '../../utils/api-client';
import { readUpload, uploadOptionsShape } from '../../utils/files';
import {
  columnNameParam,
  dataIdParam,
  defineCommandOptions,
  entityIdParam,
} from '../../utils/options';
import { printJson } from '../../utils/output';

export default defineCommand({
  description: 'Upload a file to a single document column.',
  examples: [
    'engine4 document save --entity 4a1b --data-id 7c2d --column Custom_021 --file ./contract.pdf',
    'engine4 document save --entity 4a1b --data-id 7c2d --column Custom_021 --file ./logo.png --max-width 512 --json',
  ],
  options: defineCommandOptions({
    entity: entityIdParam,
    dataId: dataIdParam,
    column: columnNameParam,
    ...uploadOptionsShape,
  }),
  action: async (options) => {
    const upload = readUpload(options.file, options.mimeType, options.maxWidth);
    const { client, accessToken } = await createApiClient();
    const { dataId } = await client.saveSingleDocument({
      accessToken,
      entityId: options.entity,
      dataId: options.dataId,
      columnName: options.column,
      ...upload,
    });
    if (options.json) {
      printJson({ dataId });
    } else {
      process.stdout.write(`Saved document ${dataId}\n`);
    }
  },
});
