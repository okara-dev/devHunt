#!/usr/bin/env node

import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { PDFConverter } from '../lib/converter.js';

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

let converter = new PDFConverter();

function showBanner() {
  console.log(`
${colors.bold}${colors.cyan}╔═══════════════════════════════════════════════════════════════════╗
║              📄 PDF Converter - Convert Anything to PDF!            ║
║       Convert text, markdown, HTML, images and more to PDF          ║
╚═══════════════════════════════════════════════════════════════════╝${colors.reset}
`);
}

function showHelp() {
  console.log(`
${colors.bold}Commands:${colors.reset}
  ${colors.green}convert${colors.reset} <file> [options]    - Convert file to PDF
  ${colors.green}text${colors.reset} <text>              - Convert text to PDF
  ${colors.green}create${colors.reset} <title>            - Create a new PDF from scratch
  ${colors.green}merge${colors.reset} <files...>         - Merge multiple PDFs
  ${colors.green}info${colors.reset} <file>              - Show PDF information
  ${colors.green}preview${colors.reset} <file>           - Preview PDF content
  ${colors.green}batch${colors.reset} <directory>        - Convert all files in directory
  ${colors.green}config${colors.reset}                   - Show current configuration
  ${colors.green}help${colors.reset}                     - Show this help
  ${colors.green}exit${colors.reset}                     - Exit

${colors.dim}Options for convert:${colors.reset}
  --output <path>          - Output file path
  --type <type>            - Force file type (text, markdown, html)
  --page-size <size>       - Page size (A4, A3, Letter, etc.)
  --landscape              - Landscape orientation
  --title <title>          - Set PDF title
  --author <author>        - Set PDF author

${colors.dim}Examples:${colors.reset}
  pdf-converter convert document.txt --output output.pdf
  pdf-converter text "Hello World" --title "My Document"
  pdf-converter create "My Report"
  pdf-converter merge file1.pdf file2.pdf --output merged.pdf
  pdf-converter batch ./documents
`);
}

function showSupportedFormats() {
  console.log(`\n${colors.bold}📋 Supported Formats:${colors.reset}`);
  console.log('='.repeat(50));
  console.log(`${colors.green}Text Files${colors.reset}: .txt, .log, .md`);
  console.log(`${colors.green}Markdown${colors.reset}: .md, .markdown`);
  console.log(`${colors.green}HTML${colors.reset}: .html, .htm`);
  console.log(`${colors.green}Images${colors.reset}: .jpg, .jpeg, .png, .gif, .bmp, .svg`);
  console.log(`${colors.green}PDF${colors.reset}: .pdf (merge)`);
  console.log(`${colors.green}JSON${colors.reset}: .json (structured data)`);
  console.log(`${colors.green}CSV${colors.reset}: .csv (tables)`);
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

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function handleConvert(args) {
  try {
    if (args.length === 0) {
      console.log(`${colors.red}❌ Please specify a file to convert.${colors.reset}`);
      console.log(`${colors.yellow}💡 Usage: convert <file> [options]${colors.reset}`);
      return;
    }

    const filePath = args[0];
    const options = {};
    
    // Parse options
    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--output' && args[i+1]) {
        options.output = args[i+1];
        i++;
      } else if (args[i] === '--type' && args[i+1]) {
        options.type = args[i+1];
        i++;
      } else if (args[i] === '--page-size' && args[i+1]) {
        options.pageSize = args[i+1];
        i++;
      } else if (args[i] === '--landscape') {
        options.landscape = true;
      } else if (args[i] === '--title' && args[i+1]) {
        options.title = args[i+1];
        i++;
      } else if (args[i] === '--author' && args[i+1]) {
        options.author = args[i+1];
        i++;
      }
    }

    if (!fs.existsSync(filePath)) {
      console.log(`${colors.red}❌ File not found: ${filePath}${colors.reset}`);
      return;
    }

    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      console.log(`${colors.yellow}📁 ${filePath} is a directory. Use 'batch' command instead.${colors.reset}`);
      return;
    }

    // Get file extension
    const ext = path.extname(filePath).toLowerCase();
    const filename = path.basename(filePath);

    // Determine output path
    if (!options.output) {
      const outputDir = path.dirname(filePath);
      const outputName = path.basename(filePath, ext);
      options.output = path.join(outputDir, `${outputName}.pdf`);
    }

    console.log(`\n${colors.bold}${colors.cyan}📄 Converting: ${filename}${colors.reset}`);
    console.log('='.repeat(50));
    console.log(`  ${colors.dim}Input:${colors.reset} ${filePath}`);
    console.log(`  ${colors.dim}Size:${colors.reset} ${formatFileSize(stats.size)}`);
    console.log(`  ${colors.dim}Type:${colors.reset} ${ext || 'unknown'}`);
    console.log(`  ${colors.dim}Output:${colors.reset} ${options.output}`);

    // Check if output file exists
    if (fs.existsSync(options.output)) {
      console.log(`\n${colors.yellow}⚠️ Output file already exists: ${options.output}${colors.reset}`);
      rl.question(`${colors.yellow}Overwrite? (yes/no): ${colors.reset}`, async (answer) => {
        if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
          await performConversion(filePath, options);
        } else {
          console.log(`${colors.yellow}❌ Conversion cancelled.${colors.reset}`);
        }
      });
      return;
    }

    await performConversion(filePath, options);

  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
  }
}

