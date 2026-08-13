import { createReadStream } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Readable } from 'node:stream';
import { env } from '../config/env.js';

function resolveUploadRoot(): string {
  return path.resolve(env.UPLOAD_DIR);
}

function resolveStoragePath(storageKey: string): string {
  const root = resolveUploadRoot();
  const resolved = path.resolve(root, storageKey);

  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new Error('Caminho de ficheiro inválido');
  }

  return resolved;
}

export async function writeStoredFile(
  storageKey: string,
  data: Buffer,
): Promise<void> {
  const filePath = resolveStoragePath(storageKey);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, data);
}

export function createStoredFileStream(storageKey: string): Readable {
  return createReadStream(resolveStoragePath(storageKey));
}

export async function deleteStoredFile(storageKey: string): Promise<void> {
  try {
    await unlink(resolveStoragePath(storageKey));
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? (error as { code: string }).code
        : undefined;

    if (code !== 'ENOENT') {
      throw error;
    }
  }
}
