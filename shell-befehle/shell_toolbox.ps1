# PowerShell-Profil: Microsoft.PowerShell_profile.ps1
# A-Z Shell Toolbox (bereinigt: nur Terminal-Support + Öffnen)

Remove-Item Alias:h -ErrorAction SilentlyContinue -Force
Remove-Item Alias:r -ErrorAction SilentlyContinue -Force

function shell {
    Write-Host "[SHELL] Verfuegbare Funktionen:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "a  - Akkustatus anzeigen" -ForegroundColor Green
    Write-Host "b  - KI oeffnen (DeepSeek)" -ForegroundColor Green
    Write-Host "c  - Taschenrechner im Browser" -ForegroundColor Green
    Write-Host "d  - Google Kalender oeffnen" -ForegroundColor Green
    Write-Host "e  - GitHub oeffnen" -ForegroundColor Green
    Write-Host "f  - Zum Home-Verzeichnis wechseln" -ForegroundColor Green
    Write-Host "g  - Screensaver starten" -ForegroundColor Green
    Write-Host "h  - Ordnergroesse anzeigen" -ForegroundColor Green
    Write-Host "i  - Passwort-Generator" -ForegroundColor Green
    Write-Host "j  - Notenpunkte berechnen" -ForegroundColor Green
    Write-Host "k  - Zu Projekt-Ordner wechseln" -ForegroundColor Green
    Write-Host "l  - PC neustarten" -ForegroundColor Green
    Write-Host "m  - Speedtest" -ForegroundColor Green
    Write-Host "n  - Office oeffnen" -ForegroundColor Green
    Write-Host "o  - Spiele im Browser oeffnen" -ForegroundColor Green
    Write-Host "p  - Google Colab oeffnen" -ForegroundColor Green
    Write-Host ""
}

function a {
    $akku = Get-CimInstance -ClassName Win32_Battery
    if ($akku) {
        $prozent = $akku.EstimatedChargeRemaining
        $ladezeit = $akku.EstimatedRunTime

        if ($ladezeit -gt 1000) {
            $zeit = "unendlich (Netzbetrieb)"
        } elseif ($ladezeit -gt 0 -and $prozent -gt 5) {
            $zeitBis5Prozent = $ladezeit * (($prozent - 5) / $prozent)
            $stunden = [math]::Floor($zeitBis5Prozent / 60)
            $minuten = [math]::Round($zeitBis5Prozent % 60)
            if ($stunden -gt 0) {
                if ($minuten -gt 0) { $zeit = "$stunden Std $minuten Min" }
                else { $zeit = "$stunden Std" }
            } else { $zeit = "$minuten Min" }
        } elseif ($prozent -le 5) {
            $zeit = "Weniger als 5 Prozent - PC geht gleich aus!"
        } else { $zeit = "Wird geladen..." }

        if ($prozent -ge 50) { $farbe = "Green" }
        elseif ($prozent -ge 20) { $farbe = "Yellow" }
        elseif ($prozent -ge 10) { $farbe = "DarkYellow" }
        else { $farbe = "Red" }

        Write-Host "[AKKU] $prozent%" -ForegroundColor $farbe
        Write-Host "[RESTZEIT] $zeit" -ForegroundColor Yellow

        $status = $akku.BatteryStatus
        switch ($status) {
            1 { $statusText = "Entladen" }
            2 { $statusText = "Wird geladen" }
            3 { $statusText = "Voll geladen" }
            4 { $statusText = "Standby" }
            default { $statusText = "Unbekannt" }
        }
        Write-Host "[STATUS] $statusText" -ForegroundColor Cyan
    } else {
        Write-Host "[PC] Kein Akku gefunden (Desktop-PC?)" -ForegroundColor Red
    }
}

function b {
    Start-Process "https://chat.deepseek.com/"
    Write-Host "[KI] DeepSeek geoeffnet" -ForegroundColor Cyan
}

function c {
    Start-Process "https://www.desmos.com/scientific"
    Write-Host "[CALC] Taschenrechner (Desmos) geoeffnet" -ForegroundColor Cyan
}

function d {
    Start-Process "https://calendar.google.com/calendar/u/0/r"
    Write-Host "[KALENDER] Google Kalender geoeffnet" -ForegroundColor Cyan
}

function e {
    Start-Process "https://www.github.com"
    Write-Host "[GITHUB] Geoeffnet" -ForegroundColor Cyan
}

function f {
    Set-Location "C:\Users\$env:USERNAME"
    Write-Host "[HOME] $(Get-Location)" -ForegroundColor Cyan
}

