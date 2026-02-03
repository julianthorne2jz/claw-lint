#!/usr/bin/env node
/**
 * claw-lint - Project health checker for AI agents
 * Validates a project is ready to ship (README, license, package.json, git, etc.)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const targetPath = args.find(a => !a.startsWith('-')) || '.';
const jsonOutput = args.includes('--json') || args.includes('-j');
const fixMode = args.includes('--fix') || args.includes('-f');
const strictMode = args.includes('--strict') || args.includes('-s');

if (args.includes('--help') || args.includes('-h')) {
  console.log(`claw-lint - Project health checker for AI agents

USAGE
  claw-lint [path] [options]

OPTIONS
  -j, --json     Output as JSON
  -f, --fix      Attempt to auto-fix issues
  -s, --strict   Fail on warnings too
  -h, --help     Show this help

CHECKS
  ✓ README.md exists and has content
  ✓ LICENSE file exists
  ✓ SKILL.md exists (for agents)
  ✓ package.json is valid (Node.js projects)
  ✓ Git repository is initialized
  ✓ No uncommitted changes (optional)
  ✓ Main entry point exists
  ✓ .gitignore exists

EXIT CODES
  0 = All checks pass
  1 = Errors found
  2 = Warnings found (strict mode)

EXAMPLES
  claw-lint                    # Check current directory
  claw-lint ./my-project       # Check specific path
  claw-lint --json             # JSON output
  claw-lint --fix              # Auto-fix what's possible`);
  process.exit(0);
}

const absPath = path.resolve(targetPath);
const results = { errors: [], warnings: [], passed: [], fixed: [] };

// Helper functions
function fileExists(filename) {
  return fs.existsSync(path.join(absPath, filename));
}

function readFile(filename) {
  try {
    return fs.readFileSync(path.join(absPath, filename), 'utf-8');
  } catch {
    return null;
  }
}

function writeFile(filename, content) {
  fs.writeFileSync(path.join(absPath, filename), content);
}

function runGit(cmd) {
  try {
    return execSync(`git ${cmd}`, { cwd: absPath, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

function addError(msg, fixable = false) {
  results.errors.push({ msg, fixable });
}

function addWarning(msg, fixable = false) {
  results.warnings.push({ msg, fixable });
}

function addPassed(msg) {
  results.passed.push(msg);
}

function addFixed(msg) {
  results.fixed.push(msg);
}

// Check: README.md
function checkReadme() {
  if (!fileExists('README.md')) {
    if (fixMode) {
      const pkgName = path.basename(absPath);
      const content = `# ${pkgName}\n\nA project.\n\n## Usage\n\nTODO: Add usage instructions\n\n## License\n\nMIT\n`;
      writeFile('README.md', content);
      addFixed('Created README.md template');
    } else {
      addError('README.md not found', true);
    }
    return;
  }
  
  const content = readFile('README.md');
  if (!content || content.trim().length < 50) {
    addWarning('README.md is too short (< 50 chars)');
  } else {
    addPassed('README.md exists with content');
  }
}

// Check: SKILL.md
function checkSkillMd() {
  if (!fileExists('SKILL.md')) {
    addWarning('SKILL.md not found (recommended for agent skills)');
    return;
  }
  
  const content = readFile('SKILL.md');
  if (!content || content.trim().length < 50) {
    addWarning('SKILL.md is too short (< 50 chars)');
  } else {
    addPassed('SKILL.md exists with content');
  }
}

// Check: LICENSE
function checkLicense() {
  const licenseFiles = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENCE'];
  const found = licenseFiles.some(f => fileExists(f));
  
  if (!found) {
    if (fixMode) {
      const year = new Date().getFullYear();
      const author = runGit('config user.name') || 'Author';
      const mit = `MIT License

Copyright (c) ${year} ${author}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
      writeFile('LICENSE', mit);
      addFixed('Created MIT LICENSE');
    } else {
      addError('No LICENSE file found', true);
    }
    return;
  }
  
  addPassed('LICENSE file exists');
}

// Check: Git
function checkGit() {
  if (!fileExists('.git')) {
    if (fixMode) {
      try {
        execSync('git init', { cwd: absPath, stdio: 'pipe' });
        addFixed('Initialized git repository');
      } catch {
        addError('Failed to initialize git');
      }
    } else {
      addError('Not a git repository', true);
    }
    return;
  }
  
  addPassed('Git repository initialized');
  
  // Check for uncommitted changes
  const status = runGit('status --porcelain');
  if (status && status.length > 0) {
    const lines = status.split('\n').length;
    addWarning(`${lines} uncommitted file(s)`);
  } else {
    addPassed('No uncommitted changes');
  }
  
  // Check for remote
  const remote = runGit('remote -v');
  if (!remote) {
    addWarning('No git remote configured');
  } else {
    addPassed('Git remote configured');
  }
}

// Check: .gitignore
function checkGitignore() {
  if (!fileExists('.gitignore')) {
    if (fixMode) {
      const content = `node_modules/
.env
.env.local
*.log
.DS_Store
dist/
build/
coverage/
`;
      writeFile('.gitignore', content);
      addFixed('Created .gitignore');
    } else {
      addWarning('.gitignore not found', true);
    }
    return;
  }
  
  addPassed('.gitignore exists');
}

// Check: package.json (if Node.js project)
function checkPackageJson() {
  if (!fileExists('package.json')) {
    // Not necessarily an error - might not be a Node project
    // Check for other project types
    if (fileExists('Cargo.toml')) {
      addPassed('Cargo.toml exists (Rust project)');
      return;
    }
    if (fileExists('go.mod')) {
      addPassed('go.mod exists (Go project)');
      return;
    }
    if (fileExists('requirements.txt') || fileExists('pyproject.toml')) {
      addPassed('Python project detected');
      return;
    }
    // If no package manager detected, just note it
    addWarning('No package manager file found');
    return;
  }
  
  try {
    const pkg = JSON.parse(readFile('package.json'));
    
    // Check required fields
    if (!pkg.name) addError('package.json missing "name"');
    else addPassed('package.json has name');
    
    if (!pkg.version) addError('package.json missing "version"');
    else addPassed('package.json has version');
    
    if (!pkg.description) addWarning('package.json missing "description"');
    else addPassed('package.json has description');
    
    // Check keywords (crucial for discoverability)
    if (!pkg.keywords || !Array.isArray(pkg.keywords) || pkg.keywords.length === 0) {
      addWarning('package.json missing "keywords"');
    } else {
      addPassed(`package.json has ${pkg.keywords.length} keywords`);
    }

    // Check author
    if (!pkg.author) addWarning('package.json missing "author"');
    else addPassed('package.json has author');
    
    // Check main entry exists
    const main = pkg.main || 'index.js';
    if (!fileExists(main)) {
      addError(`Main entry "${main}" not found`);
    } else {
      addPassed(`Main entry "${main}" exists`);
    }
    
    // Check for bin (CLI tools)
    if (pkg.bin) {
      const bins = typeof pkg.bin === 'string' ? { [pkg.name]: pkg.bin } : pkg.bin;
      for (const [name, binPath] of Object.entries(bins)) {
        if (!fileExists(binPath)) {
          addError(`Binary "${name}" at "${binPath}" not found`);
        } else {
          try {
            // Check executable permissions (Unix only)
            if (process.platform !== 'win32') {
              const stat = fs.statSync(path.join(absPath, binPath));
              if (!(stat.mode & 0o111)) {
                 addWarning(`Binary "${name}" is not executable (chmod +x)`);
              }
            }
            
            // Check shebang
            const content = readFile(binPath);
            if (content && !content.startsWith('#!')) {
               addWarning(`Binary "${name}" missing shebang (#!/usr/bin/env node)`);
            } else {
               addPassed(`Binary "${name}" is valid (exists + shebang)`);
            }
          } catch (e) {
             addPassed(`Binary "${name}" exists`);
          }
        }
      }
    }
    
    // Check for scripts
    if (!pkg.scripts || Object.keys(pkg.scripts).length === 0) {
      addWarning('No npm scripts defined');
    }
    
  } catch (e) {
    addError('package.json is invalid JSON');
  }
}

// Check: Entry point
function checkEntryPoint() {
  const entryFiles = ['index.js', 'main.js', 'cli.js', 'index.ts', 'main.ts', 'src/index.js', 'src/main.js'];
  
  // Skip if already checked in package.json
  if (fileExists('package.json')) return;
  
  const found = entryFiles.some(f => fileExists(f));
  if (!found) {
    // Check for shell scripts
    const files = fs.readdirSync(absPath);
    const shellScripts = files.filter(f => f.endsWith('.sh'));
    if (shellScripts.length > 0) {
      addPassed(`Shell script(s) found: ${shellScripts.join(', ')}`);
      return;
    }
    
    addWarning('No obvious entry point found');
  }
}

// Run all checks
function runChecks() {
  if (!fs.existsSync(absPath)) {
    console.error(`Error: Path "${absPath}" does not exist`);
    process.exit(1);
  }
  
  checkReadme();
  checkLicense();
  checkSkillMd();
  checkGit();
  checkGitignore();
  checkPackageJson();
  checkEntryPoint();
}

// Output results
function outputResults() {
  const hasErrors = results.errors.length > 0;
  const hasWarnings = results.warnings.length > 0;
  const hasFixed = results.fixed.length > 0;
  
  if (jsonOutput) {
    console.log(JSON.stringify({
      path: absPath,
      passed: results.passed.length,
      errors: results.errors.map(e => e.msg),
      warnings: results.warnings.map(w => w.msg),
      fixed: results.fixed,
      status: hasErrors ? 'error' : (hasWarnings && strictMode ? 'warning' : 'ok')
    }, null, 2));
  } else {
    console.log(`\n📋 Project Health: ${path.basename(absPath)}\n`);
    console.log(`   Path: ${absPath}\n`);
    
    if (results.passed.length > 0) {
      console.log('✅ Passed:');
      results.passed.forEach(p => console.log(`   • ${p}`));
      console.log('');
    }
    
    if (hasFixed) {
      console.log('🔧 Fixed:');
      results.fixed.forEach(f => console.log(`   • ${f}`));
      console.log('');
    }
    
    if (hasWarnings) {
      console.log('⚠️  Warnings:');
      results.warnings.forEach(w => console.log(`   • ${w.msg}${w.fixable ? ' (fixable)' : ''}`));
      console.log('');
    }
    
    if (hasErrors) {
      console.log('❌ Errors:');
      results.errors.forEach(e => console.log(`   • ${e.msg}${e.fixable ? ' (fixable)' : ''}`));
      console.log('');
    }
    
    // Summary
    const total = results.passed.length + results.errors.length + results.warnings.length;
    const emoji = hasErrors ? '🔴' : (hasWarnings ? '🟡' : '🟢');
    console.log(`${emoji} ${results.passed.length}/${total} checks passed`);
    
    if (hasErrors || (hasWarnings && fixMode)) {
      console.log('\n💡 Tip: Run with --fix to auto-fix issues');
    }
  }
  
  // Exit code
  if (hasErrors) process.exit(1);
  if (hasWarnings && strictMode) process.exit(2);
  process.exit(0);
}

// Main
runChecks();
outputResults();
