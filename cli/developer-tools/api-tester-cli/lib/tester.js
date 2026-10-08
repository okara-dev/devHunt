/**
 * Testet einen API-Endpunkt
 * @param {string} url - Die zu testende URL
 * @param {object} options - Optionen (timeout, headers)
 * @returns {object} Testergebnis
 */
export async function testEndpoint(url, options = {}) {
  const timeout = options.timeout || 10000;
  const startTime = Date.now();
  const result = {
    url,
    reachable: false,
    status: null,
    statusText: null,
    responseTime: null,
    requiresAuth: null,
    authType: null,
    headers: {},
    contentType: null,
    server: null,
    cors: null,
    ssl: null,
    error: null
  };

  try {
    // HEAD-Request zuerst (schnell, kein Body) [citation:3][citation:8]
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response;
    try {
      response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'follow'
      });
    } catch (e) {
      // Manche Server mögen kein HEAD → GET als Fallback
      response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        redirect: 'follow'
      });
    }

    clearTimeout(timeoutId);
    result.responseTime = Date.now() - startTime;
    result.reachable = true;
    result.status = response.status;
    result.statusText = response.statusText;

    // Headers sammeln
    for (const [key, value] of response.headers.entries()) {
      result.headers[key.toLowerCase()] = value;
    }

    // Basis-Infos
    result.contentType = response.headers.get('content-type');
    result.server = response.headers.get('server');
    result.cors = response.headers.get('access-control-allow-origin') || 'nicht gesetzt';

    // Auth-Erkennung anhand Status-Code [citation:2][citation:5]
    if (response.status === 401) {
      result.requiresAuth = true;
      result.authType = detectAuthType(response.headers);
    } else if (response.status === 403) {
      result.requiresAuth = true;
      result.authType = 'Zugriff verweigert (403)';
    } else if (response.status === 200 || response.status === 204) {
      // Prüfen ob WWW-Authenticate Header auf Auth hinweist
      const wwwAuth = response.headers.get('www-authenticate');
      if (wwwAuth) {
        result.requiresAuth = true;
        result.authType = wwwAuth;
      } else {
        result.requiresAuth = false;
        result.authType = null;
      }
    } else if (response.status === 429) {
      result.requiresAuth = 'unbekannt (Rate-Limit)';
      result.authType = 'Rate-Limit erreicht';
    }

  } catch (error) {
    result.responseTime = Date.now() - startTime;
    if (error.name === 'AbortError') {
      result.error = `Timeout nach ${timeout}ms`;
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      result.error = 'DNS-Auflösung fehlgeschlagen (Domain existiert nicht)';
    } else if (error.message.includes('ECONNREFUSED')) {
      result.error = 'Verbindung abgelehnt (Server nicht erreichbar)';
    } else if (error.message.includes('certificate') || error.message.includes('SSL')) {
      result.error = 'SSL/TLS-Fehler (Zertifikat ungültig)';
    } else {
      result.error = error.message;
    }
  }

  return result;
}

/**
 * Erkennt Auth-Typ anhand der Response-Headers
 */
function detectAuthType(headers) {
  const wwwAuth = headers.get('www-authenticate');
  if (wwwAuth) {
    if (wwwAuth.toLowerCase().includes('bearer')) {
      return 'Bearer Token (JWT/OAuth)';
    }
    if (wwwAuth.toLowerCase().includes('basic')) {
      return 'Basic Auth';
    }
    if (wwwAuth.toLowerCase().includes('apikey') || wwwAuth.toLowerCase().includes('api-key')) {
      return 'API-Key';
    }
    return wwwAuth;
  }

  // Wenn 401 ohne WWW-Authenticate → vermutlich Custom-Header
  return 'API-Key (Custom Header vermutet)';
}

/**
 * Testet mehrere Endpunkte parallel [citation:6]
 */
export async function testMultiple(urls, options = {}) {
  const results = await Promise.all(
    urls.map(url => testEndpoint(url, options))
  );
  return results;
}