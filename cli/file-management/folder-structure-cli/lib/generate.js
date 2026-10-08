import fs from 'fs';
import path from 'path';

/**
 * Parse a text representation of a folder structure into a structured object
 */
export function parseStructure(text) {
  const lines = text.split('\n');
  const structure = {};
  const pathStack = [];
  
  for (let line of lines) {
    line = line.trimEnd(); // Nur trailing Spaces entfernen, nicht leading
    
    if (!line || line.trim() === '') continue;
    
    // Skip lines that are just separators (only │ and spaces)
    if (/^[│ ]+$/.test(line.trim())) continue;
    
    // Calculate depth based on indentation (count spaces or tree characters)
    let depth = 0;
    
    // Check for tree characters (│, ├──, └──)
    if (line.includes('├──') || line.includes('└──') || line.includes('│')) {
      // Count the indentation before the first tree character
      const match = line.match(/^([│├└─ ]*)/);
      if (match) {
        const indent = match[1];
        // Each level is 4 spaces or a combination of │ and spaces
        depth = Math.floor(indent.length / 4);
        // If there are tree characters, add extra depth
        if (indent.includes('├') || indent.includes('└')) {
          depth += 0; // Already counted
        }
      }
    } else {
      // For root level without tree characters
      const match = line.match(/^(\s*)/);
      if (match) {
        depth = Math.floor(match[1].length / 4);
      }
    }
    
    // Clean the line: remove tree characters and extra spaces
    let cleanLine = line
      .replace(/[├─└│]/g, '')  // Remove tree characters
      .replace(/^[\s]+/, '');   // Remove leading spaces
    
    // Check if it's a folder (ends with /)
    if (cleanLine.endsWith('/')) {
      const folderName = cleanLine.replace('/', '').trim();
      if (folderName) {
        // Adjust path stack to correct depth
        while (pathStack.length > depth) {
          pathStack.pop();
        }
        
        const fullPath = pathStack.length > 0 
          ? [...pathStack, folderName].join('/') 
          : folderName;
        
        structure[fullPath] = { type: 'folder', children: [] };
        
        // Add to parent's children if parent exists
        if (pathStack.length > 0) {
          const parentPath = pathStack.join('/');
          if (structure[parentPath]) {
            structure[parentPath].children.push(folderName);
          }
        }
        
        pathStack.push(folderName);
      }
    } 
    // Check if it's a file (has no / at the end and contains a dot or is recognizable as file)
    else if (cleanLine && !cleanLine.endsWith('/')) {
      const fileName = cleanLine.trim();
      if (fileName) {
        // Adjust path stack to correct depth
        while (pathStack.length > depth) {
          pathStack.pop();
        }
        
        const fullPath = pathStack.length > 0 
          ? [...pathStack, fileName].join('/') 
          : fileName;
        
        structure[fullPath] = { type: 'file', content: '' };
        
        // Add to parent's children if parent exists
        if (pathStack.length > 0) {
          const parentPath = pathStack.join('/');
          if (structure[parentPath]) {
            structure[parentPath].children.push(fileName);
          }
        }
      }
    }
  }
  
  return structure;
}

/**
 * Get default content for a file based on its extension
 */
function getDefaultContent(filename) {
  if (filename.endsWith('.py')) return '# Python file\n';
  if (filename.endsWith('.json')) return '{\n  \n}\n';
  if (filename.endsWith('.txt')) return '# Dependencies\n\n';
  if (filename.endsWith('.md')) return '# Project Documentation\n\n## Description\n\n## Installation\n\n## Usage\n';
  if (filename.endsWith('.js') || filename.endsWith('.ts')) return '// JavaScript/TypeScript file\n';
  if (filename.endsWith('.jsx') || filename.endsWith('.tsx')) return '// React component\n';
  if (filename.endsWith('.html')) return '<!DOCTYPE html>\n<html>\n<head>\n  <title>Document</title>\n</head>\n<body>\n  \n</body>\n</html>\n';
  if (filename.endsWith('.css')) return '/* CSS file */\n';
  if (filename.endsWith('.sh')) return '#!/bin/bash\n\n';
  if (filename.endsWith('.env')) return '# Environment variables\n';
  if (filename.endsWith('.yml') || filename.endsWith('.yaml')) return '# YAML configuration\n\n';
  if (filename.endsWith('.conf')) return '# Configuration file\n';
  if (filename.endsWith('.sql')) return '-- SQL file\n';
  if (filename.endsWith('.exe')) return '';
  return '';
}

/**
 * Create the folder structure on disk
 */
