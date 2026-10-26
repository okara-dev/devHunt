import { ask, colors, clearScreen } from '../utils.js';

export async function playSudoku() {
  clearScreen();
  // Einfaches 9x9 Sudoku
  const puzzles = [
    [
      [5,3,0,0,7,0,0,0,0],
      [6,0,0,1,9,5,0,0,0],
      [0,9,8,0,0,0,0,6,0],
      [8,0,0,0,6,0,0,0,3],
      [4,0,0,8,0,3,0,0,1],
      [7,0,0,0,2,0,0,0,6],
      [0,6,0,0,0,0,2,8,0],
      [0,0,0,4,1,9,0,0,5],
      [0,0,0,0,8,0,0,7,9]
    ],
    [
      [0,0,0,2,6,0,7,0,1],
      [6,8,0,0,7,0,0,9,0],
      [1,9,0,0,0,4,5,0,0],
      [8,2,0,1,0,0,0,4,0],
      [0,0,4,6,0,2,9,0,0],
      [0,5,0,0,0,3,0,2,8],
      [0,0,9,3,0,0,0,7,4],
      [0,4,0,0,5,0,0,3,6],
      [7,0,3,0,1,8,0,0,0]
    ]
  ];

  const solution = [
    [5,3,4,6,7,8,9,1,2],
    [6,7,2,1,9,5,3,4,8],
    [1,9,8,3,4,2,5,6,7],
    [8,5,9,7,6,1,4,2,3],
    [4,2,6,8,5,3,7,9,1],
    [7,1,3,9,2,4,8,5,6],
    [9,6,1,5,3,7,2,8,4],
    [2,8,7,4,1,9,6,3,5],
    [3,4,5,2,8,6,1,7,9]
  ];

  const puzzle = puzzles[Math.floor(Math.random() * puzzles.length)];
  const board = puzzle.map(row => [...row]);

  function printBoard() {
    console.log(`\n   ${colors.dim}1 2 3   4 5 6   7 8 9${colors.reset}`);
    console.log(`  ${colors.dim}─────────────────────${colors.reset}`);
    for (let r = 0; r < 9; r++) {
      let line = `${colors.dim}${r + 1}${colors.reset} │ `;
      for (let c = 0; c < 9; c++) {
        const val = board[r][c];
        const isOriginal = puzzle[r][c] !== 0;
        if (val === 0) line += `${colors.dim}·${colors.reset} `;
        else if (isOriginal) line += `${colors.bold}${colors.cyan}${val}${colors.reset} `;
        else line += `${colors.green}${val}${colors.reset} `;
        if ((c + 1) % 3 === 0 && c < 8) line += `${colors.dim}│${colors.reset} `;
      }
      console.log(line);
      if ((r + 1) % 3 === 0 && r < 8) console.log(`  ${colors.dim}──────┼───────┼──────${colors.reset}`);
    }
  }

  function isValid(row, col, num) {
    for (let i = 0; i < 9; i++) {
      if (board[row][i] === num && i !== col) return false;
      if (board[i][col] === num && i !== row) return false;
    }
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        if (board[r][c] === num && (r !== row || c !== col)) return false;
      }
    }
    return true;
  }

  function isComplete() {
    return board.every(row => row.every(v => v !== 0));
  }

  while (!isComplete()) {
    clearScreen();
    console.log(`${colors.bold}${colors.cyan}Sudoku${colors.reset}`);
    console.log(`${colors.dim}Eingabe: Zeile Spalte Zahl (z.B. 1 3 4) | 'hint' für Tipp | 'exit' zum Aufgeben${colors.reset}`);
    printBoard();

    const input = await ask('\nEingabe: ');
    if (input.toLowerCase() === 'exit') break;
    if (input.toLowerCase() === 'hint') {
      // Zufälliges leeres Feld füllen
      const empty = [];
      for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (board[r][c] === 0) empty.push({r, c});
      if (empty.length > 0) {
        const {r, c} = empty[Math.floor(Math.random() * empty.length)];
        board[r][c] = solution[r][c];
      }
      continue;
    }

    const parts = input.split(/\s+/).map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) {
      console.log(`${colors.red}Ungültige Eingabe!${colors.reset}`);
      await ask('Enter...');
      continue;
    }

    const [row, col, num] = [parts[0] - 1, parts[1] - 1, parts[2]];
    if (row < 0 || row > 8 || col < 0 || col > 8 || num < 1 || num > 9) {
      console.log(`${colors.red}Ungültige Werte!${colors.reset}`);
      await ask('Enter...');
      continue;
    }
    if (puzzle[row][col] !== 0) {
      console.log(`${colors.red}Feld ist bereits vorbelegt!${colors.reset}`);
      await ask('Enter...');
      continue;
    }
    if (!isValid(row, col, num)) {
      console.log(`${colors.red}Diese Zahl ist ungültig!${colors.reset}`);
      await ask('Enter...');
      continue;
    }
    board[row][col] = num;
  }

  if (isComplete()) {
    clearScreen();
    printBoard();
    console.log(`\n${colors.green}🎉 Glückwunsch! Sudoku gelöst!${colors.reset}`);
  }
  await ask('\nEnter für Menü...');
}