function g {
    Clear-Host
    Write-Host "[SCREENSAVER] Startet... (Strg+C zum Beenden)" -ForegroundColor Cyan
    Start-Sleep -Seconds 2
    $farben = @('Red','Green','Yellow','Blue','Magenta','Cyan','White')
    $zeichen = @('#','*','+','.','o','O','@','%')
    while ($true) {
        $x = Get-Random -Minimum 0 -Maximum 80
        $y = Get-Random -Minimum 0 -Maximum 20
        $farbe = $farben | Get-Random
        $z = $zeichen | Get-Random
        [Console]::SetCursorPosition($x, $y)
        Write-Host $z -ForegroundColor $farbe -NoNewline
        Start-Sleep -Milliseconds (Get-Random -Minimum 10 -Maximum 100)
    }
}

function h {
    param([string]$pfad = ".")
    if ($pfad -eq ".") { $pfad = (Get-Location).Path }
    $groesse = Get-ChildItem -Path $pfad -Recurse -ErrorAction SilentlyContinue |
               Measure-Object -Property Length -Sum
    $gesamtMB = [math]::Round($groesse.Sum / 1MB, 2)
    $gesamtGB = [math]::Round($groesse.Sum / 1GB, 2)
    Write-Host "[ORDNER] $pfad" -ForegroundColor Cyan
    Write-Host "[GROESSE] $gesamtMB MB ($gesamtGB GB)" -ForegroundColor Green
}

function i {
    param([int]$laenge = 20)
    $gross = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    $klein = "abcdefghijklmnopqrstuvwxyz"
    $zahlen = "0123456789"
    $sonder = "!@#$%^&*()-_=+[]{}|;:,.<>?/~"
    $alle = $gross + $klein + $zahlen + $sonder

    $passwort = ""
    $passwort += $gross[(Get-Random -Maximum $gross.Length)]
    $passwort += $klein[(Get-Random -Maximum $klein.Length)]
    $passwort += $zahlen[(Get-Random -Maximum $zahlen.Length)]
    $passwort += $sonder[(Get-Random -Maximum $sonder.Length)]

    for ($k = 4; $k -lt $laenge; $k++) {
        $passwort += $alle[(Get-Random -Maximum $alle.Length)]
    }

    $passwort = -join ($passwort.ToCharArray() | Sort-Object { Get-Random })
    Write-Host $passwort -ForegroundColor Green
    $passwort | Set-Clipboard
    Write-Host "[PASSWORT] In Clipboard kopiert" -ForegroundColor DarkGray
}

function j {
    param($max, $erreicht)
    $p = ($erreicht / $max) * 100

    if ($p -ge 95) { $note = 15 }
    elseif ($p -ge 90) { $note = 14 }
    elseif ($p -ge 85) { $note = 13 }
    elseif ($p -ge 80) { $note = 12 }
    elseif ($p -ge 75) { $note = 11 }
    elseif ($p -ge 70) { $note = 10 }
    elseif ($p -ge 65) { $note = 9 }
    elseif ($p -ge 60) { $note = 8 }
    elseif ($p -ge 55) { $note = 7 }
    elseif ($p -ge 50) { $note = 6 }
    elseif ($p -ge 45) { $note = 5 }
    elseif ($p -ge 40) { $note = 4 }
    elseif ($p -ge 33) { $note = 3 }
    elseif ($p -ge 27) { $note = 2 }
    elseif ($p -ge 20) { $note = 1 }
    else { $note = 0 }

    Write-Host "Erreicht: $erreicht von $max Punkten" -ForegroundColor Cyan
    Write-Host "Prozent: $([math]::Round($p, 1))%" -ForegroundColor Yellow
    Write-Host "Note: $note Notenpunkte" -ForegroundColor Green
}

function k {
    param([string]$ordner = "")
    $basis = "C:\Projekte"
    if (-not (Test-Path $basis)) {
        New-Item -Path $basis -ItemType Directory -Force | Out-Null
        Write-Host "[ORDNER] Projekt-Ordner erstellt: $basis" -ForegroundColor Yellow
    }
    if ($ordner -eq "") {
        Set-Location $basis
    } else {
        $zielPfad = "$basis\$ordner"
        if (-not (Test-Path $zielPfad)) {
            New-Item -Path $zielPfad -ItemType Directory -Force | Out-Null
            Write-Host "[ORDNER] Neuen Projekt-Ordner erstellt: $ordner" -ForegroundColor Green
        }
        Set-Location $zielPfad
    }
    Write-Host "[PROJEKT] Wechsel zu: $(Get-Location)" -ForegroundColor Cyan
}

