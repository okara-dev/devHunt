#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const inquirer = require('inquirer');
const { scanProject } = require('../lib/scanner');
const path = require('path');

program
  .version('1.0.0')
  .description('Security vulnerability scanner for projects')
  .option('-p, --path <path>', 'Path to project', './')
  .option('-i, --interactive', 'Interactive mode')
  .option('-f, --format <format>', 'Output format: json, table, html', 'table')
  .option('-o, --output <path>', 'Output file for report')
  .option('--npm', 'Scan NPM dependencies')
  .option('--code', 'Scan code for vulnerabilities')
  .option('--env', 'Check for exposed environment files')
  .option('--secrets', 'Scan for exposed secrets')
  .option('--all', 'Run all checks')
  .parse(process.argv);

async function main() {
  try {
    const options = program.opts();
    
    console.log(chalk.blue.bold('\n🔒 Security Vulnerability Scanner\n'));
    
    let config = {
      path: path.resolve(options.path),
      format: options.format,
      output: options.output,
      checks: {
        npm: options.npm || options.all || false,
        code: options.code || options.all || false,
        env: options.env || options.all || false,
        secrets: options.secrets || options.all || false
      }
    };

    // If no specific checks selected, run all by default
    if (!options.npm && !options.code && !options.env && !options.secrets && !options.all) {
      config.checks = {
        npm: true,
        code: true,
        env: true,
        secrets: true
      };
    }

    if (options.interactive) {
      const answers = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'checks',
          message: 'Select security checks to run:',
          choices: [
            { name: 'NPM Dependencies Audit', value: 'npm', checked: true },
            { name: 'Code Analysis', value: 'code', checked: true },
            { name: 'Environment Files Check', value: 'env', checked: true },
            { name: 'Secrets Detection', value: 'secrets', checked: true }
          ]
        }
      ]);

      config.checks = {
        npm: answers.checks.includes('npm'),
        code: answers.checks.includes('code'),
        env: answers.checks.includes('env'),
        secrets: answers.checks.includes('secrets')
      };
    }

    console.log(chalk.cyan(`Scanning project at: ${config.path}\n`));
    const results = await scanProject(config);
    
    displayResults(results, config);
    
  } catch (error) {
    console.error(chalk.red('❌ Error:'), error.message);
    process.exit(1);
  }
}

function displayResults(results, config) {
  const totalIssues = results.issues.length;
  const critical = results.issues.filter(i => i.severity === 'critical').length;
  const high = results.issues.filter(i => i.severity === 'high').length;
  const medium = results.issues.filter(i => i.severity === 'medium').length;
  const low = results.issues.filter(i => i.severity === 'low').length;

  console.log(chalk.bold('\n📊 Scan Results:\n'));
  console.log(chalk.yellow(`Total Issues: ${totalIssues}`));
  if (critical > 0) console.log(chalk.red(`  🔴 Critical: ${critical}`));
  if (high > 0) console.log(chalk.red(`  🟠 High: ${high}`));
  if (medium > 0) console.log(chalk.yellow(`  🟡 Medium: ${medium}`));
  if (low > 0) console.log(chalk.blue(`  🔵 Low: ${low}`));

  if (results.issues.length > 0) {
    console.log(chalk.bold('\n🔍 Issues Found:\n'));
    results.issues.forEach((issue, idx) => {
      const icon = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🔵'
      }[issue.severity];

      console.log(`${icon} [${issue.severity.toUpperCase()}] ${issue.title}`);
      console.log(`   Type: ${issue.type}`);
      console.log(`   Description: ${issue.description}`);
      if (issue.location) console.log(`   Location: ${issue.location}`);
      if (issue.recommendation) console.log(`   Recommendation: ${issue.recommendation}`);
      console.log();
    });
  } else {
    console.log(chalk.green('\n✅ No vulnerabilities found!\n'));
  }

  if (config.output) {
    require('fs').writeFileSync(config.output, JSON.stringify(results, null, 2));
    console.log(chalk.green(`\n✅ Report saved to: ${config.output}`));
  }
}

main();
