import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function scanNetwork(subnet, onProgress) {
  // Wenn kein Subnetz angegeben, aktuelles ermitteln
  if (!subnet) {
    const interfaces = os.networkInterfaces();
    for (const addrs of Object.values(interfaces)) {
      for (const addr of addrs) {
        if (addr.family === 'IPv4' && !addr.internal) {
          const parts = addr.address.split('.');
          subnet = `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
          break;
        }
      }
      if (subnet) break;
    }
  }

  if (!subnet) {
    throw new Error('Konnte kein lokales Netzwerk ermitteln');
  }

  // Nur /24 unterstützt
  const base = subnet.split('/')[0].split('.').slice(0, 3).join('.');
  const devices = [];
  const total = 254;

  // Parallel scannen (schneller!)
  const batches = [];
  for (let i = 1; i <= total; i++) {
    batches.push(`${base}.${i}`);
  }

  // In Batches von 20 parallel
  const batchSize = 20;
  let processed = 0;

  for (let i = 0; i < batches.length; i += batchSize) {
    const batch = batches.slice(i, i + batchSize);
    
    const results = await Promise.all(
      batch.map(async (ip) => {
        const isWindows = process.platform === 'win32';
        const cmd = isWindows 
          ? `ping -n 1 -w 100 ${ip}` 
          : `ping -c 1 -W 1 ${ip}`;

        try {
          const { stdout } = await execAsync(cmd, { timeout: 500 });
          // Prüfen ob Antwort kam (Windows: "Antwort von", Linux: "bytes from")
          if (stdout.match(/Antwort von|bytes from|ttl=/i)) {
            return ip;
          }
        } catch {}
        return null;
      })
    );

    for (const ip of results) {
      if (ip) devices.push({ ip, hostname: null });
    }

    processed += batch.length;
    if (onProgress) {
      onProgress({ current: processed, total });
    }
  }

  return devices;
}