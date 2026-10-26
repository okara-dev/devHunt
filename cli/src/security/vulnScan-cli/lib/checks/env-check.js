const fs = require('fs-extra');
const path = require('path');

const SENSITIVE_FILES = [
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  '.env.test',
  '.aws',
  '.ssh',
  '.docker/config.json',
  'credentials',
  'secrets.json',
  'private.key',
  '.pem'
];

async function checkEnvironmentFiles(projectPath) {
  const issues = [];

  try {
    const fileList = fs.readdirSync(projectPath);

    fileList.forEach(file => {
      // Check for .env files
      if (file.startsWith('.env') && !file.includes('.example') && !file.includes('.template')) {
        issues.push({
          type: 'env-file-exposed',
          title: 'Exposed Environment File',
          description: `Environment file "${file}" is not in .gitignore and may contain sensitive data`,
          severity: 'high',
          location: file,
          recommendation: 'Add to .gitignore and ensure no sensitive data is committed'
        });
      }

      // Check for sensitive files
      if (SENSITIVE_FILES.includes(file)) {
        issues.push({
          type: 'sensitive-file-exposed',
          title: `Sensitive File Found: ${file}`,
          description: `Sensitive file "${file}" should not be in the repository`,
          severity: 'critical',
          location: file,
          recommendation: 'Remove and add to .gitignore'
        });
      }
    });
  } catch (error) {
    // Silently fail
  }

  return issues;
}

module.exports = { checkEnvironmentFiles };
