import type { FetchAttachmentResult, UploadFileOptions } from 'engine4-node';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { z } from 'zod';
import { UsageError } from './errors';

export type Upload = Omit<UploadFileOptions, 'accessToken'>;

export interface Download {
  path: string;
  filename: string;
  mimeType?: string;
  size: number;
}

const MIME_TYPES_BY_EXTENSION: Record<string, string> = {
  '.csv': 'text/csv',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
  '.webp': 'image/webp',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xml': 'application/xml',
  '.zip': 'application/zip',
};

const DEFAULT_MIME_TYPE = 'application/octet-stream';

export const uploadOptionsShape = {
  file: z.string().min(1).describe('Path of the file to upload.'),
  mimeType: z
    .string()
    .min(1)
    .optional()
    .describe('MIME type of the file. Defaults to the type of its extension.'),
  maxWidth: z.coerce
    .number()
    .int()
    .min(1)
    .optional()
    .describe('Maximum width of an image in pixels. Wider images are scaled down.'),
};

export const outputParam = z
  .string()
  .min(1)
  .optional()
  .describe(
    'File or directory to save to. Defaults to the server file name in the current directory.',
  );

export function readUpload(filePath: string, mimeType?: string, maxWidth?: number): Upload {
  return {
    file: readFile(filePath),
    filename: basename(filePath),
    mimeType: mimeType ?? lookUpMimeType(filePath),
    maxWidth,
  };
}

export function lookUpMimeType(filePath: string): string {
  return MIME_TYPES_BY_EXTENSION[extname(filePath).toLowerCase()] ?? DEFAULT_MIME_TYPE;
}

/**
 * Writes the downloaded file to `output` if it is a file path, into `output` if it is an existing directory,
 * or into the current directory. The file name is the one from the server, else `fallbackFilename`.
 */
export function writeDownload(
  result: FetchAttachmentResult,
  fallbackFilename: string,
  output?: string,
): Download {
  // `basename` keeps a file name from the server from pointing outside the target directory.
  const filename = basename(result.filename ?? fallbackFilename);
  const path = resolveDownloadPath(filename, output);
  writeFileSync(path, result.item);
  return { path, filename, mimeType: result.mimeType, size: result.item.length };
}

function resolveDownloadPath(filename: string, output?: string): string {
  if (output === undefined) {
    return resolve(filename);
  }
  return isDirectory(output) ? resolve(join(output, filename)) : resolve(output);
}

function isDirectory(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory();
}

function readFile(filePath: string): Uint8Array {
  try {
    return readFileSync(filePath);
  } catch (error) {
    throw new UsageError(`--file: Cannot read ${filePath}.`, error);
  }
}
