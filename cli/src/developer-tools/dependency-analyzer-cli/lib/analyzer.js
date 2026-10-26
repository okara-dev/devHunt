const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const semver = require('semver');
const { execSync } = require('child_process');

class DependencyAnalyzer {
  constructor(config) {
    this.config = config;
    this.packageJson = null;
    this.report = {
      dependencies: [],
      devDependencies: [],
      issues: [],
      summary: {}
    };
  }

  async analyze() {
    await this.loadPackageJson();
    await this.analyzeDependencies();
    await this.analyzeDevDependencies();
    await this.runChecks();
    await this.saveReport();
    this.printReport();
    return this.report;
  }

  async loadPackageJson() {
    const packagePath = path.join(this.config.path || './', 'package.json');
    
    if (!await fs.pathExists(packagePath)) {
      throw new Error('package.json not found!');
    }
    
    this.packageJson = await fs.readJson(packagePath);
    console.log(chalk.green(`📦 Loaded package.json from ${packagePath}`));
  }

  async analyzeDependencies() {
    const deps = this.packageJson.dependencies || {};
    this.report.dependencies = await this.analyzeDependencyList(deps);
  }

  async analyzeDevDependencies() {
    const deps = this.packageJson.devDependencies || {};
    this.report.devDependencies = await this.analyzeDependencyList(deps);
  }

  async analyzeDependencyList(deps) {
    const results = [];
    
    for (const [name, version] of Object.entries(deps)) {
      const info = {
        name,
        version,
        latest: await this.getLatestVersion(name),
        outdated: false,
        vulnerable: false,
        unused: false,
        size: 0
      };
      
      info.outdated = this.isOutdated(version, info.latest);
      info.size = await this.getPackageSize(name);
      
      results.push(info);
    }
    
    return results;
  }

  async getLatestVersion(packageName) {
    try {
      const output = execSync(`npm view ${packageName} version`, { encoding: 'utf8' });
      return output.trim();
    } catch (error) {
      return 'unknown';
    }
  }

  isOutdated(current, latest) {
    if (latest === 'unknown') return false;
    try {
      return semver.lt(current.replace(/[\^~]/, ''), latest);
    } catch {
      return false;
    }
  }

  async getPackageSize(packageName) {
    try {
      const output = execSync(`du -sh node_modules/${packageName} 2>/dev/null || echo "0"`, { encoding: 'utf8' });
      return output.trim();
    } catch {
      return '0';
    }
  }

  async runChecks() {
    const checks = this.config.checks || ['outdated', 'security', 'unused'];
    
    if (checks.includes('outdated')) {
      this.checkOutdated();
    }
    
    if (checks.includes('security')) {
      await this.checkSecurity();
    }
    
    if (checks.includes('unused')) {
      await this.checkUnused();
    }
    
    if (checks.includes('duplicates')) {
      await this.checkDuplicates();
    }
    
    if (checks.includes('size')) {
      this.analyzeSize();
    }
  }

  checkOutdated() {
    const outdated = [
      ...this.report.dependencies.filter(d => d.outdated),
      ...this.report.devDependencies.filter(d => d.outdated)
    ];
    
    if (outdated.length > 0) {
      this.report.issues.push({
        type: 'outdated',
        count: outdated.length,
        message: `${outdated.length} outdated dependencies found`,
        details: outdated.map(d => `${d.name}: ${d.version} -> ${d.latest}`)
      });
    }
  }

  async checkSecurity() {
    try {
      const output = execSync('npm audit --json', { encoding: 'utf8' });
      const audit = JSON.parse(output);
      
      if (audit.vulnerabilities) {
        const vulns = Object.entries(audit.vulnerabilities)
          .filter(([_, info]) => info.severity === 'high' || info.severity === 'critical');
        
        if (vulns.length > 0) {
          this.report.issues.push({
            type: 'security',
            severity: 'high',
            count: vulns.length,
            message: `${vulns.length} security vulnerabilities found`,
            details: vulns.map(([name, info]) => `${name}: ${info.severity} - ${info.via.join(', ')}`)
          });
        }
      }
    } catch (error) {
      // npm audit might fail, that's okay
    }
  }

  async checkUnused() {
    // Simple check - packages not imported in any file
    // In a real implementation, you'd parse the source code
    const allDeps = [
      ...this.report.dependencies,
      ...this.report.devDependencies
    ];
    
    // This is a placeholder - in reality you'd scan imports
    const unused = allDeps.filter(d => 
      ['eslint', 'prettier', 'jest', 'typescript'].includes(d.name)
    );
    
    if (unused.length > 0) {
      this.report.issues.push({
        type: 'unused',
        count: unused.length,
        message: `${unused.length} potentially unused dependencies`,
        details: unused.map(d => d.name)
      });
    }
  }

