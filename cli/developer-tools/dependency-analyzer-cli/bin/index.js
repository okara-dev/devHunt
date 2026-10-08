#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const inquirer = require('inquirer');
const { analyzeDependencies } = require('../lib/analyzer');

program
  .version('1.0.0')
  .description('Analyze and report on project dependencies')
  .option('-i, --interactive', 'Interactive mode')
  .option('-p, --path <path>', 'Path to package.json', './')
  .option('-o, --output <path>', 'Output file for report', './dependency-report.json')
  .option('-f, --format <format>', 'Output format: json, table, html', 'json')
  .parse(process.argv);

async function main() {
  try {
    const options = program.opts();
    let config = {
      path: options.path,
      output: options.output,
      format: options.format
    };

    if (options.interactive || !process.argv.slice(2).length) {
      config = await interactiveSetup(config);
    }

    await analyzeDependencies(config);
    console.log(chalk.green('✅ Dependency analysis completed!'));
  } catch (error) {
    console.error(chalk.red('❌ Error:', error.message));
    process.exit(1);
  }
}

async function interactiveSetup(config) {
  const questions = [
    {
      type: 'input',
      name: 'path',
      message: '📁 Path to package.json:',
      default: './'
    },
    {
      type: 'list',
      name: 'format',
      message: '📊 Output format:',
      choices: ['json', 'table', 'html']
    },
    {
      type: 'checkbox',
      name: 'checks',
      message: 'Select checks to perform:',
      choices: [
        { name: '🔍 Outdated dependencies', value: 'outdated' },
        { name: '🔒 Security vulnerabilities', value: 'security' },
        { name: '📦 Unused dependencies', value: 'unused' },
        { name: '🔄 Dependency duplicates', value: 'duplicates' },
        { name: '📊 Package size analysis', value: 'size' }
      ],
      default: ['outdated', 'security', 'unused']
    },
    {
      type: 'confirm',
      name: 'showTree',
      message: 'Show dependency tree?',
      default: false
    }
  ];

  return { ...config, ...await inquirer.prompt(questions) };
}

main();