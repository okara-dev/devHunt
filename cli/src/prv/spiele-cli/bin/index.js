#!/usr/bin/env node

import { ask, colors, clearScreen, rl } from '../lib/utils.js';
import { playTicTacToe } from '../lib/games/tictactoe.js';
import { playVierGewinnt } from '../lib/games/viergewinnt.js';
import { playSchach } from '../lib/games/schach.js';
import { playMuehle } from '../lib/games/muehle.js';
import { playMastermind } from '../lib/games/mastermind.js';
import { playNim } from '../lib/games/nim.js';
import { playSudoku } from '../lib/games/sudoku.js';
import { playBauernschach } from '../lib/games/bauernschach.js';
import { playGalgenmaennchen } from '../lib/games/galgenmaennchen.js';
import { playReversi } from '../lib/games/reversi.js';

function showBanner() {
  console.log(`
${colors.bold}${colors.cyan}╔══════════════════════════════════════════════════════════════╗
║                   🎮 SPIELE-CLI 🎮                            ║
║          10 klassische Logik- & Strategiespiele              ║
╚══════════════════════════════════════════════════════════════╝${colors.reset}
`);
}

function showMenu() {
  console.log(`${colors.bold}Wähle ein Spiel:${colors.reset}\n`);
  console.log(`  ${colors.green}1${colors.reset}  Tic-Tac-Toe        ${colors.dim}(3x3 Felder)${colors.reset}`);
  console.log(`  ${colors.green}2${colors.reset}  Vier Gewinnt       ${colors.dim}(6x7 Felder)${colors.reset}`);
  console.log(`  ${colors.green}3${colors.reset}  Schach             ${colors.dim}(Text-Modus)${colors.reset}`);
  console.log(`  ${colors.green}4${colors.reset}  Mühle              ${colors.dim}(24 Felder)${colors.reset}`);
  console.log(`  ${colors.green}5${colors.reset}  Mastermind         ${colors.dim}(Code knacken)${colors.reset}`);
  console.log(`  ${colors.green}6${colors.reset}  Nim                ${colors.dim}(Hölzer nehmen)${colors.reset}`);
  console.log(`  ${colors.green}7${colors.reset}  Sudoku             ${colors.dim}(9x9 Zahlen)${colors.reset}`);
  console.log(`  ${colors.green}8${colors.reset}  2048               ${colors.dim}(Kacheln schieben)${colors.reset}`);
  console.log(`  ${colors.green}9${colors.reset}  Galgenmännchen     ${colors.dim}(Wörter raten)${colors.reset}`);
  console.log(`  ${colors.green}10${colors.reset} Bauernschach       ${colors.dim}(6x6 Felder)${colors.reset}`);
  console.log(`\n  ${colors.yellow}0${colors.reset}  Beenden\n`);
}

async function main() {
  clearScreen();
  showBanner();

  while (true) {
    showMenu();
    const choice = await ask(`\n${colors.cyan}Deine Wahl: ${colors.reset}`);

    switch (choice) {
      case '1': await playTicTacToe(); break;
      case '2': await playVierGewinnt(); break;
      case '3': await playSchach(); break;
      case '4': await playMuehle(); break;
      case '5': await playMastermind(); break;
      case '6': await playNim(); break;
      case '7': await playSudoku(); break;
      case '8': await play2048(); break;
      case '9': await playGalgenmaennchen(); break;
      case '10': await playBauernschach(); break;
      case '0':
        console.log(`\n${colors.bold}👋 Bis zum nächsten Mal!${colors.reset}\n`);
        rl.close();
        process.exit(0);
      default:
        console.log(`${colors.red}❌ Ungültige Auswahl!${colors.reset}`);
        await ask('Enter...');
    }

    clearScreen();
    showBanner();
  }
}

process.on('SIGINT', () => {
  console.log(`\n\n${colors.yellow}👋 Abgebrochen.${colors.reset}\n`);
  rl.close();
  process.exit(0);
});

main();