import { ask, colors, clearScreen } from '../utils.js';

export async function playGalgenmaennchen() {
  clearScreen();
  const words = [
    'PROGRAMMIEREN', 'COMPUTER', 'TERMINAL', 'KASSE', 'MÜNZE',
    'SCHACH', 'SUDOKU', 'MASTERMIND', 'ALGORITHMUS', 'VARIABLE',
    'FUNKTION', 'KLASSE', 'INTERFACE', 'DATENBANK', 'NETZWERK'
  ];
  const word = words[Math.floor(Math.random() * words.length)];
  const guessed = new Set();
  let wrongGuesses = 0;
  const maxWrong = 6;

  const hangmanStages = [
    `
      ┌───┐
      │   
      │   
      │   
      │   
    ══╧═══`,
    `
      ┌───┐
      │   O
      │   
      │   
      │   
    ══╧═══`,
    `
      ┌───┐
      │   O
      │   │
      │   
      │   
    ══╧═══`,
    `
      ┌───┐
      │   O
      │  ╱│
      │   
      │   
    ══╧═══`,
    `
      ┌───┐
      │   O
      │  ╱│╲
      │   
      │   
    ══╧═══`,
    `
      ┌───┐
      │   O
      │  ╱│╲
      │  ╱ 
      │   
    ══╧═══`,
    `
      ┌───┐
      │   O
      │  ╱│╲
      │  ╱ ╲
      │   
    ══╧═══`
  ];

  while (wrongGuesses < maxWrong) {
    clearScreen();
    console.log(`${colors.bold}${colors.cyan}Galgenmännchen${colors.reset}`);
    console.log(hangmanStages[wrongGuesses]);

    const display = word.split('').map(l => guessed.has(l) ? colors.green + l + colors.reset : '_').join(' ');
    console.log(`\n${display}\n`);
    console.log(`Falsche Versuche: ${colors.red}${wrongGuesses}/${maxWrong}${colors.reset}`);
    console.log(`Geraten: ${[...guessed].join(', ') || '-'}\n`);

    if (word.split('').every(l => guessed.has(l))) {
      console.log(`${colors.green}🎉 GEWONNEN! Das Wort war: ${word}${colors.reset}`);
      break;
    }

    const input = await ask('Buchstabe: ');
    const letter = input.toUpperCase().trim();
    if (letter.length !== 1 || !/[A-ZÄÖÜ]/.test(letter)) {
      console.log(`${colors.red}Ungültige Eingabe!${colors.reset}`);
      await ask('Enter...');
      continue;
    }
    if (guessed.has(letter)) {
      console.log(`${colors.yellow}Schon geraten!${colors.reset}`);
      await ask('Enter...');
      continue;
    }
    guessed.add(letter);
    if (!word.includes(letter)) wrongGuesses++;
  }

  if (wrongGuesses >= maxWrong) {
    console.log(`\n${colors.red}💀 VERLOREN! Das Wort war: ${word}${colors.reset}`);
  }
  await ask('\nEnter für Menü...');
}