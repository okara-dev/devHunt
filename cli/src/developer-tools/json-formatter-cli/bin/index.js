#!/usr/bin/env node

import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { JsonFormatter } from '../lib/formatter.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m'
};

let formatter = new JsonFormatter();

// Verrückte JSON Beispiele zum Testen
const MESSY_JSON_EXAMPLES = {
  'messy1': `{"name":"John","age":30,"city":"New York","hobbies":["reading","gaming","coding"],"address":{"street":"123 Main St","zip":10001,"country":"USA"},"isActive":true,"score":null,"tags":["user","premium"]}`,
  
  'messy2': `{ "users": [ { "id": 1, "name": "Alice", "email": "alice@email.com", "profile": { "bio": "Developer", "location": "NYC" } }, { "id": 2, "name": "Bob", "email": "bob@email.com", "profile": { "bio": "Designer", "location": "LA" } } ], "total": 2 }`,
  
  'messy3': `{"project":"MyApp","version":"1.0.0","dependencies":{"express":"^4.18.0","react":"^18.0.0","typescript":"^4.9.0"},"scripts":{"start":"node index.js","build":"tsc","test":"jest"},"devDependencies":{"@types/node":"^18.0.0","jest":"^29.0.0"},"author":{"name":"John Doe","email":"john@example.com"}}`,
  
  'messy4': `[{"id":1,"product":"Laptop","price":999.99,"inStock":true,"specs":{"cpu":"Intel i7","ram":"16GB","storage":"512GB SSD"}},{"id":2,"product":"Mouse","price":29.99,"inStock":false,"specs":{"type":"Wireless","color":"Black"}},{"id":3,"product":"Keyboard","price":79.99,"inStock":true,"specs":{"type":"Mechanical","layout":"QWERTY"}}]`,
  
  'messy5': `{"employees":{"emp1":{"name":"Sarah","age":28,"position":"Manager","salary":75000,"skills":["Leadership","Planning"]},"emp2":{"name":"Mike","age":34,"position":"Developer","salary":65000,"skills":["JavaScript","Python","Java"]}},"department":"Engineering","active":true,"metadata":{"created":"2024-01-15","updated":"2024-03-20"}}`
};

function showBanner() {
  console.log(`
${colors.bold}${colors.magenta}╔═══════════════════════════════════════════════════════════════════╗
║              🔧 JSON Formatter - Tame the Chaos!                    ║
║       Take messy JSON and make it beautiful and structured          ║
╚═══════════════════════════════════════════════════════════════════╝${colors.reset}
`);
}

function showHelp() {
  console.log(`
${colors.bold}Commands:${colors.reset}
  ${colors.green}format${colors.reset} [text|file|example]  - Format JSON from text, file, or use example
  ${colors.green}examples${colors.reset}                   - Show available messy JSON examples
  ${colors.green}minify${colors.reset} [text|file]        - Minify JSON (remove whitespace)
  ${colors.green}validate${colors.reset} [text|file]      - Validate JSON syntax
  ${colors.green}save${colors.reset} <filename>           - Save last formatted JSON to file
  ${colors.green}copy${colors.reset}                      - Copy last formatted JSON to clipboard
  ${colors.green}tree${colors.reset}                      - Show JSON as a tree structure
  ${colors.green}stats${colors.reset}                     - Show statistics about the JSON
  ${colors.green}diff${colors.reset}                      - Show differences between original and formatted
  ${colors.green}help${colors.reset}                      - Show this help
  ${colors.green}exit${colors.reset}                      - Exit

${colors.dim}Examples:${colors.reset}
  json-formatter format '{"name":"John","age":30}'
  json-formatter format file ./data.json
  json-formatter format example messy1
  json-formatter validate '{"invalid": json}'
  json-formatter minify ./data.json
  json-formatter tree
  json-formatter save ./clean-data.json
`);
}

