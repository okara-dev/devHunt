#!/usr/bin/env node

import readline from 'readline';
import { generateStructure, parseStructure, displayStructure } from '../lib/generate.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Sample structure for demonstration
const sampleStructure = `timer_bot/
│
├── main.py                
├── reminder_manager.py   
├── notification.py         
├── database.py           
├── config.json         
├── requirements.txt       
└── README.md`;

// Main function
function main() {
  console.log('\n🚀 Folder Structure Generator');
  console.log('='.repeat(50));
  console.log('Enter your folder structure in the following format:');
  console.log(sampleStructure);
  console.log('\nPress Ctrl+C to cancel or type "exit" to quit\n');

  let lines = [];
  
  console.log('📝 Enter your structure (paste or type, then press Enter twice to finish):');
  
  rl.on('line', (input) => {
    if (input.trim() === 'exit') {
      console.log('👋 Goodbye!');
      rl.close();
      return;
    }
    
    if (input.trim() === '') {
      if (lines.length > 0) {
        // Process the structure
        const structureText = lines.join('\n');
        const parsedStructure = parseStructure(structureText);
        
        if (Object.keys(parsedStructure).length === 0) {
          console.log('❌ Invalid structure format. Please try again.\n');
          lines = [];
          return;
        }
        
        console.log('\n📋 Parsed structure:');
        displayStructure(parsedStructure);
        
        rl.question('\n✅ Do you want to create this structure? (yes/no): ', (answer) => {
          if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
            // Use current working directory (where the command was executed)
            const targetPath = process.cwd();
            
            try {
              generateStructure(targetPath, parsedStructure);
              console.log(`\n✅ Structure created successfully at: ${targetPath}`);
            } catch (error) {
              console.error('❌ Error creating structure:', error.message);
            }
            
            rl.close();
          } else {
            console.log('❌ Creation cancelled.');
            rl.close();
          }
        });
      }
    } else {
      lines.push(input);
    }
  });

  rl.on('close', () => {
    console.log('\n👋 Goodbye!');
    process.exit(0);
  });
}

// Run the program
main();