function l {
    Write-Host "[NEUSTART] PC wirklich neu starten? (j/n)" -ForegroundColor Red
    $antwort = Read-Host
    if ($antwort -eq "j") {
        Write-Host "[NEUSTART] PC wird in 10 Sekunden neu gestartet... (Abbrechen mit shutdown /a)" -ForegroundColor Yellow
        shutdown /r /t 10
    } else {
        Write-Host "[ABBRUCH] Vorgang abgebrochen" -ForegroundColor Yellow
    }
}

function m {
    Write-Host "[INTERNET] Teste Verbindung..." -ForegroundColor Cyan
    $ping = Test-Connection -ComputerName google.de -Count 4 -ErrorAction SilentlyContinue
    if ($ping) {
        $durchschnitt = [math]::Round(($ping | Measure-Object -Property ResponseTime -Average).Average, 0)
        Write-Host "[PING] $durchschnitt ms" -ForegroundColor Green
    } else {
        Write-Host "[FEHLER] Keine Internetverbindung!" -ForegroundColor Red
        return
    }
    Write-Host "[SPEEDTEST] Messe Download..." -ForegroundColor Yellow
    $url = "https://speedtest.tele2.net/10MB.zip"
    $start = Get-Date
    try {
        Invoke-WebRequest -Uri $url -OutFile "$env:TEMP\speedtest.zip" -ErrorAction Stop
        $ende = Get-Date
        $dauer = ($ende - $start).TotalSeconds
        $speed = [math]::Round(10 / $dauer, 2)
        Write-Host "[DOWNLOAD] $speed MB/s" -ForegroundColor Green
        Remove-Item "$env:TEMP\speedtest.zip" -Force -ErrorAction SilentlyContinue
    } catch {
        Write-Host "[WARNUNG] Speedtest fehlgeschlagen" -ForegroundColor Yellow
    }
}

function n {
    Write-Host "[OFFICE] Welches Programm?" -ForegroundColor Cyan
    Write-Host "1  Word" -ForegroundColor Yellow
    Write-Host "2  Excel" -ForegroundColor Green
    Write-Host "3  PowerPoint" -ForegroundColor Magenta
    Write-Host "4  Outlook" -ForegroundColor Blue
    Write-Host "5  OneNote" -ForegroundColor DarkCyan
    Write-Host "0  Abbrechen" -ForegroundColor Red
    $wahl = Read-Host "[OFFICE] Wahl (0-5)"
    switch ($wahl) {
        "1" { Start-Process winword.exe; Write-Host "[WORD] geoeffnet" -ForegroundColor Yellow }
        "2" { Start-Process excel.exe; Write-Host "[EXCEL] geoeffnet" -ForegroundColor Green }
        "3" { Start-Process powerpnt.exe; Write-Host "[POWERPOINT] geoeffnet" -ForegroundColor Magenta }
        "4" { Start-Process outlook.exe; Write-Host "[OUTLOOK] geoeffnet" -ForegroundColor Blue }
        "5" { Start-Process onenote.exe; Write-Host "[ONENOTE] geoeffnet" -ForegroundColor DarkCyan }
        "0" { Write-Host "[ABBRUCH]" -ForegroundColor Red }
        default { Write-Host "[FEHLER] Ungueltige Eingabe!" -ForegroundColor Red }
    }
}

function o {
    Write-Host "========================================" -ForegroundColor Gray
    Write-Host "           SPIELE IM BROWSER" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Gray
    Write-Host "1  Sudoku" -ForegroundColor Green
    Write-Host "2  TicTacToe" -ForegroundColor Green
    Write-Host "3  Schach" -ForegroundColor Green
    Write-Host "4  Karten" -ForegroundColor Green
    Write-Host "5  Vier gewinnt" -ForegroundColor Green
    Write-Host "0  Zurueck" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Gray
    $wahl = Read-Host "[SPIELE] Deine Wahl (0-5)"

    $url = switch ($wahl) {
        "1" { "https://sudoku.com/de/" }
        "2" { "https://playtictactoe.org/" }
        "3" { "https://lichess.org/" }
        "4" { "https://muta.pro/de/catalog/cards/" }
        "5" { "https://muta.pro/de/catalog/cards/" }
        "0" { return }
        default { $null }
    }

    if ($url) {
        Start-Process $url
        Write-Host "[SPIEL] Geoeffnet: $url" -ForegroundColor Cyan
    } else {
        Write-Host "[FEHLER] Ungueltige Eingabe!" -ForegroundColor Red
    }
}

function p {
    Start-Process "https://colab.research.google.com/"
    Write-Host "[COLAB] Google Colab geoeffnet" -ForegroundColor Cyan
}