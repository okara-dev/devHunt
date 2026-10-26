import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function getLocalInfo() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  let mac = null;

  for (const addrs of Object.values(interfaces)) {
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        ips.push(addr.address);
        if (!mac) mac = addr.mac;
      }
    }
  }

  // Gateway ermitteln (Windows + Linux/Mac)
  let gateway = null;
  try {
    if (process.platform === 'win32') {
      const { stdout } = await execAsync('ipconfig');
      // Suche "Standardgateway" oder "Default Gateway"
      const lines = stdout.split('\n');
      for (const line of lines) {
        if (line.match(/Standardgateway|Default Gateway/i)) {
          const match = line.match(/(\d+\.\d+\.\d+\.\d+)/);
          if (match) {
            gateway = match[1];
            break;
          }
        }
      }
    } else {
      const { stdout } = await execAsync('ip route | grep default');
      const match = stdout.match(/default via (\d+\.\d+\.\d+\.\d+)/);
      if (match) gateway = match[1];
    }
  } catch (e) {
    // Ignore
  }

  // DNS Server (Windows + Linux/Mac)
  let dns = [];
  try {
    if (process.platform === 'win32') {
      const { stdout } = await execAsync('ipconfig /all');
      const lines = stdout.split('\n');
      let inDnsSection = false;
      
      for (const line of lines) {
        if (line.match(/DNS-Server|DNS Servers/i)) {
          inDnsSection = true;
          const match = line.match(/(\d+\.\d+\.\d+\.\d+)/);
          if (match) dns.push(match[1]);
          continue;
        }
        
        if (inDnsSection) {
          const match = line.match(/^\s+(\d+\.\d+\.\d+\.\d+)\s*$/);
          if (match) {
            dns.push(match[1]);
          } else if (line.trim() === '' || line.match(/^[A-Za-z]/)) {
            inDnsSection = false;
          }
        }
      }
    } else {
      const { stdout } = await execAsync('cat /etc/resolv.conf | grep nameserver');
      dns = stdout.split('\n').filter(Boolean).map(l => l.split(/\s+/)[1]).slice(0, 3);
    }
  } catch (e) {
    // Ignore
  }

  return {
    ips,
    mac,
    gateway,
    dns: dns.slice(0, 3),
    hostname: os.hostname(),
    platform: `${os.type()} ${os.release()}`
  };
}