function showExamples() {
  console.log(`\n${colors.bold}📚 Available Messy JSON Examples:${colors.reset}`);
  console.log('='.repeat(50));
  
  Object.entries(MESSY_JSON_EXAMPLES).forEach(([name, json]) => {
    console.log(`\n${colors.cyan}${name}${colors.reset}:`);
    console.log(`${colors.dim}${json.substring(0, 100)}${json.length > 100 ? '...' : ''}${colors.reset}`);
    console.log(`${colors.dim}Length: ${json.length} characters${colors.reset}`);
  });
  
  console.log(`\n${colors.yellow}💡 Use 'format example <name>' to format one of these!${colors.reset}`);
}

function displayFormattedJSON(formatted) {
  console.log(`\n${colors.bold}${colors.green}✅ Formatted JSON:${colors.reset}`);
  console.log('='.repeat(50));
  console.log(formatted);
  console.log('='.repeat(50));
}

function displayValidation(result) {
  if (result.valid) {
    console.log(`\n${colors.bold}${colors.green}✅ Valid JSON!${colors.reset}`);
    console.log(`  ${colors.dim}Type: ${result.type}${colors.reset}`);
    console.log(`  ${colors.dim}Keys: ${result.keys}${colors.reset}`);
    console.log(`  ${colors.dim}Depth: ${result.depth}${colors.reset}`);
    console.log(`  ${colors.dim}Size: ${result.size} characters${colors.reset}`);
  } else {
    console.log(`\n${colors.bold}${colors.red}❌ Invalid JSON!${colors.reset}`);
    console.log(`  ${colors.red}Error: ${result.error}${colors.reset}`);
    console.log(`  ${colors.yellow}Position: line ${result.line}, column ${result.column}${colors.reset}`);
  }
}

function displayStats(stats) {
  console.log(`\n${colors.bold}📊 JSON Statistics:${colors.reset}`);
  console.log('='.repeat(50));
  console.log(`  ${colors.blue}Type:${colors.reset} ${stats.type}`);
  console.log(`  ${colors.blue}Keys (root):${colors.reset} ${stats.rootKeys}`);
  console.log(`  ${colors.blue}Total keys:${colors.reset} ${stats.totalKeys}`);
  console.log(`  ${colors.blue}Max depth:${colors.reset} ${stats.maxDepth}`);
  console.log(`  ${colors.blue}Size:${colors.reset} ${stats.size} characters`);
  console.log(`  ${colors.blue}Lines:${colors.reset} ${stats.lines}`);
  console.log(`  ${colors.blue}Values:${colors.reset} ${stats.values}`);
  
  if (stats.strings > 0) {
    console.log(`    ${colors.dim}Strings: ${stats.strings}${colors.reset}`);
  }
  if (stats.numbers > 0) {
    console.log(`    ${colors.dim}Numbers: ${stats.numbers}${colors.reset}`);
  }
  if (stats.booleans > 0) {
    console.log(`    ${colors.dim}Booleans: ${stats.booleans}${colors.reset}`);
  }
  if (stats.nulls > 0) {
    console.log(`    ${colors.dim}Nulls: ${stats.nulls}${colors.reset}`);
  }
  if (stats.arrays > 0) {
    console.log(`    ${colors.dim}Arrays: ${stats.arrays}${colors.reset}`);
  }
  if (stats.objects > 0) {
    console.log(`    ${colors.dim}Objects: ${stats.objects}${colors.reset}`);
  }
}

function displayTree(tree) {
  console.log(`\n${colors.bold}🌳 JSON Tree View:${colors.reset}`);
  console.log('='.repeat(50));
  console.log(tree);
}

let lastFormattedJSON = null;
let lastOriginalJSON = null;

