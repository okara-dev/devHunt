#!/usr/bin/env node

import readline from 'readline';
import path from 'path';
import fs from 'fs';
import { Organizer } from '../lib/organizer.js';

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

let organizer = null;

function showBanner() {
  console.log(`
${colors.bold}${colors.cyan}╔══════════════════════════════════════════════════════════╗
║              📁 Folder Organizer - Clean Up Your Files!        ║
║       Automatically sort files into categorized folders        ║
╚══════════════════════════════════════════════════════════╝${colors.reset}
`);
}

function showHelp() {
  console.log(`
${colors.bold}Commands:${colors.reset}
  ${colors.green}organize${colors.reset} [path]        - Organize files in the specified folder
  ${colors.green}preview${colors.reset} [path]         - Preview what would be organized
  ${colors.green}stats${colors.reset} [path]           - Show statistics of a folder
  ${colors.green}path${colors.reset} [directory]       - Change working directory
  ${colors.green}config${colors.reset}                  - Show current configuration
  ${colors.green}help${colors.reset}                   - Show this help
  ${colors.green}exit${colors.reset}                   - Exit

${colors.dim}Example:${colors.reset}
  folder-organizer organize /home/user/Downloads
  folder-organizer preview ./Documents
  folder-organizer stats ./Desktop
`);
}

function showProgress(current, total, message = '') {
  const percentage = Math.round((current / total) * 100);
  const barLength = 30;
  const filled = Math.round((percentage / 100) * barLength);
  const empty = barLength - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  
  process.stdout.write(`\r${colors.dim}[${bar}] ${percentage}% ${message}${colors.reset}`);
  if (percentage === 100) {
    process.stdout.write('\n');
  }
}

async function handleOrganize(targetPath, options = {}) {
  try {
    const resolvedPath = path.resolve(targetPath || '.');
    
    if (!fs.existsSync(resolvedPath)) {
      console.log(`${colors.red}❌ Path does not exist: ${resolvedPath}${colors.reset}`);
      return;
    }

    if (!fs.statSync(resolvedPath).isDirectory()) {
      console.log(`${colors.red}❌ Not a directory: ${resolvedPath}${colors.reset}`);
      return;
    }

    organizer = new Organizer(resolvedPath);
    const stats = await organizer.scan();

    console.log(`\n${colors.bold}📊 Scan Results:${colors.reset}`);
    console.log(`  ${colors.blue}Files found:${colors.reset} ${stats.totalFiles}`);
    console.log(`  ${colors.blue}File types:${colors.reset} ${stats.fileTypes.join(', ')}`);
    console.log(`  ${colors.blue}Categories:${colors.reset} ${stats.categories.join(', ')}`);
    
    if (stats.totalFiles === 0) {
      console.log(`\n${colors.yellow}📭 No files to organize.${colors.reset}`);
      return;
    }

    // Show sample of files to organize
    console.log(`\n${colors.bold}📋 Files to organize:${colors.reset}`);
    const files = await organizer.getFiles();
    const sortedFiles = files.slice(0, 10);
    sortedFiles.forEach((file, index) => {
      const category = organizer.getFileCategory(file);
      const icon = organizer.getCategoryIcon(category);
      console.log(`  ${icon} ${path.basename(file.path)} → ${colors.green}${category}${colors.reset}`);
    });
    if (files.length > 10) {
      console.log(`  ${colors.dim}... and ${files.length - 10} more files${colors.reset}`);
    }

    // Ask for confirmation
    console.log(`\n${colors.yellow}❓ Do you want to organize these files? (yes/no): ${colors.reset}`);
    rl.question('', async (answer) => {
      if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
        console.log(`\n${colors.yellow}❌ Organization cancelled.${colors.reset}`);
        return;
      }

      console.log(`\n${colors.bold}${colors.cyan}🔄 Organizing files...${colors.reset}`);
      console.log('='.repeat(50));

      try {
        const result = await organizer.organize((progress) => {
          showProgress(progress.current, progress.total, progress.message);
        });

        console.log(`\n${colors.bold}${colors.bgGreen}${colors.green}🎉 Organization Complete!${colors.reset}`);
        console.log('\n' + '='.repeat(50));
        console.log(`${colors.green}✅ ${result.moved} files organized into ${result.foldersCreated} folders${colors.reset}`);
        
        if (result.alreadyOrganized > 0) {
          console.log(`${colors.dim}📂 ${result.alreadyOrganized} files were already in correct folders${colors.reset}`);
        }
        
        if (result.errors > 0) {
          console.log(`${colors.red}⚠️ ${result.errors} errors encountered${colors.reset}`);
        }

        // Show final structure
        console.log(`\n${colors.bold}📂 Final Folder Structure:${colors.reset}`);
        const finalStats = await organizer.scan();
        const categories = finalStats.categories || [];
        categories.forEach(cat => {
          const count = finalStats.categoryCounts?.[cat] || 0;
          const icon = organizer.getCategoryIcon(cat);
          console.log(`  ${icon} ${cat}/ (${count} files)`);
        });

      } catch (error) {
        console.log(`\n${colors.red}❌ Error organizing files: ${error.message}${colors.reset}`);
      }
    });

  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
  }
}

