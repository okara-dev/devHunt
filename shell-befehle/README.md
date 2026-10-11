# A-Z Shell Toolbox

## What It Is

A-Z Shell Toolbox is a Windows PowerShell profile extension with one-letter commands for common desktop, project, network, productivity, and game tasks. It is intended for personal use from an interactive PowerShell session.

## Command Overview

| Command | Description |
| --- | --- |
| `a` | Show battery percentage, estimated remaining time, and status |
| `b [url]` | Open a browser URL; defaults to DeepSeek |
| `c` | Open the Windows calculator |
| `d` | Show the date and open Google Calendar |
| `e` | Choose the console text color |
| `f` | Empty the Recycle Bin after confirmation |
| `g` | Open GitHub |
| `h` | Change to the home directory |
| `i` | Run the animated console screensaver; stop with `Ctrl+C` |
| `j` | Inspect and optionally clean the Downloads folder |
| `k` | Flip a coin |
| `l [path]` | Calculate the total size of a folder |
| `m [length]` | Generate a password and copy it to the clipboard |
| `n <max> <achieved>` | Calculate German grade points |
| `o [folder]` | Open or create a project folder under `Desktop\Projekte` |
| `p` | Show startup applications |
| `q` | Schedule a Windows restart after confirmation |
| `r [term]` | Show a random or searched German Wikipedia article |
| `s [city]` | Show current weather and a three-day forecast |
| `t` | Run the speed test |
| `u` | Search for Windows updates |
| `v` | Delete images or screenshots |
| `w` | Roll a six-sided die |
| `x` | Open an Office application |
| `y` | Encode or decode Morse code |
| `z` | Open the games menu |
| `hilfe` | Show the toolbox help in the terminal |

## Games

The `z` menu contains:

1. Rock Paper Scissors, best of five against the computer
2. Blackjack, draw or stand toward 21
3. Number Guessing, guess a number from 1 to 100 in up to 10 attempts
4. Tic-Tac-Toe, a 3x3 game against the computer
5. Connect Four, a 6x7 game against the computer

## Installation

This project is designed for Windows PowerShell 5.1 or newer.

1. Open PowerShell and inspect your profile path:

   ```powershell
   $PROFILE
   ```

2. Create or open the profile file:

   ```powershell
   New-Item -ItemType File -Path $PROFILE -Force
   notepad $PROFILE
   ```

3. Copy the contents of `shell_toolbox.ps1` into the profile, save it, and reload the profile:

   ```powershell
   . $PROFILE
   ```

4. Type `hilfe` to confirm that the functions are available.

If script execution is blocked, use the least permissive user-level policy needed for local scripts:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

## Technology

- Windows PowerShell 5.1+
- PowerShell profile functions and standard Windows commands
- CIM/WMI for battery information
- Windows Registry and Startup folder inspection
- `Invoke-RestMethod` for Wikipedia and Open-Meteo requests
- Windows Clipboard, Calculator, browser, Office, and shutdown integrations

## Privacy and Safety

Most commands run locally, but `r`, `s`, and `t` contact external services. Wikipedia and Open-Meteo may receive query, location, IP, or request metadata according to their own policies. Review the script before installing it into a profile.

The following commands can change or delete data or affect the system:

- `f` permanently empties the Recycle Bin.
- `j` can delete old or all files in Downloads.
- `v` deletes selected images or screenshots.
- `q` schedules a system restart.
- `m` places a generated password in the clipboard.

Use these commands only after checking the prompt and target paths. The toolbox is not a backup, password manager, or security hardening tool.

## GitHub Distribution

This project is intended for publication and maintenance on GitHub. Review changes, external URLs, and destructive operations before merging or deploying the profile script.

## License

MIT License. See the repository license file or the license badge for the applicable terms.

## Status

This is a personal PowerShell toolbox. Several help messages and output labels in the script are German even though this README is written in English.