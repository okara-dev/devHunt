const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

async function performNpmAudit(projectPath) {
  const issues = [];

  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return issues;
    }

    try {
      const output = execSync('npm audit --json', {
        cwd: projectPath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore']
      });

      const auditData = JSON.parse(output);

      // Process vulnerabilities
      if (auditData.vulnerabilities) {
        Object.entries(auditData.vulnerabilities).forEach(([packageName, vuln]) => {
          if (vuln.severity) {
            issues.push({
              type: 'npm-vulnerability',
              title: `NPM Dependency Vulnerability: ${packageName}`,
              description: `Package "${packageName}" has a known vulnerability`,
              severity: mapSeverity(vuln.severity),
              location: `package.json - ${packageName}`,
              recommendation: `Update to a patched version or review advisories`
            });
          }
        });
      }
    } catch (e) {
      // npm audit might fail if no vulnerabilities, which is fine
      if (e.stdout) {
        try {
          const auditData = JSON.parse(e.stdout);
          if (auditData.vulnerabilities) {
            Object.entries(auditData.vulnerabilities).forEach(([packageName, vuln]) => {
              if (vuln.severity) {
                issues.push({
                  type: 'npm-vulnerability',
                  title: `NPM Dependency Vulnerability: ${packageName}`,
                  description: vuln.via ? vuln.via[0]?.title || 'Known vulnerability' : 'Known vulnerability',
                  severity: mapSeverity(vuln.severity),
                  location: `package.json - ${packageName}`,
                  recommendation: `Update to version ${vuln.to || 'latest'} or higher`
                });
              }
            });
          }
        } catch (parseError) {
          // Ignore parse errors
        }
      }
    }
  } catch (error) {
    // Silently fail if npm is not available or other errors
  }

  return issues;
}

function mapSeverity(severity) {
  const map = {
    critical: 'critical',
    high: 'high',
    moderate: 'medium',
    medium: 'medium',
    low: 'low'
  };
  return map[severity.toLowerCase()] || 'medium';
}

module.exports = { performNpmAudit };
