import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { getConfigDir } from '../config.js';
import type { CacheEntry, SessionAnalysis } from '../types.js';

const CACHE_DIR = path.join(getConfigDir(), 'cache');

function ensureCacheDir(): void {
  mkdirSync(CACHE_DIR, { recursive: true });
}

function cacheFilePath(sessionId: string): string {
  return path.join(CACHE_DIR, `${sessionId}.json`);
}

/**
 * Compute SHA-256 hash of a file.
 */
export function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Get a cached analysis result for a session.
 * Returns null if not cached or hash mismatch.
 */
export async function getCached(
  sessionId: string,
  filePath: string,
): Promise<SessionAnalysis | null> {
  const cachePath = cacheFilePath(sessionId);
  if (!existsSync(cachePath)) return null;

  try {
    const entry: CacheEntry = JSON.parse(readFileSync(cachePath, 'utf-8'));
    const currentHash = await hashFile(filePath);
    if (entry.fileHash === currentHash) {
      return entry.result;
    }
    return null; // hash mismatch, file has changed
  } catch {
    return null;
  }
}

/**
 * Store an analysis result in cache.
 */
export async function setCache(
  sessionId: string,
  filePath: string,
  result: SessionAnalysis,
): Promise<void> {
  ensureCacheDir();
  const fileHash = await hashFile(filePath);
  const entry: CacheEntry = {
    sessionId,
    fileHash,
    analyzedAt: new Date().toISOString(),
    result,
  };
  writeFileSync(cacheFilePath(sessionId), JSON.stringify(entry, null, 2), 'utf-8');
}
