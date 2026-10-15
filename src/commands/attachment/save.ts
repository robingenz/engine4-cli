import { z } from 'zod';
import { defineCommand } from 'zodline';
import { createApiClient } from '../../utils/api-client';
import { readUpload, uploadOptionsShape } from '../../utils/files';
import { dataIdParam, defineCommandOptions, entityIdParam } from '../../utils/options';
import { printJson } from '../../utils/output';

export default defineCommand({
  description: 'Upload a file and attach it to a record.',
  examples: [
    'engine4 attachment save --parent-entity 4a1b --parent-data-id 7c2d --file ./invoice.pdf',
    'engine4 attachment save --parent-entity 4a1b --parent-data-id 7c2d --data-id 0f9c1d2e --file ./photo.jpg --max-width 1024 --json',
  ],
  options: defineCommandOptions({
    parentEntity: entityIdParam.describe('ID of the entity of the record to attach the file to.'),
    parentDataId: dataIdParam.describe('ID of the record to attach the file to.'),
    dataId: z.string().min(1).optional().describe('ID of an existing attachment to replace.'),
    ...uploadOptionsShape,
  }),
  action: async (options) => {
    const upload = readUpload(options.file, options.mimeType, options.maxWidth);
    const { client, accessToken } = await createApiClient();
    const { dataId } = await client.saveAttachment({
      accessToken,
      parentEntityId: options.parentEntity,
      parentDataId: options.parentDataId,
      dataId: options.dataId,
      ...upload,
    });
    if (options.json) {
      printJson({ dataId });
    } else {
      process.stdout.write(`Saved attachment ${dataId}\n`);
    }
  },
});
