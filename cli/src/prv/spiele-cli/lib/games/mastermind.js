import { ask, colors, clearScreen } from '../utils.js';

export async function playMastermind() {
  clearScreen();
  const COLORS = ['R', 'G', 'B', 'Y', 'W', 'O']; // Rot, Grün, Blau, Gelb, Weiß, Orange
  const colorNames = { R: 'Rot', G: 'Grün', B: 'Blau', Y: 'Gelb', W: 'Weiß', O: 'Orange' };
  const colorMap = {
    R: colors.red, G: colors.green, B: colors.blue,
    Y: colors.yellow, W: colors.white, O: '\x1b[38;5;208m'
  };

  const secret = [];
  for (let i = 0; i < 4; i++) {
    secret.push(COLORS[Math.floor(Math.random() * COLORS.length)]);
  }

  const maxAttempts = 10;
  let attempts = 0;

  console.log(`${colors.bold}${colors.cyan}Mastermind${colors.reset}`);
  console.log(`Errate 4 Farben aus: R (Rot), G (Grün), B (Blau), Y (Gelb), W (Weiß), O (Orange)`);
  console.log(`Du hast ${maxAttempts} Versuche.\n`);

  while (attempts < maxAttempts) {
    console.log(`${colors.dim}Versuch ${attempts + 1}/${maxAttempts}${colors.reset}`);
    const input = await ask('Dein Tipp (z.B. RGBY): ');
    const guess = input.toUpperCase().split('').filter(c => COLORS.includes(c));
    
    if (guess.length !== 4) {
      console.log(`${colors.red}❌ Bitte genau 4 Farben eingeben!${colors.reset}\n`);
      continue;
    }

    // Auswertung
    const secretCopy = [...secret];
    const guessCopy = [...guess];
    let black = 0; // Richtige Farbe, richtige Position
    let white = 0; // Richtige Farbe, falsche Position

    for (let i = 0; i < 4; i++) {
      if (guessCopy[i] === secretCopy[i]) {
        black++;
        secretCopy[i] = null;
        guessCopy[i] = null;
      }
    }

    for (let i = 0; i < 4; i++) {
      if (guessCopy[i] !== null) {
        const idx = secretCopy.indexOf(guessCopy[i]);
        if (idx !== -1) {
          white++;
          secretCopy[idx] = null;
        }
      }
    }

    const guessDisplay = guess.map(c => `${colorMap[c]}${c}${colors.reset}`).join(' ');
    console.log(`  Tipp: ${guessDisplay}`);
    console.log(`  ${colors.green}●${colors.reset} ${black} richtig (Position + Farbe)`);
    console.log(`  ${colors.yellow}○${colors.reset} ${white} richtig (nur Farbe)\n`);

    if (black === 4) {
      console.log(`${colors.green}🎉 Gewonnen! Du hast den Code geknackt!${colors.reset}`);
      break;
    }

    attempts++;
  }

  if (attempts >= maxAttempts) {
    const secretDisplay = secret.map(c => `${colorMap[c]}${c}${colors.reset}`).join(' ');
    console.log(`${colors.red}💀 Verloren! Der Code war: ${secretDisplay}${colors.reset}`);
  }

  await ask('\nEnter für Menü...');
}