import net from 'net';

const SERVICES = {
  21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS',
  80: 'HTTP', 110: 'POP3', 143: 'IMAP', 443: 'HTTPS', 445: 'SMB',
  3306: 'MySQL', 3389: 'RDP', 5432: 'PostgreSQL', 5900: 'VNC',
  6379: 'Redis', 8080: 'HTTP-Alt', 8443: 'HTTPS-Alt', 27017: 'MongoDB'
};

function checkPort(host, port, timeout = 2000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      const time = Date.now() - start;
      socket.destroy();
      resolve({ port, open: true, time, service: SERVICES[port] });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ port, open: false, time: timeout, service: SERVICES[port] });
    });

    socket.on('error', () => {
      socket.destroy();
      resolve({ port, open: false, time: Date.now() - start, service: SERVICES[port] });
    });

    socket.connect(port, host);
  });
}

export async function scanPorts(host, ports, onProgress) {
  const results = [];

  for (let i = 0; i < ports.length; i++) {
    const port = ports[i];
    if (onProgress) {
      onProgress({ current: i + 1, total: ports.length, port });
    }
    const result = await checkPort(host, port);
    results.push(result);
  }

  return results;
}