const fs = require('fs-extra');
const path = require('path');

const INSECURE_PATTERNS = [
  { pattern: /eval\s*\(/g, type: 'eval-usage', severity: 'critical', description: 'Usage of eval()' },
  { pattern: /require\s*\(\s*['"`].*['"`]\s*\)/g, type: 'dynamic-require', severity: 'high', description: 'Dynamic require with variables' },
  { pattern: /innerHTML\s*=/g, type: 'innerHTML', severity: 'high', description: 'Direct innerHTML assignment' },
  { pattern: /sql\s*=/g, type: 'sql-injection', severity: 'high', description: 'Possible SQL injection vulnerability' },
  { pattern: /password\s*[:=]/gi, type: 'hardcoded-password', severity: 'critical', description: 'Hardcoded password detected' },
  { pattern: /api[_-]?key\s*[:=]/gi, type: 'hardcoded-api-key', severity: 'critical', description: 'Hardcoded API key detected' },
  { pattern: /secret\s*[:=]/gi, type: 'hardcoded-secret', severity: 'critical', description: 'Hardcoded secret detected' }
];

async function performCodeAnalysis(projectPath) {
  const issues = [];

  try {
    const jsFiles = getAllJsFiles(projectPath);

    for (const file of jsFiles) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, lineNum) => {
          INSECURE_PATTERNS.forEach(pattern => {
            if (pattern.pattern.test(line)) {
              issues.push({
                type: pattern.type,
                title: `Code Security Issue: ${pattern.description}`,
                description: `Found potentially insecure pattern: ${pattern.description}`,
                severity: pattern.severity,
                location: `${file}:${lineNum + 1}`,
                recommendation: 'Review and fix this security issue'
              });
            }
          });
        });
      } catch (e) {
        // Skip files that can't be read
      }
    }
  } catch (error) {
    // Silently fail
  }

  return issues;
}

function getAllJsFiles(dir, fileList = []) {
  const ignoreList = ['node_modules', '.git', 'dist', 'build', '.next'];

  try {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
      if (ignoreList.includes(file)) return;

      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        getAllJsFiles(filePath, fileList);
      } else if (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.tsx')) {
        fileList.push(filePath);
      }
    });
  } catch (e) {
    // Ignore errors
  }

  return fileList;
}

module.exports = { performCodeAnalysis };
