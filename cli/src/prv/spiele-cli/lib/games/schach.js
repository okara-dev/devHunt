import { ask, colors, clearScreen } from '../utils.js';

export async function playSchach() {
  clearScreen();
  const files = ['a','b','c','d','e','f','g','h'];

  let board = [
    ['r','n','b','q','k','b','n','r'],
    ['p','p','p','p','p','p','p','p'],
    [' ',' ',' ',' ',' ',' ',' ',' '],
    [' ',' ',' ',' ',' ',' ',' ',' '],
    [' ',' ',' ',' ',' ',' ',' ',' '],
    [' ',' ',' ',' ',' ',' ',' ',' '],
    ['P','P','P','P','P','P','P','P'],
    ['R','N','B','Q','K','B','N','R']
  ];

  // 'w' = Weiß (Du), 'b' = Schwarz (Computer)
  let turn = 'w'; 
  let gameOver = false;
  let message = '';

  // Figurenwerte für die Bewertung
  const pieceValues = { p: 10, n: 30, b: 30, r: 50, q: 90, k: 1000 };

  function isWhite(p) { return p !== ' ' && p === p.toUpperCase(); }
  function isBlack(p) { return p !== ' ' && p === p.toLowerCase(); }

  function printBoard() {
    console.log(`\n    ${files.join('   ')}`);
    console.log('  ┌' + '───┬'.repeat(7) + '───┐');
    for (let r = 0; r < 8; r++) {
      let rowStr = `${8 - r} │`;
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        const isBlackField = (r + c) % 2 === 1;
        const bg = isBlackField ? '\x1b[48;5;240m' : '\x1b[48;5;250m';
        
        // Weiße Figuren hell, schwarze Figuren dunkel/rot (besser lesbar)
        let fg = colors.reset;
        if (isWhite(piece)) fg = '\x1b[97m'; // Helles Weiß
        if (isBlack(piece)) fg = '\x1b[91m'; // Helles Rot für Schwarz

        const display = piece === ' ' ? ' ' : piece;
        rowStr += `${bg}${fg} ${display} ${colors.reset}│`;
      }
      console.log(rowStr);
      if (r < 7) console.log('  ├' + '───┼'.repeat(7) + '───┤');
    }
    console.log('  └' + '───┴'.repeat(7) + '───┘');
  }

  function algebraicToPos(move) {
    if (move.length !== 2) return null;
    const col = files.indexOf(move[0].toLowerCase());
    const row = 8 - parseInt(move[1]);
    if (col === -1 || isNaN(row) || row < 0 || row > 7) return null;
    return { row, col };
  }

  function validateMove(from, to, isWhiteTurn, testBoard = board) {
    const piece = testBoard[from.row][from.col];
    if (piece === ' ') return false;
    
    const isPieceWhite = isWhite(piece);
    if (isWhiteTurn && !isPieceWhite) return false;
    if (!isWhiteTurn && isPieceWhite) return false;

    const target = testBoard[to.row][to.col];
    if (target !== ' ' && isPieceWhite === isWhite(target)) return false;

    const dr = to.row - from.row;
    const dc = to.col - from.col;
    const absDr = Math.abs(dr);
    const absDc = Math.abs(dc);
    const type = piece.toLowerCase();

    switch (type) {
      case 'p':
        const dir = isPieceWhite ? -1 : 1;
        const startRow = isPieceWhite ? 6 : 1;
        if (dc === 0 && dr === dir && target === ' ') return true;
        if (dc === 0 && dr === 2 * dir && from.row === startRow && target === ' ' && testBoard[from.row + dir][from.col] === ' ') return true;
        if (absDc === 1 && dr === dir && target !== ' ') return true;
        return false;
      case 'r':
        return dr === 0 || dc === 0;
      case 'n':
        return (absDr === 2 && absDc === 1) || (absDr === 1 && absDc === 2);
      case 'b':
        return absDr === absDc;
      case 'q':
        return absDr === absDc || dr === 0 || dc === 0;
      case 'k':
        return absDr <= 1 && absDc <= 1;
    }
    return false;
  }

  // ==========================================
  // KI LOGIK (Minimax + Alpha-Beta)
  // ==========================================

  function evaluateBoard() {
    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p !== ' ') {
          const val = pieceValues[p.toLowerCase()];
          if (isWhite(p)) score += val;
          else score -= val;
        }
      }
    }
    return score; // Positiv = Weiß (Du) führt, Negativ = Schwarz (Computer) führt
  }

  function getAllMoves(isWhiteTurn) {
    const moves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece !== ' ' && ((isWhiteTurn && isWhite(piece)) || (!isWhiteTurn && isBlack(piece)))) {
          for (let tr = 0; tr < 8; tr++) {
            for (let tc = 0; tc < 8; tc++) {
              if (validateMove({ row: r, col: c }, { row: tr, col: tc }, isWhiteTurn)) {
                moves.push({ from: { row: r, col: c }, to: { row: tr, col: tc } });
              }
            }
          }
        }
      }
    }
    return moves;
  }

  function minimax(depth, alpha, beta, isMaximizing) {
    if (depth === 0) return evaluateBoard();

    if (isMaximizing) {
      let maxEval = -Infinity;
      const moves = getAllMoves(true);
      for (const move of moves) {
        const captured = board[move.to.row][move.to.col];
        board[move.to.row][move.to.col] = board[move.from.row][move.from.col];
        board[move.from.row][move.from.col] = ' ';

        const evalScore = minimax(depth - 1, alpha, beta, false);

        // Undo
        board[move.from.row][move.from.col] = board[move.to.row][move.to.col];
        board[move.to.row][move.to.col] = captured;

        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      const moves = getAllMoves(false);
      for (const move of moves) {
        const captured = board[move.to.row][move.to.col];
        board[move.to.row][move.to.col] = board[move.from.row][move.from.col];
        board[move.from.row][move.from.col] = ' ';

        const evalScore = minimax(depth - 1, alpha, beta, true);

        // Undo
        board[move.from.row][move.from.col] = board[move.to.row][move.to.col];
        board[move.to.row][move.to.col] = captured;

        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  function getBestComputerMove() {
    let bestMove = null;
    let bestValue = Infinity;
    const moves = getAllMoves(false);
    
    // Mische die Züge, damit der Computer nicht immer gleich spielt
    moves.sort(() => Math.random() - 0.5);

    for (const move of moves) {
      const captured = board[move.to.row][move.to.col];
      board[move.to.row][move.to.col] = board[move.from.row][move.from.col];
      board[move.from.row][move.from.col] = ' ';

      // Suchtiefe 2 (etwas schneller, aber immer noch clever)
      const moveValue = minimax(2, -Infinity, Infinity, true);

      // Undo
      board[move.from.row][move.from.col] = board[move.to.row][move.to.col];
      board[move.to.row][move.to.col] = captured;

      if (moveValue < bestValue) {
        bestValue = moveValue;
        bestMove = move;
      }
    }
    return bestMove;
  }

  // ==========================================
  // HAUPTSPIELSCHLEIFE
  // ==========================================

  while (!gameOver) {
    clearScreen();
    console.log(`${colors.bold}${colors.cyan}Schach gegen Computer${colors.reset}`);
    console.log(`Weiß (Du) zieht oben nach unten. Schwarz (Computer) zieht unten nach oben.`);
    
    if (turn === 'w') {
      console.log(`${colors.green}Du bist am Zug (Weiß).${colors.reset}`);
    } else {
      console.log(`${colors.red}Computer (Schwarz) ist am Zug...${colors.reset}`);
    }

    if (message) console.log(message);
    printBoard();

    if (turn === 'w') {
      // Spieler-Zug
      const fromStr = await ask('\nVon (z.B. e2) [oder "exit"]: ');
      if (fromStr.toLowerCase() === 'exit') break;
      
      const from = algebraicToPos(fromStr);
      if (!from) {
        message = `${colors.red}Ungültige Eingabe! (z.B. e2)${colors.reset}`;
        continue;
      }

      const toStr = await ask('Nach (z.B. e4): ');
      const to = algebraicToPos(toStr);
      if (!to) {
        message = `${colors.red}Ungültige Eingabe! (z.B. e4)${colors.reset}`;
        continue;
      }

      if (!validateMove(from, to, true)) {
        message = `${colors.red}Ungültiger Zug!${colors.reset}`;
        continue;
      }

      // Spieler-Zug ausführen
      board[to.row][to.col] = board[from.row][from.col];
      board[from.row][from.col] = ' ';

      // Prüfen ob König geschlagen (für sehr einfaches Spiel)
      if (board[to.row][to.col].toLowerCase() === 'k') {
        clearScreen();
        printBoard();
        console.log(`${colors.green}🎉 Du hast gewonnen! König gefangen!${colors.reset}`);
        gameOver = true;
        break;
      }

      turn = 'b'; // Jetzt ist der Computer dran
      message = '';

    } else {
      // Computer-Zug
      await new Promise(r => setTimeout(r, 800)); // Kurze Denkpause
      
      const move = getBestComputerMove();
      if (!move) {
        console.log(`\n${colors.yellow}Computer hat keine gültigen Züge mehr!${colors.reset}`);
        gameOver = true;
        break;
      }

      board[move.to.row][move.to.col] = board[move.from.row][move.from.col];
      board[move.from.row][move.from.col] = ' ';

      if (board[move.to.row][move.to.col].toLowerCase() === 'k') {
        clearScreen();
        printBoard();
        console.log(`${colors.red}💻 Computer hat gewonnen! König gefangen!${colors.reset}`);
        gameOver = true;
        break;
      }

      turn = 'w'; // Jetzt bist wieder du dran
    }
  }
  
  if (gameOver) {
    await ask('\nEnter für Menü...');
  }
}