async function performConversion(filePath, options) {
  try {
    console.log(`\n${colors.dim}⏳ Converting...${colors.reset}`);
    
    const result = await converter.convert(filePath, options, (progress) => {
      showProgress(progress.current, progress.total, progress.message);
    });

    if (result.success) {
      console.log(`\n${colors.bold}${colors.bgGreen}${colors.green}✅ Conversion Complete!${colors.reset}`);
      console.log('='.repeat(50));
      console.log(`  ${colors.green}Output:${colors.reset} ${result.outputPath}`);
      console.log(`  ${colors.green}Size:${colors.reset} ${formatFileSize(result.fileSize || 0)}`);
      console.log(`  ${colors.green}Pages:${colors.reset} ${result.pages || 'N/A'}`);
      console.log(`  ${colors.green}Type:${colors.reset} ${result.type || 'PDF'}`);
      
      if (result.stats) {
        console.log(`\n${colors.dim}📊 Conversion Stats:${colors.reset}`);
        console.log(`  ${colors.dim}Words:${colors.reset} ${result.stats.words || 'N/A'}`);
        console.log(`  ${colors.dim}Characters:${colors.reset} ${result.stats.characters || 'N/A'}`);
        console.log(`  ${colors.dim}Lines:${colors.reset} ${result.stats.lines || 'N/A'}`);
      }

      // Ask if user wants to open the PDF
      console.log(`\n${colors.yellow}❓ Open the PDF? (yes/no): ${colors.reset}`);
      rl.question('', async (answer) => {
        if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
          await openPDF(result.outputPath);
        }
      });
    } else {
      console.log(`\n${colors.bold}${colors.red}❌ Conversion Failed:${colors.reset}`);
      console.log(`  ${colors.red}${result.error}${colors.reset}`);
      
      if (result.suggestion) {
        console.log(`\n${colors.yellow}💡 Suggestion: ${result.suggestion}${colors.reset}`);
      }
    }

  } catch (error) {
    console.log(`${colors.red}❌ Conversion error: ${error.message}${colors.reset}`);
  }
}

async function handleText(args) {
  try {
    if (args.length === 0) {
      console.log(`${colors.red}❌ Please provide text to convert.${colors.reset}`);
      return;
    }

    const text = args.join(' ');
    const options = {};
    
    // Parse options
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--title' && args[i+1]) {
        options.title = args[i+1];
        i++;
      } else if (args[i] === '--author' && args[i+1]) {
        options.author = args[i+1];
        i++;
      } else if (args[i] === '--output' && args[i+1]) {
        options.output = args[i+1];
        i++;
      }
    }

    if (!options.output) {
      const date = new Date().toISOString().replace(/[:.]/g, '-');
      options.output = `document_${date}.pdf`;
    }

    console.log(`\n${colors.bold}${colors.cyan}📝 Creating PDF from text${colors.reset}`);
    console.log('='.repeat(50));
    console.log(`  ${colors.dim}Text length:${colors.reset} ${text.length} characters`);
    console.log(`  ${colors.dim}Words:${colors.reset} ${text.split(/\s+/).length}`);
    console.log(`  ${colors.dim}Output:${colors.reset} ${options.output}`);

    console.log(`\n${colors.dim}⏳ Creating PDF...${colors.reset}`);
    
    const result = await converter.createFromText(text, options);
    
    if (result.success) {
      console.log(`\n${colors.bold}${colors.bgGreen}${colors.green}✅ PDF Created!${colors.reset}`);
      console.log('='.repeat(50));
      console.log(`  ${colors.green}Output:${colors.reset} ${result.outputPath}`);
      console.log(`  ${colors.green}Size:${colors.reset} ${formatFileSize(result.fileSize || 0)}`);
    } else {
      console.log(`\n${colors.red}❌ Failed to create PDF: ${result.error}${colors.reset}`);
    }

  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
  }
}

