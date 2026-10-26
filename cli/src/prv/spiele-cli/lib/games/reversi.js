import { ask, colors, clearScreen } from '../utils.js';

export async function playReversi() {
  clearScreen();
  const SIZE = 8;
  let board = Array(SIZE).fill(null).map(() => Array(SIZE).fill(' '));
  // Startposition
  board[3][3] = 'X'; board[4][4] = 'X';
  board[3][4] = 'O'; board[4][3] = 'O';
  let current = 'X';

  const directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

  function getFlips(r, c, player) {
    if (board[r][c] !== ' ') return [];
    const enemy = player === 'X' ? 'O' : 'X';
    const flips = [];
    for (const [dr, dc] of directions) {
      const line = [];
      let nr = r + dr, nc = c + dc;
      while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc] === enemy) {
        line.push([nr, nc]);
        nr += dr; nc += dc;
      }
      if (line.length > 0 && nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc] === player) {
        flips.push(...line);
      }
    }
    return flips;
  }

  function validMoves(player) {
    const moves = [];
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
      if (getFlips(r, c, player).length > 0) moves.push({r, c});
    }
    return moves;
  }

  function printBoard() {
    const countX = board.flat().filter(p => p === 'X').length;
    const countO = board.flat().filter(p => p === 'O').length;
    console.log(`\n${colors.red}X: ${countX}${colors.reset}  |  ${colors.blue}O: ${countO}${colors.reset}`);
    console.log(`   1 2 3 4 5 6 7 8`);
    console.log('  ─────────────────');
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

  while (true) {
    clearScreen();
    console.log(`${colors.bold}${colors.cyan}Reversi${colors.reset}`);
    printBoard();
    
    const moves = validMoves(current);
    if (moves.length === 0) {
      const otherMoves = validMoves(current === 'X' ? 'O' : 'X');
      if (otherMoves.length === 0) break; // Spiel vorbei
      console.log(`${colors.yellow}${current} hat keine Züge!${colors.reset}`);
      current = current === 'X' ? 'O' : 'X';
      await ask('Enter...');
      continue;
    }

    if (current === 'X') {
      console.log(`\n${colors.red}Du (X)${colors.reset} bist dran. Gültige Züge:`);
      console.log(moves.map(m => `${m.r + 1},${m.c + 1}`).join(' | '));
      const input = await ask('Zug (Zeile,Spalte): ');
      const parts = input.split(/[,\s]+/).map(Number);
      if (parts.length !== 2) { continue; }
      const [r, c] = [parts[0] - 1, parts[1] - 1];
      const flips = getFlips(r, c, 'X');
      if (flips.length === 0) continue;
      board[r][c] = 'X';
      for (const [fr, fc] of flips) board[fr][fc] = 'X';
      current = 'O';
    } else {
      console.log(`\n${colors.blue}Computer (O)${colors.reset} ist dran...`);
      await new Promise(r => setTimeout(r, 600));
      const move = moves[Math.floor(Math.random() * moves.length)];
      const flips = getFlips(move.r, move.c, 'O');
      board[move.r][move.c] = 'O';
      for (const [fr, fc] of flips) board[fr][fc] = 'O';
      current = 'X';
    }
  }

  clearScreen();
  printBoard();
  const countX = board.flat().filter(p => p === 'X').length;
  const countO = board.flat().filter(p => p === 'O').length;
  console.log(`\n${colors.bold}Endergebnis:${colors.reset} X: ${countX} | O: ${countO}`);
  if (countX > countO) console.log(`${colors.green}🎉 Du gewinnst!${colors.reset}`);
  else if (countO > countX) console.log(`${colors.red}💻 Computer gewinnt!${colors.reset}`);
  else console.log(`${colors.yellow}🤝 Unentschieden!${colors.reset}`);

  await ask('\nEnter für Menü...');
}