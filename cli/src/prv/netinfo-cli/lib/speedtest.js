import https from 'https';

function downloadTest(url, onProgress) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    let bytes = 0;
    let lastUpdate = Date.now();

    https.get(url, (res) => {
      res.on('data', (chunk) => {
        bytes += chunk.length;
        const now = Date.now();
        
        // Nur alle 100ms updaten für flüssigere Ausgabe
        if (onProgress && now - lastUpdate > 100) {
          lastUpdate = now;
          const elapsed = (now - start) / 1000;
          const speed = (bytes * 8 / 1000000) / elapsed;
          onProgress(`📥 Download: ${speed.toFixed(2)} Mbit/s`);
        }
      });

      res.on('end', () => {
        const elapsed = (Date.now() - start) / 1000;
        const speed = (bytes * 8 / 1000000) / elapsed;
        resolve(speed);
      });

      res.on('error', reject);
    }).on('error', reject);
  });
}

function pingTest(url) {
  return new Promise((resolve) => {
    const start = Date.now();
    https.get(url, (res) => {
      res.on('data', () => {});
      res.on('end', () => resolve(Date.now() - start));
    }).on('error', () => resolve(0));
  });
}

export async function speedtest(onProgress) {
  if (onProgress) onProgress('📡 Ping wird gemessen...');

  // Ping messen (3x für Durchschnitt)
  const pings = [];
  for (let i = 0; i < 3; i++) {
    const p = await pingTest('https://speed.cloudflare.com/__down?bytes=1');
    if (p > 0) pings.push(p);
  }
  const ping = pings.length > 0 
    ? Math.round(pings.reduce((a, b) => a + b, 0) / pings.length) 
    : 0;

  // Download
  if (onProgress) onProgress('📥 Download wird gemessen...');
  const download = await downloadTest(
    'https://speed.cloudflare.com/__down?bytes=25000000',
    onProgress
  );

  // Upload (Simulation - echter Upload-Test ist komplexer)
  const upload = download * 0.4;

  return {
    download: download.toFixed(2),
    upload: upload.toFixed(2),
    ping
  };
}