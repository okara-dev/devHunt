import { ask, colors, clearScreen } from '../utils.js';

export async function playBauernschach() {
  clearScreen();
  // 6x6 Brett mit Bauern
  const SIZE = 6;
  let board = Array(SIZE).fill(null).map(() => Array(SIZE).fill(' '));
  // Spieler X (unten), O (oben)
  for (let c = 0; c < SIZE; c++) {
    board[0][c] = 'O';
    board[1][c] = 'O';
    board[SIZE - 2][c] = 'X';
    board[SIZE - 1][c] = 'X';
  }

  let current = 'X';

  function printBoard() {
    console.log(`    ${Array.from({length: SIZE}, (_, i) => i + 1).join(' ')}`);
    console.log('  ' + '─'.repeat(SIZE * 2));
    for (let r = 0; r < SIZE; r++) {
      let line = `${r + 1} │`;
      for (let c = 0; c < SIZE; c++) {
        const v = board[r][c];
        if (v === 'X') line += `${colors.red}X${colors.reset} `;
        else if (v === 'O') line += `${colors.blue}O${colors.reset} `;
        else line += `${colors.dim}·${colors.reset} `;
      }
      console.log(line);
    }
  }

  function validMoves(player) {
    const moves = [];
    const dir = player === 'X' ? -1 : 1;
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
      if (board[r][c] !== player) continue;
      // Vorwärts
      const nr = r + dir;
      if (nr >= 0 && nr < SIZE && board[nr][c] === ' ') {
        moves.push({from: {r, c}, to: {r: nr, c}});
      }
      // Diagonal schlagen
      for (const dc of [-1, 1]) {
        const nc = c + dc;
        if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
          const target = board[nr][nc];
          if (target !== ' ' && target !== player) {
            moves.push({from: {r, c}, to: {r: nr, c: nc}});
          }
        }
      }
    }
    return moves;
  }

  function checkWin() {
    const xPieces = board.flat().filter(v => v === 'X').length;
    const oPieces = board.flat().filter(v => v === 'O').length;
    if (board[0].some(v => v === 'X')) return 'X';
    if (board[SIZE - 1].some(v => v === 'O')) return 'O';
    if (xPieces === 0) return 'O';
    if (oPieces === 0) return 'X';
    return null;
  }

  while (true) {
    clearScreen();
    console.log(`${colors.bold}${colors.cyan}Bauernschach${colors.reset}`);
    console.log(`Spieler: ${current === 'X' ? colors.red + 'X' : colors.blue + 'O'}${colors.reset}`);
    printBoard();

    const winner = checkWin();
    if (winner) {
      if (winner === 'X') console.log(`\n${colors.green}🎉 Du gewinnst!${colors.reset}`);
      else console.log(`\n${colors.red}💻 Computer gewinnt!${colors.reset}`);
      break;
    }

    if (current === 'X') {
      const fromInput = await ask('Von (Zeile Spalte): ');
      const [fr, fc] = fromInput.split(/\s+/).map(Number).map(n => n - 1);
      if (isNaN(fr) || isNaN(fc) || board[fr]?.[fc] !== 'X') continue;
      const toInput = await ask('Nach (Zeile Spalte): ');
      const [tr, tc] = toInput.split(/\s+/).map(Number).map(n => n - 1);
      const moves = validMoves('X');
      const valid = moves.some(m => m.from.r === fr && m.from.c === fc && m.to.r === tr && m.to.c === tc);
      if (!valid) { console.log(`${colors.red}Ungültiger Zug!${colors.reset}`); await ask('Enter...'); continue; }
      board[tr][tc] = 'X';
      board[fr][fc] = ' ';
      current = 'O';
    } else {
      await new Promise(r => setTimeout(r, 500));
      const moves = validMoves('O');
      if (moves.length === 0) { current = 'X'; continue; }
      const move = moves[Math.floor(Math.random() * moves.length)];
      board[move.to.r][move.to.c] = 'O';
      board[move.from.r][move.from.c] = ' ';
      current = 'X';
    }
  }
  await ask('\nEnter für Menü...');
}