async function handleCreate(args) {
  try {
    const title = args[0] || 'Untitled Document';
    const options = {};
    
    // Parse options
    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--output' && args[i+1]) {
        options.output = args[i+1];
        i++;
      } else if (args[i] === '--author' && args[i+1]) {
        options.author = args[i+1];
        i++;
      } else if (args[i] === '--page-size' && args[i+1]) {
        options.pageSize = args[i+1];
        i++;
      } else if (args[i] === '--landscape') {
        options.landscape = true;
      }
    }

    if (!options.output) {
      const name = title.toLowerCase().replace(/\s+/g, '-');
      options.output = `${name}.pdf`;
    }

    console.log(`\n${colors.bold}${colors.cyan}📝 Creating new PDF: ${title}${colors.reset}`);
    console.log('='.repeat(50));
    console.log(`  ${colors.dim}Title:${colors.reset} ${title}`);
    console.log(`  ${colors.dim}Output:${colors.reset} ${options.output}`);

    console.log(`\n${colors.dim}⏳ Creating PDF...${colors.reset}`);
    
    const result = await converter.createBlankPDF(title, options);
    
    if (result.success) {
      console.log(`\n${colors.bold}${colors.bgGreen}${colors.green}✅ PDF Created!${colors.reset}`);
      console.log('='.repeat(50));
      console.log(`  ${colors.green}Output:${colors.reset} ${result.outputPath}`);
      console.log(`  ${colors.green}Size:${colors.reset} ${formatFileSize(result.fileSize || 0)}`);
      
      console.log(`\n${colors.yellow}❓ Add content to the PDF? (yes/no): ${colors.reset}`);
      rl.question('', async (answer) => {
        if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
          console.log(`\n${colors.cyan}📝 Enter content (type 'END' on a new line to finish):${colors.reset}`);
          let lines = [];
          rl.on('line', async (input) => {
            if (input.trim() === 'END') {
              const content = lines.join('\n');
              const result2 = await converter.addContent(result.outputPath, content);
              if (result2.success) {
                console.log(`\n${colors.green}✅ Content added to PDF!${colors.reset}`);
              }
              rl.removeAllListeners('line');
            } else {
              lines.push(input);
            }
          });
        }
      });
    } else {
      console.log(`\n${colors.red}❌ Failed to create PDF: ${result.error}${colors.reset}`);
    }

  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
  }
}

async function handleMerge(args) {
  try {
    if (args.length === 0) {
      console.log(`${colors.red}❌ Please specify PDF files to merge.${colors.reset}`);
      return;
    }

    const files = [];
    let outputPath = 'merged.pdf';
    
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--output' && args[i+1]) {
        outputPath = args[i+1];
        i++;
      } else if (!args[i].startsWith('--')) {
        files.push(args[i]);
      }
    }

    if (files.length < 2) {
      console.log(`${colors.red}❌ Need at least 2 PDF files to merge.${colors.reset}`);
      return;
    }

    // Check if files exist
    const validFiles = [];
    for (const file of files) {
      if (!fs.existsSync(file)) {
        console.log(`${colors.red}❌ File not found: ${file}${colors.reset}`);
        return;
      }
      const ext = path.extname(file).toLowerCase();
      if (ext !== '.pdf') {
        console.log(`${colors.yellow}⚠️ ${file} is not a PDF. Converting first...${colors.reset}`);
        // Convert file first
        const result = await converter.convert(file);
        if (result.success) {
          validFiles.push(result.outputPath);
        }
      } else {
        validFiles.push(file);
      }
    }

    console.log(`\n${colors.bold}${colors.cyan}📚 Merging ${validFiles.length} PDFs${colors.reset}`);
    console.log('='.repeat(50));
    validFiles.forEach((f, i) => {
      console.log(`  ${i+1}. ${path.basename(f)}`);
    });
    console.log(`  ${colors.dim}Output:${colors.reset} ${outputPath}`);

    console.log(`\n${colors.dim}⏳ Merging PDFs...${colors.reset}`);
    
    const result = await converter.mergePDFs(validFiles, outputPath);
    
    if (result.success) {
      console.log(`\n${colors.bold}${colors.bgGreen}${colors.green}✅ PDFs Merged!${colors.reset}`);
      console.log('='.repeat(50));
      console.log(`  ${colors.green}Output:${colors.reset} ${result.outputPath}`);
      console.log(`  ${colors.green}Size:${colors.reset} ${formatFileSize(result.fileSize || 0)}`);
      console.log(`  ${colors.green}Pages:${colors.reset} ${result.pages || 'N/A'}`);
    } else {
      console.log(`\n${colors.red}❌ Failed to merge: ${result.error}${colors.reset}`);
    }

  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
  }
}