async function handleFormat(args) {
  try {
    const type = args[0] || 'text';
    const input = args.slice(1).join(' ');
    
    let jsonString = '';
    let source = '';
    
    if (type === 'example') {
      // Use example
      const exampleName = input || 'messy1';
      if (!MESSY_JSON_EXAMPLES[exampleName]) {
        console.log(`${colors.red}❌ Example '${exampleName}' not found.${colors.reset}`);
        console.log(`${colors.yellow}💡 Use 'examples' to see available examples.${colors.reset}`);
        return;
      }
      jsonString = MESSY_JSON_EXAMPLES[exampleName];
      source = `example: ${exampleName}`;
      console.log(`\n${colors.cyan}📖 Using example: ${exampleName}${colors.reset}`);
    } else if (type === 'file') {
      // Read from file
      const filePath = input;
      if (!filePath) {
        console.log(`${colors.red}❌ Please specify a file path.${colors.reset}`);
        return;
      }
      
      if (!fs.existsSync(filePath)) {
        console.log(`${colors.red}❌ File not found: ${filePath}${colors.reset}`);
        return;
      }
      
      jsonString = fs.readFileSync(filePath, 'utf8');
      source = `file: ${filePath}`;
      console.log(`\n${colors.cyan}📁 Reading from file: ${filePath}${colors.reset}`);
    } else {
      // Direct text input
      jsonString = type + (args.length > 1 ? ' ' + args.slice(1).join(' ') : '');
      source = 'text input';
      console.log(`\n${colors.cyan}📝 Processing text input${colors.reset}`);
    }
    
    if (!jsonString || jsonString.trim() === '') {
      console.log(`${colors.red}❌ No JSON data provided.${colors.reset}`);
      return;
    }
    
    // Show original messy JSON
    console.log(`\n${colors.bold}${colors.yellow}🔀 Original (Messy) JSON:${colors.reset}`);
    console.log('='.repeat(50));
    console.log(`${colors.dim}${jsonString.substring(0, 200)}${jsonString.length > 200 ? '...' : ''}${colors.reset}`);
    if (jsonString.length > 200) {
      console.log(`${colors.dim}(${jsonString.length - 200} more characters...)${colors.reset}`);
    }
    console.log('='.repeat(50));
    
    // Format the JSON
    console.log(`\n${colors.dim}⏳ Formatting JSON...${colors.reset}`);
    
    const result = formatter.format(jsonString);
    
    if (result.success) {
      lastFormattedJSON = result.formatted;
      lastOriginalJSON = jsonString;
      
      // Display formatted JSON with syntax highlighting
      console.log(`\n${colors.bold}${colors.green}✅ Formatted JSON (${source}):${colors.reset}`);
      console.log('='.repeat(50));
      
      // Show with line numbers
      const lines = result.formatted.split('\n');
      const lineNumbers = String(lines.length).length;
      lines.forEach((line, index) => {
        const num = String(index + 1).padStart(lineNumbers, ' ');
        console.log(`${colors.dim}${num}${colors.reset} ${line}`);
      });
      console.log('='.repeat(50));
      
      // Show stats
      const stats = formatter.getStats(result.parsed || result.formatted);
      console.log(`\n${colors.bold}📊 Result:${colors.reset}`);
      console.log(`  ${colors.dim}Lines:${colors.reset} ${lines.length}`);
      console.log(`  ${colors.dim}Characters:${colors.reset} ${result.formatted.length}`);
      console.log(`  ${colors.dim}Reduction:${colors.reset} ${Math.round((1 - result.formatted.length / jsonString.length) * 100)}%`);
      
      // Ask if user wants to save
      console.log(`\n${colors.yellow}💡 Want to save this? Use 'save <filename>'${colors.reset}`);
      
    } else {
      console.log(`\n${colors.bold}${colors.red}❌ Failed to format JSON:${colors.reset}`);
      console.log(`  ${colors.red}${result.error}${colors.reset}`);
      
      // Try to find where the error is
      if (result.error.includes('position')) {
        const pos = parseInt(result.error.match(/position (\d+)/)?.[1] || '0');
        if (pos > 0) {
          const start = Math.max(0, pos - 20);
          const end = Math.min(jsonString.length, pos + 20);
          console.log(`\n${colors.yellow}Context:${colors.reset}`);
          console.log(`${colors.dim}${jsonString.substring(start, end)}${colors.reset}`);
          console.log(`${colors.red}${' '.repeat(pos - start)}^${colors.reset}`);
        }
      }
    }
    
  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
  }
}

