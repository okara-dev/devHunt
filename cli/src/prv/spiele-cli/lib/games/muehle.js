import { ask, colors, clearScreen } from '../utils.js';

export async function playMuehle() {
  clearScreen();
  
  // 24 Felder, nummeriert 0-23
  // 0 -------- 1 -------- 2
  // |          |          |
  // |  3 ----- 4 ----- 5  |
  // |  |       |       |  |
  // |  |  6 -- 7 -- 8  |  |
  // |  |  |       |  |  |  |
  // 9--10-11     12-13--14
  // |  |  |       |  |  |  |
  // |  |  15-16--17-18 |  |
  // |  |       |       |  |
  // |  19 ---- 20 --- 21  |
  // |          |          |
  // 22-------- 23-------- 24 (vereinfacht)
  
  const board = Array(24).fill(' ');
  let currentPlayer = 'X';
  let phase = 'setzen'; // setzen, bewegen, springen
  let piecesToSet = { X: 9, O: 9 };
  let piecesOnBoard = { X: 0, O: 0 };
  let message = '';

  const neighbors = {
    0: [1, 3, 9], 1: [0, 2, 4], 2: [1, 5, 14],
    3: [0, 4, 10], 4: [1, 3, 5, 7], 5: [2, 4, 13],
    6: [3, 7, 11], 7: [4, 6, 8], 8: [5, 7, 12],
    9: [0, 10, 21], 10: [3, 9, 11, 18], 11: [6, 10, 15],
    12: [8, 13, 17], 13: [5, 12, 14, 20], 14: [2, 13, 23],
    15: [11, 16, 18], 16: [15, 17, 19], 17: [12, 16, 20],
    18: [10, 15, 17, 19], 19: [16, 18, 21], 20: [13, 17, 19, 23],
    21: [9, 19, 22], 22: [21, 23], 23: [14, 20, 22]
  };

  const mills = [
    [0,1,2],[3,4,5],[6,7,8],[9,10,11],[12,13,14],[15,16,17],[18,19,20],[21,22,23],
    [0,3,6],[1,4,7],[2,5,8],[9,12,15],[10,13,16],[11,14,17],[18,21,22],[19,22,23],
    [0,9,21],[3,10,18],[6,11,15],[1,4,7],[8,12,17],[5,13,20],[2,14,23]
  ];

  function checkMill(pos, player) {
    return mills.some(mill => mill.includes(pos) && mill.every(p => board[p] === player));
  }

  function printBoard() {
    function field(pos) {
      const val = board[pos];
      if (val === 'X') return `${colors.red}X${colors.reset}`;
      if (val === 'O') return `${colors.blue}O${colors.reset}`;
      return `${colors.dim}·${colors.reset}`;
    }
    console.log(`
 ${field(0)}───────${field(1)}───────${field(2)}
 │       │       │
 │  ${field(3)}────${field(4)}────${field(5)}  │
 │  │    │    │  │
 │  │ ${field(6)}──${field(7)}──${field(8)} │  │
 │  │  │       │  │  │
 ${field(9)}──${field(10)}─${field(11)}       ${field(12)}─${field(13)}──${field(14)}
 │  │  │       │  │  │
 │  │ ${field(15)}──${field(16)}─${field(17)} │  │
 │  │    │    │  │
 │  ${field(18)}────${field(19)}────${field(20)}  │
 │       │       │
 ${field(21)}───────${field(22)}───────${field(23)}
    `);
  }

  function countPieces(player) {
    return board.filter(p => p === player).length;
  }

  async function computerMove() {
    if (phase === 'setzen' && piecesToSet.O > 0) {
      // Freies Feld suchen
      const empty = board.map((v, i) => v === ' ' ? i : null).filter(v => v !== null);
      const pos = empty[Math.floor(Math.random() * empty.length)];
      board[pos] = 'O';
      piecesToSet.O--;
      if (checkMill(pos, 'O')) {
        // Gegnerischen Stein entfernen
        const enemyPieces = board.map((v, i) => v === 'X' ? i : null).filter(v => v !== null);
        if (enemyPieces.length > 0) {
          const target = enemyPieces[Math.floor(Math.random() * enemyPieces.length)];
          board[target] = ' ';
        }
      }
    } else {
      // Bewegen
      const myPieces = board.map((v, i) => v === 'O' ? i : null).filter(v => v !== null);
      const empty = board.map((v, i) => v === ' ' ? i : null).filter(v => v !== null);
      const possibleMoves = [];
      for (const pos of myPieces) {
        for (const n of neighbors[pos] || []) {
          if (board[n] === ' ') possibleMoves.push({ from: pos, to: n });
        }
      }
      if (possibleMoves.length > 0) {
        const move = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        board[move.to] = 'O';
        board[move.from] = ' ';
        if (checkMill(move.to, 'O')) {
          const enemyPieces = board.map((v, i) => v === 'X' ? i : null).filter(v => v !== null);
          if (enemyPieces.length > 0) {
            const target = enemyPieces[Math.floor(Math.random() * enemyPieces.length)];
            board[target] = ' ';
          }
        }
      }
    }
  }

  while (true) {
    clearScreen();
    console.log(`${colors.bold}${colors.cyan}Mühle${colors.reset}`);
    console.log(`${currentPlayer === 'X' ? colors.red + 'Du (X)' : colors.blue + 'Computer (O)'}${colors.reset} ist dran`);
    console.log(`Phase: ${phase} | X: ${countPieces('X')} Steine | O: ${countPieces('O')} Steine`);
    if (message) console.log(message);
    printBoard();

    // Gewinnprüfung
    if (countPieces('X') < 3 && phase !== 'setzen') {
      console.log(`${colors.red}💻 Computer gewinnt!${colors.reset}`);
      break;
    }
    if (countPieces('O') < 3 && phase !== 'setzen') {
      console.log(`${colors.green}🎉 Du gewinnst!${colors.reset}`);
      break;
    }

    if (currentPlayer === 'X') {
      if (phase === 'setzen' && piecesToSet.X > 0) {
        const input = await ask('Position (0-23): ');
        const pos = parseInt(input);
        if (isNaN(pos) || pos < 0 || pos > 23 || board[pos] !== ' ') {
          message = `${colors.red}Ungültig!${colors.reset}`;
          continue;
        }
        board[pos] = 'X';
        piecesToSet.X--;
        if (checkMill(pos, 'X')) {
          message = `${colors.green}Mühle! Wähle einen Gegner-Stein zum Entfernen.${colors.reset}`;
          printBoard();
          const removeInput = await ask('Gegner-Stein (0-23): ');
          const removePos = parseInt(removeInput);
          if (!isNaN(removePos) && board[removePos] === 'O') {
            board[removePos] = ' ';
          }
        }
      } else {
        // Bewegen
        const fromInput = await ask('Von Position (0-23): ');
        const fromPos = parseInt(fromInput);
        if (isNaN(fromPos) || board[fromPos] !== 'X') {
          message = `${colors.red}Ungültig!${colors.reset}`;
          continue;
        }
        const toInput = await ask('Nach Position (0-23): ');
        const toPos = parseInt(toInput);
        if (isNaN(toPos) || board[toPos] !== ' ' || !neighbors[fromPos]?.includes(toPos)) {
          message = `${colors.red}Ungültiger Zug!${colors.reset}`;
          continue;
        }
        board[toPos] = 'X';
        board[fromPos] = ' ';
        if (checkMill(toPos, 'X')) {
          message = `${colors.green}Mühle! Wähle einen Gegner-Stein zum Entfernen.${colors.reset}`;
          printBoard();
          const removeInput = await ask('Gegner-Stein (0-23): ');
          const removePos = parseInt(removeInput);
          if (!isNaN(removePos) && board[removePos] === 'O') {
            board[removePos] = ' ';
          }
        }
      }
      if (piecesToSet.X === 0 && piecesToSet.O === 0) phase = 'bewegen';
      currentPlayer = 'O';
      message = '';
    } else {
      await new Promise(r => setTimeout(r, 600));
      await computerMove();
      if (piecesToSet.O === 0 && piecesToSet.X === 0) phase = 'bewegen';
      currentPlayer = 'X';
    }
  }
  await ask('\nEnter für Menü...');
}