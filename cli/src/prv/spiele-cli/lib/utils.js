import readline from 'readline';

export const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

export function ask(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => resolve(answer.trim()));
  });
}

export const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgBlue: '\x1b[44m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

export function clearScreen() {
  process.stdout.write('\x1b[2J\x1b[0f');
}

export function showTitle(title) {
  console.log(`\n${colors.bold}${colors.cyan}=== ${title} ===${colors.reset}\n`);
}