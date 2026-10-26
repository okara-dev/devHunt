import https from 'https';

function httpsGet(url, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve({ raw: data });
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

export async function getPublicInfo() {
  // API 1: ipapi.co (kostenlos, keine Registrierung)
  try {
    const data = await httpsGet('https://ipapi.co/json/', 5000);
    if (data && data.ip && !data.error) {
      return {
        ip: data.ip,
        city: data.city || 'Unbekannt',
        country: data.country_name || 'Unbekannt',
        isp: data.org || 'Unbekannt'
      };
    }
  } catch (e) {
    // Weiter zur nächsten API
  }

  // API 2: ipwho.is (kostenlos, kein Limit)
  try {
    const data = await httpsGet('https://ipwho.is/', 5000);
    if (data && data.ip && data.success !== false) {
      return {
        ip: data.ip,
        city: data.city || 'Unbekannt',
        country: data.country || 'Unbekannt',
        isp: data.connection?.isp || 'Unbekannt'
      };
    }
  } catch (e) {
    // Weiter zur nächsten API
  }

  // API 3: ipinfo.io (Fallback)
  try {
    const data = await httpsGet('https://ipinfo.io/json', 5000);
    if (data && data.ip) {
      return {
        ip: data.ip,
        city: data.city || 'Unbekannt',
        country: data.country || 'Unbekannt',
        isp: data.org || 'Unbekannt'
      };
    }
  } catch (e) {
    // Alle APIs fehlgeschlagen
  }

  return {
    ip: 'Nicht ermittelbar',
    city: 'Unbekannt',
    country: 'Unbekannt',
    isp: 'Unbekannt'
  };
}