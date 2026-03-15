import { exec } from 'node:child_process';
import { platform } from 'node:os';

/**
 * Open a file in the default browser/application.
 */
export function openInBrowser(filePath: string): void {
  const cmd = platform() === 'darwin' ? 'open' : 'xdg-open';
  exec(`${cmd} "${filePath}"`);
}
