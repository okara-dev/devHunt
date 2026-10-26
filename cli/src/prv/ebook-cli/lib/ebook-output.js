import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export function getDesktopPath({
  platform = process.platform,
  homeDirectory = os.homedir(),
  environment = process.env,
} = {}) {
  if (platform === 'win32') {
    const desktopPath = execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        "[Environment]::GetFolderPath('Desktop')",
      ],
      { encoding: 'utf8', timeout: 5000, windowsHide: true },
    ).trim();

    if (!desktopPath) {
      throw new Error('Der Windows-Desktop-Ordner konnte nicht ermittelt werden.');
    }

    return desktopPath;
  }

  const configuredDesktop = environment.XDG_DESKTOP_DIR?.replace(
    /^"(.*)"$/,
    '$1',
  ).replace('$HOME', homeDirectory);

  return configuredDesktop || path.join(homeDirectory, 'Desktop');
}

export function sanitizeBookTitle(title) {
  const safeTitle = String(title)
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/[. ]+$/g, '')
    .trim();

  if (!safeTitle || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(safeTitle)) {
    return 'E-Book';
  }

  return safeTitle;
}

export async function saveBookToDesktop(title, html, desktopPath = getDesktopPath()) {
  const safeTitle = sanitizeBookTitle(title);
  await fs.mkdir(desktopPath, { recursive: true });

  let htmlPath = path.join(desktopPath, `${safeTitle}.html`);
  let suffix = 2;

  while (true) {
    try {
      await fs.writeFile(htmlPath, html, { encoding: 'utf8', flag: 'wx' });
      break;
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }

      htmlPath = path.join(desktopPath, `${safeTitle} (${suffix}).html`);
      suffix += 1;
    }
  }

  return { desktopPath, htmlPath };
}
