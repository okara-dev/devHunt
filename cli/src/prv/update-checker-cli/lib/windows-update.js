import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Prüft Windows-Updates mit der Windows Update API (via PowerShell)
 * 
 * Nutzt Microsoft.Update.Session COM-Objekt
 * Criteria: IsInstalled=0 and IsHidden=0 → nicht installierte, nicht versteckte Updates
 */
export async function listWindowsUpdates() {
  const psScript = `
    $ErrorActionPreference = "SilentlyContinue"
    try {
      $session = New-Object -ComObject Microsoft.Update.Session
      $searcher = $session.CreateUpdateSearcher()
      $searcher.Online = $true
      $result = $searcher.Search("IsInstalled=0 and IsHidden=0")
      
      $updates = @()
      foreach ($update in $result.Updates) {
        $updates += [PSCustomObject]@{
          Title = $update.Title
          Description = $update.Description
          Size = $update.MaxDownloadSize
          IsDownloaded = $update.IsDownloaded
          RebootRequired = $update.RebootRequired
        }
      }
      
      $updates | ConvertTo-Json -Depth 3
    } catch {
      Write-Output "ERROR: $($_.Exception.Message)"
    }
  `;

  try {
    const { stdout } = await execAsync(
      `powershell -NoProfile -Command "${psScript.replace(/"/g, '\\"')}"`,
      { timeout: 300000, maxBuffer: 1024 * 1024 * 10 }
    );

    const trimmed = stdout.trim();
    if (!trimmed || trimmed.startsWith('ERROR:')) {
      return { error: trimmed };
    }

    const parsed = JSON.parse(trimmed);
    const updates = Array.isArray(parsed) ? parsed : [parsed];

    return {
      updates: updates.map(u => ({
        title: u.Title,
        description: u.Description || '',
        size: u.Size || 0,
        sizeMb: ((u.Size || 0) / (1024 * 1024)).toFixed(2),
        isDownloaded: u.IsDownloaded || false,
        rebootRequired: u.RebootRequired || false
      }))
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Führt Windows-Updates mit der Windows Update API durch
 */
export async function installWindowsUpdates() {
  const psScript = `
    $ErrorActionPreference = "Stop"
    try {
      $session = New-Object -ComObject Microsoft.Update.Session
      $searcher = $session.CreateUpdateSearcher()
      $searcher.Online = $true
      $result = $searcher.Search("IsInstalled=0 and IsHidden=0")
      
      if ($result.Updates.Count -eq 0) {
        Write-Output "NO_UPDATES"
        exit 0
      }
      
      $updatesToInstall = New-Object -ComObject Microsoft.Update.UpdateColl
      foreach ($update in $result.Updates) {
        $updatesToInstall.Add($update) | Out-Null
      }
      
      $downloader = $session.CreateUpdateDownloader()
      $downloader.Updates = $updatesToInstall
      $downloader.Download()
      
      $installer = $session.CreateUpdateInstaller()
      $installer.Updates = $updatesToInstall
      $installationResult = $installer.Install()
      
      Write-Output "RESULT: $($installationResult.ResultCode)"
      Write-Output "REBOOT: $($installationResult.RebootRequired)"
    } catch {
      Write-Output "ERROR: $($_.Exception.Message)"
    }
  `;

  try {
    const { stdout } = await execAsync(
      `powershell -NoProfile -Command "${psScript.replace(/"/g, '\\"')}"`,
      { timeout: 3600000, maxBuffer: 1024 * 1024 * 10 }
    );

    const trimmed = stdout.trim();
    if (trimmed.includes('NO_UPDATES')) {
      return { success: true, message: 'Keine Updates verfügbar' };
    }

    if (trimmed.startsWith('ERROR:')) {
      return { success: false, error: trimmed };
    }

    const resultMatch = trimmed.match(/RESULT:\s*(\d+)/);
    const rebootMatch = trimmed.match(/REBOOT:\s*(\w+)/);

    return {
      success: true,
      resultCode: resultMatch ? parseInt(resultMatch[1]) : null,
      rebootRequired: rebootMatch ? rebootMatch[1].toLowerCase() === 'true' : false
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}