async function handleInfo(args) {
  try {
    if (args.length === 0) {
      console.log(`${colors.red}❌ Please specify a PDF file.${colors.reset}`);
      return;
    }

    const filePath = args[0];
    if (!fs.existsSync(filePath)) {
      console.log(`${colors.red}❌ File not found: ${filePath}${colors.reset}`);
      return;
    }

    const info = await converter.getPDFInfo(filePath);
    
    console.log(`\n${colors.bold}📋 PDF Information:${colors.reset}`);
    console.log('='.repeat(50));
    console.log(`  ${colors.blue}File:${colors.reset} ${path.basename(filePath)}`);
    console.log(`  ${colors.blue}Path:${colors.reset} ${filePath}`);
    console.log(`  ${colors.blue}Size:${colors.reset} ${formatFileSize(info.fileSize)}`);
    
    if (info.metadata) {
      console.log(`\n  ${colors.bold}Metadata:${colors.reset}`);
      Object.entries(info.metadata).forEach(([key, value]) => {
        if (value) {
          console.log(`    ${key}: ${value}`);
        }
      });
    }
    
    console.log(`\n  ${colors.bold}Pages:${colors.reset} ${info.pages || 'N/A'}`);
    console.log(`  ${colors.bold}Created:${colors.reset} ${info.created || 'N/A'}`);
    console.log(`  ${colors.bold}Modified:${colors.reset} ${info.modified || 'N/A'}`);
    console.log(`  ${colors.bold}Version:${colors.reset} ${info.version || 'N/A'}`);

  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
  }
}

async function handleBatch(args) {
  try {
    if (args.length === 0) {
      console.log(`${colors.red}❌ Please specify a directory.${colors.reset}`);
      return;
    }

    const directory = args[0];
    if (!fs.existsSync(directory)) {
      console.log(`${colors.red}❌ Directory not found: ${directory}${colors.reset}`);
      return;
    }

    if (!fs.statSync(directory).isDirectory()) {
      console.log(`${colors.red}❌ Not a directory: ${directory}${colors.reset}`);
      return;
    }

    const options = {};
    // Parse options
    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--output' && args[i+1]) {
        options.output = args[i+1];
        i++;
      } else if (args[i] === '--type' && args[i+1]) {
        options.type = args[i+1];
        i++;
      }
    }

    const files = fs.readdirSync(directory);
    const supportedExts = ['.txt', '.md', '.html', '.htm', '.json', '.csv', '.jpg', '.jpeg', '.png', '.gif', '.bmp'];
    
    const toConvert = files.filter(f => {
      const ext = path.extname(f).toLowerCase();
      return supportedExts.includes(ext);
    });

    if (toConvert.length === 0) {
      console.log(`${colors.yellow}📭 No supported files found in directory.${colors.reset}`);
      showSupportedFormats();
      return;
    }

    console.log(`\n${colors.bold}${colors.cyan}📚 Batch Converting ${toConvert.length} files${colors.reset}`);
    console.log('='.repeat(50));
    toConvert.forEach((f, i) => {
      console.log(`  ${i+1}. ${f}`);
    });

    console.log(`\n${colors.yellow}❓ Continue with batch conversion? (yes/no): ${colors.reset}`);
    rl.question('', async (answer) => {
      if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
        console.log(`${colors.yellow}❌ Batch conversion cancelled.${colors.reset}`);
        return;
      }

      console.log(`\n${colors.dim}⏳ Converting files...${colors.reset}`);
      
      const results = [];
      let success = 0;
      let failed = 0;

      for (let i = 0; i < toConvert.length; i++) {
        const file = toConvert[i];
        const filePath = path.join(directory, file);
        const outputPath = options.output ? 
          path.join(options.output, path.basename(file, path.extname(file)) + '.pdf') :
          path.join(directory, path.basename(file, path.extname(file)) + '.pdf');

        showProgress(i + 1, toConvert.length, `Converting ${file}...`);
        
        try {
          const result = await converter.convert(filePath, { ...options, output: outputPath });
          if (result.success) {
            success++;
            results.push({ file, status: 'success', output: result.outputPath });
          } else {
            failed++;
            results.push({ file, status: 'failed', error: result.error });
          }
        } catch (error) {
          failed++;
          results.push({ file, status: 'failed', error: error.message });
        }
      }

      console.log(`\n${colors.bold}${colors.bgGreen}${colors.green}✅ Batch Conversion Complete!${colors.reset}`);
      console.log('='.repeat(50));
      console.log(`  ${colors.green}Success:${colors.reset} ${success} files`);
      console.log(`  ${colors.red}Failed:${colors.reset} ${failed} files`);

      if (failed > 0) {
        console.log(`\n${colors.red}Failed files:${colors.reset}`);
        results.filter(r => r.status === 'failed').forEach(r => {
          console.log(`  ${colors.red}✗ ${r.file}: ${r.error}${colors.reset}`);
        });
      }

      if (success > 0) {
        console.log(`\n${colors.green}Converted files:${colors.reset}`);
        results.filter(r => r.status === 'success').forEach(r => {
          console.log(`  ${colors.green}✓ ${r.file} → ${path.basename(r.output)}${colors.reset}`);
        });
      }
    });

  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
  }
}

