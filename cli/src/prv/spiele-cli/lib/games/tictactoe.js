import { ask, colors, clearScreen } from '../utils.js';

export async function playTicTacToe() {
  clearScreen();
  const board = Array(9).fill(' ');
  let currentPlayer = 'X';
  let gameOver = false;

  const winPatterns = [
    [0,1,2],[3,4,5],[6,7,8], // Reihen
    [0,3,6],[1,4,7],[2,5,8], // Spalten
    [0,4,8],[2,4,6]          // Diagonalen
  ];

  function checkWinner() {
    for (const pattern of winPatterns) {
      const [a,b,c] = pattern;
      if (board[a] !== ' ' && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    return board.includes(' ') ? null : 'Unentschieden';
  }

  function printBoard() {
    console.log(`
 ${colors.cyan}${board[0]}${colors.reset} │ ${colors.cyan}${board[1]}${colors.reset} │ ${colors.cyan}${board[2]}${colors.reset}
───┼───┼───
 ${colors.cyan}${board[3]}${colors.reset} │ ${colors.cyan}${board[4]}${colors.reset} │ ${colors.cyan}${board[5]}${colors.reset}
───┼───┼───
 ${colors.cyan}${board[6]}${colors.reset} │ ${colors.cyan}${board[7]}${colors.reset} │ ${colors.cyan}${board[8]}${colors.reset}
    `);
  }

  function computerMove() {
    const empty = board.map((v, i) => v === ' ' ? i : null).filter(v => v !== null);
    // Einfache KI: gewinnen, blocken, sonst zufällig
    for (const pattern of winPatterns) {
      const [a,b,c] = pattern;
      const vals = [board[a],board[b],board[c]];
      if (vals.filter(v => v === 'O').length === 2 && vals.includes(' ')) {
        return pattern[vals.indexOf(' ')];
      }
    }
    for (const pattern of winPatterns) {
      const [a,b,c] = pattern;
      const vals = [board[a],board[b],board[c]];
      if (vals.filter(v => v === 'X').length === 2 && vals.includes(' ')) {
        return pattern[vals.indexOf(' ')];
      }
    }
    if (board[4] === ' ') return 4;
    return empty[Math.floor(Math.random() * empty.length)];
  }

  while (!gameOver) {
    clearScreen();
    console.log(`${colors.bold}${colors.cyan}Tic-Tac-Toe${colors.reset}`);
    printBoard();

    if (currentPlayer === 'X') {
      console.log(`${colors.green}Du bist X${colors.reset}`);
      const input = await ask('Feld (1-9): ');
      const pos = parseInt(input) - 1;
      if (isNaN(pos) || pos < 0 || pos > 8 || board[pos] !== ' ') {
        console.log(`${colors.red}Ungültig!${colors.reset}`);
        await ask('Enter...');
        continue;
      }
      board[pos] = 'X';
    } else {
      console.log(`${colors.yellow}Computer (O) ist dran...${colors.reset}`);
      await new Promise(r => setTimeout(r, 500));
      board[computerMove()] = 'O';
    }

    const winner = checkWinner();
    if (winner) {
      clearScreen();
      printBoard();
      if (winner === 'Unentschieden') {
        console.log(`${colors.yellow}🤝 Unentschieden!${colors.reset}`);
      } else if (winner === 'X') {
        console.log(`${colors.green}🎉 Du hast gewonnen!${colors.reset}`);
      } else {
        console.log(`${colors.red}💻 Computer gewinnt!${colors.reset}`);
      }
      gameOver = true;
    } else {
      currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    }
  }
  await ask('\nEnter für Menü...');
}