import { ask, colors, clearScreen } from '../utils.js';

export async function playNim() {
  clearScreen();
  let pile = 21;
  let player = 1;

  console.log(`${colors.bold}${colors.cyan}Nim${colors.reset}`);
  console.log(`Es gibt ${pile} Streichhölzer.`);
  console.log(`Du und der Computer nehmen abwechselnd 1-3 Hölzer.`);
  console.log(`Wer das letzte Holz nimmt, verliert!\n`);

  while (pile > 0) {
    clearScreen();
    console.log(`${colors.bold}${colors.cyan}Nim${colors.reset}`);
    console.log(`Es sind noch ${colors.yellow}${pile}${colors.reset} Hölzer übrig.\n`);
    console.log(' '.repeat(pile > 30 ? 0 : 5) + '🪵 '.repeat(Math.min(pile, 30)) + (pile > 30 ? '...' : ''));
    console.log('');

    if (player === 1) {
      const input = await ask('Wie viele Hölzer nimmst du (1-3)? ');
      const take = parseInt(input);
      if (isNaN(take) || take < 1 || take > 3 || take > pile) {
        console.log(`${colors.red}Ungültig!${colors.reset}`);
        await ask('Enter...');
        continue;
      }
      pile -= take;
      if (pile === 0) {
        console.log(`${colors.red}💀 Du hast das letzte Holz genommen – du verlierst!${colors.reset}`);
        break;
      }
      player = 2;
    } else {
      // Computer-KI: versucht, Vielfache von 4 zu erreichen
      let take;
      const remainder = pile % 4;
      if (remainder === 1) take = Math.min(3, pile - 1);
      else if (remainder === 0) take = 3;
      else take = remainder - 1;
      if (take < 1) take = 1;
      
      console.log(`${colors.blue}Computer nimmt ${take} Holz/Hölzer...${colors.reset}`);
      await new Promise(r => setTimeout(r, 800));
      pile -= take;
      if (pile === 0) {
        console.log(`${colors.green}🎉 Computer hat das letzte Holz genommen – du gewinnst!${colors.reset}`);
        break;
      }
      player = 1;
    }
  }
  await ask('\nEnter für Menü...');
}