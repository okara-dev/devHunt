import { ask, colors, clearScreen } from '../utils.js';

export async function playVierGewinnt() {
  clearScreen();
  const ROWS = 6, COLS = 7;
  const board = Array(ROWS).fill(null).map(() => Array(COLS).fill(' '));
  let currentPlayer = '🔴';

  function drop(col, player) {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][col] === ' ') {
        board[r][col] = player;
        return r;
      }
    }
    return -1;
  }

  function checkWin(player) {
    // Horizontal
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        if (board[r][c] === player && board[r][c+1] === player &&
            board[r][c+2] === player && board[r][c+3] === player) return true;
      }
    }
    // Vertikal
    for (let r = 0; r <= ROWS - 4; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c] === player && board[r+1][c] === player &&
            board[r+2][c] === player && board[r+3][c] === player) return true;
      }
    }
    // Diagonal
    for (let r = 0; r <= ROWS - 4; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        if (board[r][c] === player && board[r+1][c+1] === player &&
            board[r+2][c+2] === player && board[r+3][c+3] === player) return true;
        if (board[r][c+3] === player && board[r+1][c+2] === player &&
            board[r+2][c+1] === player && board[r+3][c] === player) return true;
      }
    }
    return false;
  }

  function isFull() {
    return board[0].every(cell => cell !== ' ');
  }

  function printBoard() {
    console.log('\n 1   2   3   4   5   6   7');
    console.log('─────────────────────────');
    for (const row of board) {
      console.log('│ ' + row.join(' │ ') + ' │');
      console.log('─────────────────────────');
    }
  }

  function computerMove(player) {
    const validCols = [];
    for (let c = 0; c < COLS; c++) if (board[0][c] === ' ') validCols.push(c);
    if (validCols.length === 0) return -1;

    // Gewinnen?
    for (const c of validCols) {
      const testBoard = board.map(r => [...r]);
      for (let r = ROWS - 1; r >= 0; r--) {
        if (testBoard[r][c] === ' ') { testBoard[r][c] = player; break; }
      }
      if (checkWin(player)) return c;
    }
    // Blocken?
    const enemy = player === '🔴' ? '🟡' : '🔴';
    for (const c of validCols) {
      const testBoard = board.map(r => [...r]);
      for (let r = ROWS - 1; r >= 0; r--) {
        if (testBoard[r][c] === ' ') { testBoard[r][c] = enemy; break; }
      }
      if (checkWin(enemy)) return c;
    }
    // Mitte bevorzugen
    if (validCols.includes(3)) return 3;
    return validCols[Math.floor(Math.random() * validCols.length)];
  }

  let gameOver = false;
  while (!gameOver) {
    clearScreen();
    console.log(`${colors.bold}${colors.cyan}Vier Gewinnt${colors.reset}`);
    printBoard();
    console.log(`\n${currentPlayer} ist dran ${currentPlayer === '🔴' ? '(Du)' : '(Computer)'}`);

    let col;
    if (currentPlayer === '🔴') {
      const input = await ask('Spalte (1-7): ');
      col = parseInt(input) - 1;
      if (isNaN(col) || col < 0 || col >= COLS || board[0][col] !== ' ') {
        console.log(`${colors.red}Ungültig!${colors.reset}`);
        await ask('Enter...');
        continue;
      }
    } else {
      await new Promise(r => setTimeout(r, 500));
      col = computerMove('🟡');
    }

    drop(col, currentPlayer);

    if (checkWin(currentPlayer)) {
      clearScreen();
      printBoard();
      if (currentPlayer === '🔴') {
        console.log(`${colors.green}🎉 Du hast gewonnen!${colors.reset}`);
      } else {
        console.log(`${colors.red}💻 Computer gewinnt!${colors.reset}`);
      }
      gameOver = true;
    } else if (isFull()) {
      clearScreen();
      printBoard();
      console.log(`${colors.yellow}🤝 Unentschieden!${colors.reset}`);
      gameOver = true;
    } else {
      currentPlayer = currentPlayer === '🔴' ? '🟡' : '🔴';
    }
  }
  await ask('\nEnter für Menü...');
}