export function generateStructure(basePath, structure) {
  const resolvedPath = path.resolve(basePath);
  const items = Object.keys(structure);
  
  // First, find the root folder
  const rootItems = items.filter(item => !item.includes('/'));
  const rootFolder = rootItems.find(item => structure[item].type === 'folder');
  
  // If there's a root folder, create it first
  if (rootFolder) {
    const rootPath = path.join(resolvedPath, rootFolder);
    if (!fs.existsSync(rootPath)) {
      fs.mkdirSync(rootPath, { recursive: true });
      console.log(`📁 Created root folder: ${rootFolder}`);
    }
  }
  
  // Sort items by depth (shallow first)
  const sortedItems = items.sort((a, b) => {
    const aDepth = a.split('/').length;
    const bDepth = b.split('/').length;
    return aDepth - bDepth;
  });
  
  for (const item of sortedItems) {
    // Skip root folder if it's already created
    if (item === rootFolder) continue;
    
    const fullPath = path.join(resolvedPath, item);
    const itemData = structure[item];
    
    try {
      if (itemData.type === 'folder') {
        if (!fs.existsSync(fullPath)) {
          fs.mkdirSync(fullPath, { recursive: true });
          console.log(`📁 Created folder: ${item}`);
        }
      } else if (itemData.type === 'file') {
        const dirPath = path.dirname(fullPath);
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
        
        const filename = path.basename(item);
        const content = getDefaultContent(filename);
        
        // Only write if file doesn't exist or is empty
        if (!fs.existsSync(fullPath) || fs.statSync(fullPath).size === 0) {
          fs.writeFileSync(fullPath, content);
          console.log(`📄 Created file: ${item}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error creating ${item}:`, error.message);
    }
  }
}

/**
 * Display the parsed structure in a tree-like format
 */
export function displayStructure(structure) {
  console.log('\n📂 Structure Preview:');
  console.log('='.repeat(50));
  
  const items = Object.keys(structure);
  
  // Helper function to get children of a path
  function getChildren(parentPath) {
    const children = [];
    for (const item of items) {
      if (item === parentPath) continue;
      
      if (parentPath === '') {
        // Root level
        if (!item.includes('/')) {
          children.push(item);
        }
      } else {
        // Check if parent is the immediate parent
        const itemParts = item.split('/');
        const itemParent = itemParts.slice(0, -1).join('/');
        if (itemParent === parentPath) {
          children.push(item);
        }
      }
    }
    
    // Sort: folders first, then files
    children.sort((a, b) => {
      const aIsFolder = structure[a].type === 'folder';
      const bIsFolder = structure[b].type === 'folder';
      if (aIsFolder && !bIsFolder) return -1;
      if (!aIsFolder && bIsFolder) return 1;
      return a.localeCompare(b);
    });
    
    return children;
  }
  
  // Print tree recursively
  function printTree(parentPath, indent) {
    const children = getChildren(parentPath);
    
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const isLast = i === children.length - 1;
      const childName = path.basename(child);
      const prefix = isLast ? '└── ' : '├── ';
      
      if (structure[child].type === 'folder') {
        console.log(`${indent}${prefix}📁 ${childName}/`);
        printTree(child, indent + (isLast ? '    ' : '│   '));
      } else {
        console.log(`${indent}${prefix}📄 ${childName}`);
      }
    }
  }
  
  // Print root items
  const rootChildren = getChildren('');
  if (rootChildren.length > 0) {
    for (let i = 0; i < rootChildren.length; i++) {
      const child = rootChildren[i];
      const isLast = i === rootChildren.length - 1;
      const childName = path.basename(child);
      
      if (structure[child].type === 'folder') {
        console.log(`📁 ${childName}/`);
        printTree(child, isLast ? '    ' : '│   ');
      } else {
        console.log(`📄 ${childName}`);
      }
    }
  }
}

/**
 * Validate if a structure is valid
 */
export function validateStructure(structure) {
  if (!structure || typeof structure !== 'object') return false;
  const items = Object.keys(structure);
  if (items.length === 0) return false;
  
  for (const item of items) {
    const data = structure[item];
    if (!data || typeof data !== 'object') return false;
    if (!data.type || !['folder', 'file'].includes(data.type)) return false;
  }
  
  return true;
}

/**
 * Get structure statistics
 */
export function getStructureStats(structure) {
  const items = Object.values(structure);
  const folders = items.filter(item => item.type === 'folder');
  const files = items.filter(item => item.type === 'file');
  const maxDepth = items.length > 0 
    ? Math.max(...Object.keys(structure).map(p => p.split('/').length))
    : 0;
  
  return {
    totalItems: items.length,
    folders: folders.length,
    files: files.length,
    maxDepth: maxDepth,
    rootItems: Object.keys(structure).filter(p => !p.includes('/')).length
  };
}