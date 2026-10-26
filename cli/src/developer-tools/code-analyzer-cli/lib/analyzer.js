import fs from 'fs';
import path from 'path';

// Dateitypen die analysiert werden
const CODE_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.py', '.java', '.c', '.cpp', '.h', '.hpp', '.cs',
  '.rb', '.go', '.rs', '.php', '.swift', '.kt', '.dart',
  '.html', '.css', '.scss', '.sass', '.less', '.vue', '.svelte',
  '.json', '.xml', '.yaml', '.yml', '.toml',
  '.sh', '.bash', '.ps1', '.bat',
  '.sql', '.md'
];

// Ordner die ignoriert werden
const IGNORE_DIRS = [
  'node_modules', '.git', 'dist', 'build', '.next',
  '__pycache__', '.venv', 'venv', 'env', '.idea', '.vscode',
  'coverage', '.cache', 'tmp', 'temp'
];

// Dateien die ignoriert werden (exakte Namen)
const IGNORE_FILES = [
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'composer.lock',
  'Gemfile.lock',
  'poetry.lock',
  'Pipfile.lock',
  'Cargo.lock',
  'bun.lockb',
  'Dockerfile',
  'Dockerfile.dev',
  'Dockerfile.prod',
  'docker-compose.yml',
  'docker-compose.yaml',
  'docker-compose.dev.yml',
  'docker-compose.prod.yml',
  '.dockerignore'
];

// Datei-Muster die ignoriert werden (enthält)
const IGNORE_PATTERNS = [
  'Dockerfile',
  'docker-compose',
  '.dockerignore'
];

/**
 * Hauptfunktion: Analysiert den Code im angegebenen Pfad
 */
export async function analyzeCode(targetPath) {
  const files = getAllFiles(targetPath);

  // Statistiken sammeln
  let totalLines = 0;
  let commentLines = 0;
  let codeLines = 0;
  let blankLines = 0;
  let functions = 0;
  let largeFiles = [];
  let complexFunctions = [];
  let fileCount = 0;

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      const stats = fs.statSync(file);

      fileCount++;
      totalLines += lines.length;

      // Kommentare und Leerzeilen zählen
      for (const line of lines) {
        const trimmed = line.trim();

        if (isComment(trimmed)) {
          commentLines++;
        } else if (trimmed === '') {
          blankLines++;
        } else {
          codeLines++;
        }
      }

      // Funktionen zählen
      const fileFunctions = countFunctions(content);
      functions += fileFunctions;

      // Große Dateien finden (> 500 Zeilen)
      if (lines.length > 500) {
        largeFiles.push({
          name: path.basename(file),
          path: file,
          lines: lines.length
        });
      }

      // Komplexe Funktionen finden
      const complex = findComplexFunctions(content, file);
      complexFunctions.push(...complex);

    } catch (error) {
      // Datei überspringen wenn nicht lesbar
    }
  }

  // ============================================================
  // BREAKDOWN BERECHNEN (jeweils 0-100)
  // ============================================================

  // 1. File Size: Bestrafung für große Dateien
  const fileSizeScore = calculateFileSizeScore(largeFiles, fileCount);

  // 2. Comments: Verhältnis Kommentare zu Code
  const commentRatio = totalLines > 0 ? commentLines / totalLines : 0;
  const commentsScore = Math.min(100, Math.round(commentRatio * 500));

  // 3. Complexity: Bestrafung für komplexe Funktionen
  const complexityScore = calculateComplexityScore(complexFunctions);

  // 4. Documentation: Bestrafung für fehlende Kommentare
  const documentationScore = Math.min(100, Math.round(commentRatio * 400) + 30);

  // ============================================================
  // GESAMTSCORE
  // ============================================================

  const score = Math.round(
    (fileSizeScore + commentsScore + complexityScore + documentationScore) / 4
  );

  // Note berechnen
  const grade = getGrade(score);

  // ============================================================
  // ISSUES SAMMELN
  // ============================================================

  const issues = [];

  // Große Dateien
  largeFiles.slice(0, 3).forEach(file => {
    if (file.lines > 1000) {
      issues.push({
        severity: 'high',
        message: `File ${file.name} is very large (${file.lines} lines)`
      });
    } else {
      issues.push({
        severity: 'medium',
        message: `File ${file.name} is large (${file.lines} lines, consider splitting)`
      });
    }
  });

  // Kommentar-Ratio
  if (commentRatio < 0.05) {
    issues.push({
      severity: 'medium',
      message: `Low comment ratio (${Math.round(commentRatio * 100)}%)`
    });
  }

  // Komplexe Funktionen
  complexFunctions.slice(0, 3).forEach(func => {
    if (func.complexity > 20) {
      issues.push({
        severity: 'high',
        message: `Function ${func.name} has high complexity (${func.complexity})`
      });
    } else {
      issues.push({
        severity: 'medium',
        message: `Function ${func.name} is complex (${func.complexity})`
      });
    }
  });

  return {
    score,
    grade,
    breakdown: {
      fileSize: fileSizeScore,
      comments: commentsScore,
      complexity: complexityScore,
      documentation: documentationScore
    },
    stats: {
      files: fileCount,
      lines: totalLines,
      codeLines,
      commentLines,
      blankLines,
      functions
    },
    issues
  };
}

// ============================================================
// HILFSFUNKTIONEN
// ============================================================

/**
 * Prüft ob eine Datei ignoriert werden soll
 */
