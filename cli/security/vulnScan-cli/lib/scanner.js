const fs = require('fs-extra');
const path = require('path');
const { performNpmAudit } = require('./checks/npm-audit');
const { performCodeAnalysis } = require('./checks/code-analysis');
const { checkEnvironmentFiles } = require('./checks/env-check');
const { detectSecrets } = require('./checks/secrets-detection');

async function scanProject(config) {
  const results = {
    projectPath: config.path,
    timestamp: new Date().toISOString(),
    checks: config.checks,
    issues: [],
    summary: {
      filesScanned: 0,
      issuesFound: 0,
      severity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      }
    }
  };

  try {
    // Check if project path exists
    if (!fs.existsSync(config.path)) {
      throw new Error(`Project path does not exist: ${config.path}`);
    }

    // Run NPM Audit
    if (config.checks.npm) {
      const npmIssues = await performNpmAudit(config.path);
      results.issues.push(...npmIssues);
    }

    // Run Code Analysis
    if (config.checks.code) {
      const codeIssues = await performCodeAnalysis(config.path);
      results.issues.push(...codeIssues);
    }

    // Check Environment Files
    if (config.checks.env) {
      const envIssues = await checkEnvironmentFiles(config.path);
      results.issues.push(...envIssues);
    }

    // Detect Secrets
    if (config.checks.secrets) {
      const secretIssues = await detectSecrets(config.path);
      results.issues.push(...secretIssues);
    }

    // Calculate summary
    results.summary.issuesFound = results.issues.length;
    results.issues.forEach(issue => {
      results.summary.severity[issue.severity]++;
    });

    // Sort issues by severity
    const severityMap = { critical: 0, high: 1, medium: 2, low: 3 };
    results.issues.sort((a, b) => severityMap[a.severity] - severityMap[b.severity]);

  } catch (error) {
    results.errors = [error.message];
  }

  return results;
}

module.exports = { scanProject };