async function handleMinify(args) {
  try {
    const type = args[0] || 'text';
    const input = args.slice(1).join(' ');
    
    let jsonString = '';
    
    if (type === 'file') {
      const filePath = input;
      if (!fs.existsSync(filePath)) {
        console.log(`${colors.red}❌ File not found: ${filePath}${colors.reset}`);
        return;
      }
      jsonString = fs.readFileSync(filePath, 'utf8');
    } else {
      jsonString = type + (args.length > 1 ? ' ' + args.slice(1).join(' ') : '');
    }
    
    const result = formatter.minify(jsonString);
    
    if (result.success) {
      console.log(`\n${colors.bold}${colors.green}✅ Minified JSON:${colors.reset}`);
      console.log('='.repeat(50));
      console.log(result.minified);
      console.log('='.repeat(50));
      console.log(`\n${colors.dim}Reduction: ${Math.round((1 - result.minified.length / result.originalLength) * 100)}%${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ ${result.error}${colors.reset}`);
    }
    
  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
  }
}

async function handleValidate(args) {
  try {
    const type = args[0] || 'text';
    const input = args.slice(1).join(' ');
    
    let jsonString = '';
    
    if (type === 'file') {
      const filePath = input;
      if (!fs.existsSync(filePath)) {
        console.log(`${colors.red}❌ File not found: ${filePath}${colors.reset}`);
        return;
      }
      jsonString = fs.readFileSync(filePath, 'utf8');
    } else {
      jsonString = type + (args.length > 1 ? ' ' + args.slice(1).join(' ') : '');
    }
    
    const result = formatter.validate(jsonString);
    displayValidation(result);
    
  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
  }
}

async function handleSave(args) {
  if (!lastFormattedJSON) {
    console.log(`${colors.red}❌ No formatted JSON to save. Format something first!${colors.reset}`);
    return;
  }
  
  const filename = args[0] || 'formatted.json';
  const filePath = path.resolve(filename);
  
  try {
    fs.writeFileSync(filePath, lastFormattedJSON, 'utf8');
    console.log(`${colors.green}✅ Saved to: ${filePath}${colors.reset}`);
    console.log(`${colors.dim}Size: ${(fs.statSync(filePath).size / 1024).toFixed(2)} KB${colors.reset}`);
  } catch (error) {
    console.log(`${colors.red}❌ Failed to save: ${error.message}${colors.reset}`);
  }
}

async function handleCopy() {
  if (!lastFormattedJSON) {
    console.log(`${colors.red}❌ No formatted JSON to copy. Format something first!${colors.reset}`);
    return;
  }
  
  try {
    // Try to use clipboard API (works in some environments)
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    // Different clipboard commands for different platforms
    const platform = process.platform;
    let command;
    if (platform === 'win32') {
      command = `echo ${lastFormattedJSON.replace(/"/g, '\\"')} | clip`;
    } else if (platform === 'darwin') {
      command = `echo '${lastFormattedJSON.replace(/'/g, "'\\''")}' | pbcopy`;
    } else {
      command = `echo '${lastFormattedJSON.replace(/'/g, "'\\''")}' | xclip -selection clipboard`;
    }
    
    await execAsync(command);
    console.log(`${colors.green}✅ Copied to clipboard!${colors.reset}`);
  } catch (error) {
    console.log(`${colors.yellow}⚠️ Could not copy to clipboard. Please copy manually.${colors.reset}`);
    console.log(lastFormattedJSON);
  }
}

async function handleTree() {
  if (!lastFormattedJSON) {
    console.log(`${colors.red}❌ No JSON to display. Format something first!${colors.reset}`);
    return;
  }
  
  try {
    const tree = formatter.toTree(lastFormattedJSON);
    displayTree(tree);
  } catch (error) {
    console.log(`${colors.red}❌ Failed to generate tree: ${error.message}${colors.reset}`);
  }
}