async function openPDF(filePath) {
  try {
    const { exec } = await import('child_process');
    const platform = process.platform;
    let command;
    
    if (platform === 'win32') {
      command = `start ${filePath}`;
    } else if (platform === 'darwin') {
      command = `open ${filePath}`;
    } else {
      command = `xdg-open ${filePath}`;
    }
    
    exec(command);
    console.log(`${colors.green}📖 Opening PDF...${colors.reset}`);
  } catch (error) {
    console.log(`${colors.yellow}⚠️ Could not open PDF automatically.${colors.reset}`);
  }
}

async function main() {
  showBanner();
  showHelp();
  showSupportedFormats();

  console.log(`\n${colors.bold}${colors.cyan}💡 Quick Start:${colors.reset}`);
  console.log(`  ${colors.dim}1. Convert a file: convert document.txt${colors.reset}`);
  console.log(`  ${colors.dim}2. Create from text: text "Hello World"${colors.reset}`);
  console.log(`  ${colors.dim}3. Create new PDF: create "My Document"${colors.reset}`);
  console.log(`  ${colors.dim}4. Batch convert: batch ./documents${colors.reset}`);

  console.log('\n' + '─'.repeat(50));

  rl.on('line', async (input) => {
    const parts = input.trim().split(/\s+/);
    const cmd = parts[0]?.toLowerCase();
    const args = parts.slice(1);

    try {
      switch (cmd) {
        case 'convert':
        case 'c':
          await handleConvert(args);
          break;

        case 'text':
        case 't':
          await handleText(args);
          break;

        case 'create':
        case 'cr':
          await handleCreate(args);
          break;

        case 'merge':
        case 'm':
          await handleMerge(args);
          break;

        case 'info':
        case 'i':
          await handleInfo(args);
          break;

        case 'batch':
        case 'b':
          await handleBatch(args);
          break;

        case 'config':
        case 'cfg': {
          console.log(`\n${colors.bold}⚙️ Configuration:${colors.reset}`);
          console.log('='.repeat(50));
          console.log(`  ${colors.dim}Default page size:${colors.reset} ${converter.defaultPageSize || 'A4'}`);
          console.log(`  ${colors.dim}Default orientation:${colors.reset} ${converter.defaultOrientation || 'portrait'}`);
          console.log(`  ${colors.dim}Supported formats:${colors.reset}`);
          const formats = await converter.getSupportedFormats();
          formats.forEach(f => console.log(`    • ${f}`));
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

  process.stdout.write(`\n${colors.cyan}pdf-converter${colors.reset}> `);
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.log(`${colors.red}❌ Unexpected error: ${error.message}${colors.reset}`);
  console.log(`${colors.dim}${error.stack}${colors.reset}`);
});

main();