function shouldIgnoreFile(filename) {
  // Exakte Namen prüfen
  if (IGNORE_FILES.includes(filename)) return true;

  // Muster prüfen (enthält)
  for (const pattern of IGNORE_PATTERNS) {
    if (filename.includes(pattern)) return true;
  }

  // Docker-Dateien mit beliebigem Suffix
  if (filename.startsWith('Dockerfile')) return true;
  if (filename.startsWith('docker-compose')) return true;

  return false;
}

/**
 * Sammelt alle Code-Dateien rekursiv
 */
function getAllFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir);

  for (const entry of entries) {
    const fullPath = path.join(dir, entry);

    let stat;
    try {
      stat = fs.statSync(fullPath);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      // Ignorierte Ordner überspringen
      if (IGNORE_DIRS.includes(entry)) continue;
      if (entry.startsWith('.')) continue;
      getAllFiles(fullPath, files);
    } else {
      // Ignorierte Dateien überspringen
      if (shouldIgnoreFile(entry)) continue;

      const ext = path.extname(entry).toLowerCase();
      if (CODE_EXTENSIONS.includes(ext)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

/**
 * Prüft ob eine Zeile ein Kommentar ist
 */
function isComment(line) {
  return (
    line.startsWith('//') ||
    line.startsWith('#') ||
    line.startsWith('/*') ||
    line.startsWith('*') ||
    line.startsWith('<!--') ||
    line.startsWith('--') ||
    line.startsWith('"""') ||
    line.startsWith("'''")
  );
}

/**
 * Zählt Funktionen in einer Datei
 */
function countFunctions(content) {
  const patterns = [
    /function\s+[a-zA-Z_]/g,
    /def\s+[a-zA-Z_]/g,
    /fn\s+[a-zA-Z_]/g,
    /func\s+[a-zA-Z_]/g,
    /=>\s*{/g,
    /\)\s*{/g
  ];

  let count = 0;
  for (const pattern of patterns) {
    const matches = content.match(pattern);
    if (matches) count += matches.length;
  }

  return count;
}

/**
 * Findet komplexe Funktionen
 */
function findComplexFunctions(content, filePath) {
  const complex = [];
  const lines = content.split('\n');

  // Einfache Heuristik: Suche nach Funktionsdefinitionen
  const functionRegex = /(function\s+([a-zA-Z_][a-zA-Z0-9_]*)|def\s+([a-zA-Z_][a-zA-Z0-9_]*)|fn\s+([a-zA-Z_][a-zA-Z0-9_]*)|func\s+([a-zA-Z_][a-zA-Z0-9_]*))/;

  let currentFunction = null;
  let braceCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!currentFunction) {
      const match = line.match(functionRegex);
      if (match) {
        const name = match[2] || match[3] || match[4] || match[5] || 'anonymous';
        currentFunction = {
          name,
          line: i + 1,
          file: filePath,
          code: [line]
        };
        braceCount = countBraces(line);

        // Einzeiler
        if (braceCount === 0 && !line.trim().endsWith(':')) {
          const complexity = calculateComplexity(currentFunction.code);
          if (complexity > 10) {
            complex.push({ ...currentFunction, complexity });
          }
          currentFunction = null;
        }
      }
    } else {
      currentFunction.code.push(line);
      braceCount += countBraces(line);

      if (braceCount === 0) {
        const complexity = calculateComplexity(currentFunction.code);
        if (complexity > 10) {
          complex.push({
            name: currentFunction.name,
            line: currentFunction.line,
            file: currentFunction.file,
            complexity
          });
        }
        currentFunction = null;
      }
    }
  }

  return complex;
}

/**
 * Zählt Klammern
 */
function countBraces(line) {
  let count = 0;
  for (const char of line) {
    if (char === '{') count++;
    if (char === '}') count--;
  }
  return count;
}

/**
 * Berechnet zyklomatische Komplexität
 */
function calculateComplexity(codeLines) {
  const code = codeLines.join('\n');
  const patterns = [
    /if\s*\(/g,
    /else\s+if\s*\(/g,
    /for\s*\(/g,
    /while\s*\(/g,
    /case\s+/g,
    /\?\s*.*\s*:/g,
    /&&/g,
    /\|\|/g,
    /catch\s*\(/g
  ];

  let complexity = 1;
  for (const pattern of patterns) {
    const matches = code.match(pattern);
    if (matches) complexity += matches.length;
  }

  return complexity;
}

/**
 * File Size Score berechnen
 */
function calculateFileSizeScore(largeFiles, totalFiles) {
  if (totalFiles === 0) return 100;

  let penalty = 0;
  for (const file of largeFiles) {
    if (file.lines > 1000) penalty += 15;
    else if (file.lines > 750) penalty += 10;
    else if (file.lines > 500) penalty += 5;
  }

  return Math.max(0, 100 - penalty);
}

/**
 * Complexity Score berechnen
 */
function calculateComplexityScore(complexFunctions) {
  if (complexFunctions.length === 0) return 100;

  let penalty = 0;
  for (const func of complexFunctions) {
    if (func.complexity > 30) penalty += 10;
    else if (func.complexity > 20) penalty += 7;
    else if (func.complexity > 15) penalty += 4;
    else penalty += 2;
  }

  return Math.max(0, 100 - penalty);
}

/**
 * Note aus Score berechnen
 */
function getGrade(score) {
  if (score >= 90) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 80) return 'A-';
  if (score >= 75) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 65) return 'B-';
  if (score >= 60) return 'C+';
  if (score >= 55) return 'C';
  if (score >= 50) return 'C-';
  if (score >= 40) return 'D';
  return 'F';
}