async function handlePreview(targetPath) {
  try {
    const resolvedPath = path.resolve(targetPath || '.');
    
    if (!fs.existsSync(resolvedPath)) {
      console.log(`${colors.red}❌ Path does not exist: ${resolvedPath}${colors.reset}`);
      return;
    }

    if (!fs.statSync(resolvedPath).isDirectory()) {
      console.log(`${colors.red}❌ Not a directory: ${resolvedPath}${colors.reset}`);
      return;
    }

    organizer = new Organizer(resolvedPath);
    const files = await organizer.getFiles();
    const stats = await organizer.scan();

    console.log(`\n${colors.bold}📊 Preview for: ${resolvedPath}${colors.reset}`);
    console.log('='.repeat(50));
    console.log(`${colors.blue}Total files:${colors.reset} ${stats.totalFiles}`);
    console.log(`${colors.blue}File types:${colors.reset} ${stats.fileTypes.join(', ')}`);
    console.log(`${colors.blue}Categories:${colors.reset} ${stats.categories.join(', ')}`);

    if (files.length === 0) {
      console.log(`\n${colors.yellow}📭 No files to organize.${colors.reset}`);
      return;
    }

    console.log(`\n${colors.bold}📋 File breakdown by category:${colors.reset}`);
    const categorized = {};
    files.forEach(file => {
      const category = organizer.getFileCategory(file);
      if (!categorized[category]) {
        categorized[category] = [];
      }
      categorized[category].push(file);
    });

    const sortedCategories = Object.keys(categorized).sort();
    sortedCategories.forEach(cat => {
      const icon = organizer.getCategoryIcon(cat);
      const count = categorized[cat].length;
      console.log(`\n  ${icon} ${colors.bold}${cat}${colors.reset} (${count} files):`);
      const files = categorized[cat].slice(0, 5);
      files.forEach(f => {
        console.log(`    ${colors.dim}• ${path.basename(f.path)}${colors.reset}`);
      });
      if (categorized[cat].length > 5) {
        console.log(`    ${colors.dim}... and ${categorized[cat].length - 5} more${colors.reset}`);
      }
    });

  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
  }
}

async function handleStats(targetPath) {
  try {
    const resolvedPath = path.resolve(targetPath || '.');
    
    if (!fs.existsSync(resolvedPath)) {
      console.log(`${colors.red}❌ Path does not exist: ${resolvedPath}${colors.reset}`);
      return;
    }

    if (!fs.statSync(resolvedPath).isDirectory()) {
      console.log(`${colors.red}❌ Not a directory: ${resolvedPath}${colors.reset}`);
      return;
    }

    organizer = new Organizer(resolvedPath);
    const stats = await organizer.scan();

    console.log(`\n${colors.bold}📊 Statistics for: ${resolvedPath}${colors.reset}`);
    console.log('='.repeat(50));
    console.log(`${colors.blue}Total files:${colors.reset} ${stats.totalFiles}`);
    console.log(`${colors.blue}Total folders:${colors.reset} ${stats.totalFolders}`);
    console.log(`${colors.blue}File types:${colors.reset} ${stats.fileTypes.join(', ') || 'None'}`);
    console.log(`${colors.blue}Categories:${colors.reset} ${stats.categories.join(', ') || 'None'}`);
    
    if (stats.categoryCounts) {
      console.log(`\n${colors.bold}📂 Category Breakdown:${colors.reset}`);
      const sorted = Object.entries(stats.categoryCounts).sort((a, b) => b[1] - a[1]);
      sorted.forEach(([cat, count]) => {
        const icon = organizer.getCategoryIcon(cat);
        const percentage = Math.round((count / stats.totalFiles) * 100);
        console.log(`  ${icon} ${cat}: ${count} files (${percentage}%)`);
      });
    }

    // Show largest files
    const files = await organizer.getFiles();
    if (files.length > 0) {
      const sortedBySize = [...files].sort((a, b) => b.size - a.size).slice(0, 5);
      console.log(`\n${colors.bold}📏 Largest files:${colors.reset}`);
      sortedBySize.forEach(file => {
        const size = (file.size / 1024 / 1024).toFixed(2);
        console.log(`  ${colors.dim}• ${path.basename(file.path)} (${size} MB)${colors.reset}`);
      });
    }

  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
  }
}

