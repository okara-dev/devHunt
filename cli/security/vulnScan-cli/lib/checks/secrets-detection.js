const fs = require('fs-extra');
const path = require('path');

const SECRET_PATTERNS = [
  { pattern: /aws[_]?access[_]?key[_]?id/gi, type: 'aws-access-key', description: 'AWS Access Key' },
  { pattern: /aws[_]?secret[_]?access[_]?key/gi, type: 'aws-secret-key', description: 'AWS Secret Key' },
  { pattern: /password\s*[:=]\s*['"`]([^'"`]{6,})['"`]/gi, type: 'hardcoded-password', description: 'Hardcoded password' },
  { pattern: /api[_]?key\s*[:=]\s*['"`]([^'"`]{10,})['"`]/gi, type: 'api-key', description: 'API Key' },
  { pattern: /github[_]?token|gh[_]?token/gi, type: 'github-token', description: 'GitHub Token' },
  { pattern: /stripe[_]?key/gi, type: 'stripe-key', description: 'Stripe API Key' },
  { pattern: /mongod[b]?[_]?uri|mongodb[_]?url/gi, type: 'mongodb-uri', description: 'MongoDB URI' },
  { pattern: /private[_]?key|-----begin[_]?private[_]?key/gi, type: 'private-key', description: 'Private Key' },
  { pattern: /oauth[_]?token|bearer\s+[a-z0-9]{20,}/gi, type: 'oauth-token', description: 'OAuth Token' }
];

async function detectSecrets(projectPath) {
  const issues = [];

  try {
    const jsFiles = getAllFilesRecursive(projectPath);

    for (const file of jsFiles) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, lineNum) => {
          SECRET_PATTERNS.forEach(pattern => {
            if (pattern.pattern.test(line)) {
              issues.push({
                type: pattern.type,
                title: `Potential Secret Exposed: ${pattern.description}`,
                description: `Found pattern matching ${pattern.description} in code`,
                severity: 'critical',
                location: `${file}:${lineNum + 1}`,
                recommendation: 'Remove secret and store in environment variables'
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

function getAllFilesRecursive(dir, fileList = []) {
  const ignoreList = ['node_modules', '.git', 'dist', 'build', '.next', '.vscode', '.idea'];

  try {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
      if (ignoreList.includes(file)) return;

      const filePath = path.join(dir, file);
      try {
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          getAllFilesRecursive(filePath, fileList);
        } else if (!file.startsWith('.')) {
          fileList.push(filePath);
        }
      } catch (e) {
        // Skip if can't stat
      }
    });
  } catch (e) {
    // Ignore errors
  }

  return fileList;
}

module.exports = { detectSecrets };
