import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadConfig() {
  const configPath = path.join(__dirname, '..', 'config.json');

  if (!fs.existsSync(configPath)) {
    throw new Error(`config.json nicht gefunden: ${configPath}`);
  }

  const content = fs.readFileSync(configPath, 'utf8');
  return JSON.parse(content);
}

export function getConfigPath() {
  return path.join(__dirname, '..', 'config.json');
}