async function main() {
  showBanner();
  showHelp();

  const defaultPath = process.cwd();
  console.log(`${colors.dim}💡 Current directory: ${defaultPath}${colors.reset}`);
  console.log(`${colors.dim}💡 Type 'organize /path/to/folder' to start${colors.reset}`);

  console.log('\n' + '─'.repeat(50));

  rl.on('line', async (input) => {
    const parts = input.trim().split(/\s+/);
    const cmd = parts[0]?.toLowerCase();
    const args = parts.slice(1);

    try {
      switch (cmd) {
        case 'organize':
        case 'o': {
          const targetPath = args[0] || '.';
          await handleOrganize(targetPath);
          break;
        }

        case 'preview':
        case 'p': {
          const targetPath = args[0] || '.';
          await handlePreview(targetPath);
          break;
        }

        case 'stats':
        case 's': {
          const targetPath = args[0] || '.';
          await handleStats(targetPath);
          break;
        }

        case 'path':
        case 'cd': {
          const newPath = args[0] || '.';
          const resolvedPath = path.resolve(newPath);
          
          if (!fs.existsSync(resolvedPath)) {
            console.log(`${colors.red}❌ Path does not exist: ${resolvedPath}${colors.reset}`);
            break;
          }
          
          if (!fs.statSync(resolvedPath).isDirectory()) {
            console.log(`${colors.red}❌ Not a directory: ${resolvedPath}${colors.reset}`);
            break;
          }
          
          process.chdir(resolvedPath);
          console.log(`${colors.green}✅ Changed to: ${resolvedPath}${colors.reset}`);
          organizer = new Organizer(resolvedPath);
          break;
        }

        case 'config':
        case 'c': {
          console.log(`\n${colors.bold}⚙️ Configuration:${colors.reset}`);
          console.log(`  ${colors.dim}Categories:${colors.reset}`);
          const categories = Organizer.getCategories();
          categories.forEach(cat => {
            const icon = Organizer.getCategoryIcon(cat);
            console.log(`    ${icon} ${cat}`);
          });
          console.log(`\n  ${colors.dim}Supported file types:${colors.reset}`);
          const types = Organizer.getFileTypes();
          Object.entries(types).forEach(([category, extensions]) => {
            console.log(`    ${category}: ${extensions.slice(0, 5).join(', ')}${extensions.length > 5 ? '...' : ''}`);
          });
          break;
        }

        case 'help':
        case 'h':
          showHelp();
          break;

        case 'exit':
        case 'quit':
        case 'q':
          console.log(`\n${colors.bold}👋 Goodbye!${colors.reset}`);
          process.exit(0);
          break;

        default:
          if (cmd) {
            console.log(`${colors.red}❌ Unknown command: ${cmd}${colors.reset}`);
            console.log(`${colors.yellow}💡 Type 'help' for available commands${colors.reset}`);
          }
      }
    } catch (error) {
      console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    }
  });

  process.stdout.write(`\n${colors.cyan}folder-organizer${colors.reset}> `);
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.log(`${colors.red}❌ Unexpected error: ${error.message}${colors.reset}`);
  console.log(`${colors.dim}${error.stack}${colors.reset}`);
});

main();