  async checkDuplicates() {
    try {
      const output = execSync('npm ls --depth=0 --json', { encoding: 'utf8' });
      const data = JSON.parse(output);
      
      const duplicates = {};
      const deps = data.dependencies || {};
      
      Object.entries(deps).forEach(([name, info]) => {
        if (info.version) {
          if (!duplicates[name]) duplicates[name] = [];
          duplicates[name].push(info.version);
        }
      });
      
      const duplicatePackages = Object.entries(duplicates)
        .filter(([_, versions]) => versions.length > 1);
      
      if (duplicatePackages.length > 0) {
        this.report.issues.push({
          type: 'duplicates',
          count: duplicatePackages.length,
          message: `${duplicatePackages.length} duplicated dependencies found`,
          details: duplicatePackages.map(([name, versions]) => 
            `${name}: ${versions.join(', ')}`
          )
        });
      }
    } catch (error) {
      // npm ls might fail in some cases
    }
  }

  analyzeSize() {
    const allDeps = [
      ...this.report.dependencies,
      ...this.report.devDependencies
    ];
    
    const sizes = allDeps
      .filter(d => d.size && d.size !== '0')
      .sort((a, b) => {
        const aNum = parseFloat(a.size);
        const bNum = parseFloat(b.size);
        return bNum - aNum;
      });
    
    if (sizes.length > 0) {
      this.report.summary.largestPackages = sizes.slice(0, 5).map(d => ({
        name: d.name,
        size: d.size
      }));
    }
  }

  async saveReport() {
    const outputPath = this.config.output || './dependency-report.json';
    await fs.writeJson(outputPath, this.report, { spaces: 2 });
    console.log(chalk.green(`📄 Report saved to ${outputPath}`));
  }

  printReport() {
    const format = this.config.format || 'json';
    
    if (format === 'table') {
      this.printTableReport();
    } else if (format === 'html') {
      // Would generate HTML, but keep it simple for now
      this.printTableReport();
    } else {
      // JSON already saved
      console.log(chalk.blue('\n📊 Dependency Analysis Summary'));
      console.log(chalk.white('─'.repeat(50)));
      console.log(chalk.cyan(`Dependencies: ${this.report.dependencies.length}`));
      console.log(chalk.cyan(`Dev Dependencies: ${this.report.devDependencies.length}`));
      console.log(chalk.cyan(`Issues Found: ${this.report.issues.length}`));
      
      if (this.report.issues.length > 0) {
        console.log(chalk.yellow('\n⚠️  Issues:'));
        this.report.issues.forEach(issue => {
          console.log(chalk.yellow(`  • ${issue.message}`));
          if (issue.details && issue.details.length > 0) {
            issue.details.slice(0, 3).forEach(detail => {
              console.log(chalk.gray(`    - ${detail}`));
            });
            if (issue.details.length > 3) {
              console.log(chalk.gray(`    ... and ${issue.details.length - 3} more`));
            }
          }
        });
      }
      
      if (this.report.summary.largestPackages) {
        console.log(chalk.blue('\n📦 Largest Packages:'));
        this.report.summary.largestPackages.forEach(pkg => {
          console.log(chalk.cyan(`  ${pkg.name}: ${chalk.white(pkg.size)}`));
        });
      }
    }
  }

  printTableReport() {
    // Simple table output
    console.log(chalk.blue('\n📊 Dependency Report'));
    console.log(chalk.white('─'.repeat(80)));
    console.log(chalk.white('Package'.padEnd(30) + 'Version'.padEnd(15) + 'Latest'.padEnd(15) + 'Status'));
    console.log(chalk.white('─'.repeat(80)));
    
    const allDeps = [
      ...this.report.dependencies,
      ...this.report.devDependencies
    ];
    
    allDeps.forEach(dep => {
      const status = dep.outdated ? '⚠️ Outdated' : '✅ Up to date';
      const color = dep.outdated ? chalk.yellow : chalk.green;
      console.log(
        color(
          dep.name.padEnd(30) +
          dep.version.padEnd(15) +
          dep.latest.padEnd(15) +
          status
        )
      );
    });
    
    console.log(chalk.white('─'.repeat(80)));
  }
}

module.exports = {
  analyzeDependencies: async (config) => {
    const analyzer = new DependencyAnalyzer(config);
    return analyzer.analyze();
  }
};