async function handleStats() {
  if (!lastFormattedJSON) {
    console.log(`${colors.red}❌ No JSON to analyze. Format something first!${colors.reset}`);
    return;
  }
  
  try {
    const stats = formatter.getStats(lastFormattedJSON);
    displayStats(stats);
  } catch (error) {
    console.log(`${colors.red}❌ Failed to analyze: ${error.message}${colors.reset}`);
  }
}

async function handleDiff() {
  if (!lastFormattedJSON || !lastOriginalJSON) {
    console.log(`${colors.red}❌ No JSON to compare. Format something first!${colors.reset}`);
    return;
  }
  
  console.log(`\n${colors.bold}📊 Differences:${colors.reset}`);
  console.log('='.repeat(50));
  console.log(`${colors.yellow}Original length:${colors.reset} ${lastOriginalJSON.length} characters`);
  console.log(`${colors.green}Formatted length:${colors.reset} ${lastFormattedJSON.length} characters`);
  console.log(`${colors.blue}Difference:${colors.reset} ${lastFormattedJSON.length - lastOriginalJSON.length} characters`);
  console.log(`${colors.dim}Reduction: ${Math.round((1 - lastFormattedJSON.length / lastOriginalJSON.length) * 100)}%${colors.reset}`);
  
  // Show sample of changes
  const originalLines = lastOriginalJSON.split('\n');
  const formattedLines = lastFormattedJSON.split('\n');
  
  if (originalLines.length !== formattedLines.length) {
    console.log(`\n${colors.blue}Structure changes:${colors.reset}`);
    console.log(`  Original: ${originalLines.length} lines`);
    console.log(`  Formatted: ${formattedLines.length} lines`);
  }
}

async function main() {
  showBanner();
  showHelp();

  console.log(`\n${colors.bold}${colors.cyan}💡 Quick Start:${colors.reset}`);
  console.log(`  ${colors.dim}1. Try an example: format example messy1${colors.reset}`);
  console.log(`  ${colors.dim}2. Format your own: format '{"key":"value"}'${colors.reset}`);
  console.log(`  ${colors.dim}3. Format a file: format file ./data.json${colors.reset}`);
  console.log(`  ${colors.dim}4. See all examples: examples${colors.reset}`);

  console.log('\n' + '─'.repeat(50));

  rl.on('line', async (input) => {
    const parts = input.trim().split(/\s+/);
    const cmd = parts[0]?.toLowerCase();
    const args = parts.slice(1);

    try {
      switch (cmd) {
        case 'format':
        case 'f': {
          await handleFormat(args);
          break;
        }

        case 'examples':
        case 'e': {
          showExamples();
          break;
        }

        case 'minify':
        case 'm': {
          await handleMinify(args);
          break;
        }

        case 'validate':
        case 'v': {
          await handleValidate(args);
          break;
        }

        case 'save':
        case 's': {
          await handleSave(args);
          break;
        }

        case 'copy':
        case 'c': {
          await handleCopy();
          break;
        }

        case 'tree':
        case 't': {
          await handleTree();
          break;
        }

        case 'stats':
        case 'st': {
          await handleStats();
          break;
        }

        case 'diff':
        case 'd': {
          await handleDiff();
          break;
        }

        case 'help':
        case 'h': {
          showHelp();
          break;
        }

        case 'exit':
        case 'quit':
        case 'q': {
          console.log(`\n${colors.bold}👋 Goodbye!${colors.reset}`);
          process.exit(0);
          break;
        }

        default: {
          if (cmd) {
            console.log(`${colors.red}❌ Unknown command: ${cmd}${colors.reset}`);
            console.log(`${colors.yellow}💡 Type 'help' for available commands${colors.reset}`);
          }
        }
      }
    } catch (error) {
      console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    }
  });

  process.stdout.write(`\n${colors.cyan}json-formatter${colors.reset}> `);
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.log(`${colors.red}❌ Unexpected error: ${error.message}${colors.reset}`);
  console.log(`${colors.dim}${error.stack}${colors.reset}`);
});

main();