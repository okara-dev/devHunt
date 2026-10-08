import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function scanWifi() {
  const networks = [];

  try {
    if (process.platform === 'win32') {
      const { stdout } = await execAsync('netsh wlan show networks mode=bssid', {
        maxBuffer: 1024 * 1024
      });

      // Windows Ausgabe parsen
      const lines = stdout.split('\n');
      let currentNetwork = null;
      let currentSignal = 0;
      let currentChannel = '?';
      let currentAuth = 'offen';

      for (const line of lines) {
        // SSID Zeile: "SSID 1 : Vodafone-4D7B"
        const ssidMatch = line.match(/^SSID \d+\s*:\s*(.+)$/);
        if (ssidMatch) {
          // Vorheriges Netzwerk speichern
          if (currentNetwork) {
            networks.push({
              ssid: currentNetwork,
              signal: currentSignal,
              channel: currentChannel,
              security: currentAuth
            });
          }
          currentNetwork = ssidMatch[1].trim();
          currentSignal = 0;
          currentChannel = '?';
          currentAuth = 'offen';
          continue;
        }

        // Authentifizierung: "Authentifizierung : WPA2-Personal"
        const authMatch = line.match(/Authentifizierung\s*:\s*(.+)/);
        if (authMatch) {
          currentAuth = authMatch[1].trim();
          continue;
        }

        // Signal: "Signal : 85%"
        const signalMatch = line.match(/Signal\s*:\s*(\d+)%/);
        if (signalMatch) {
          const val = parseInt(signalMatch[1]);
          if (val > currentSignal) currentSignal = val;
          continue;
        }

        // Kanal: "Kanal : 6"
        const channelMatch = line.match(/Kanal\s*:\s*(\d+)/);
        if (channelMatch) {
          currentChannel = channelMatch[1];
          continue;
        }
      }

      // Letztes Netzwerk speichern
      if (currentNetwork) {
        networks.push({
          ssid: currentNetwork,
          signal: currentSignal,
          channel: currentChannel,
          security: currentAuth
        });
      }

    } else if (process.platform === 'darwin') {
      // macOS
      const { stdout } = await execAsync(
        '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -s'
      );
      const lines = stdout.split('\n').slice(1);
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 7) {
          networks.push({
            ssid: parts[0],
            signal: parseInt(parts[2]) || 0,
            channel: parts[3],
            security: parts[6] || 'offen'
          });
        }
      }
    } else {
      // Linux
      const { stdout } = await execAsync('nmcli -t -f SSID,SIGNAL,CHAN,SECURITY dev wifi');
      const lines = stdout.split('\n').filter(Boolean);
      for (const line of lines) {
        const [ssid, signal, channel, security] = line.split(':');
        if (ssid) {
          networks.push({
            ssid,
            signal: parseInt(signal) || 0,
            channel,
            security: security || 'offen'
          });
        }
      }
    }
  } catch (error) {
    throw new Error('WLAN-Scan nicht möglich: ' + error.message);
  }

  return networks;
}