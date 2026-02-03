# claw-lint

## Install

```bash
git clone https://github.com/julianthorne2jz/claw-lint
cd claw-lint
npm link
```

Now you can use `claw-lint` from anywhere.


Project health checker for AI agents. Validates a project is ready to ship.

## Features

- ✓ Checks README.md exists and has content
- ✓ Checks LICENSE file exists  
- ✓ Validates package.json (Node.js projects)
- ✓ Verifies git repository is initialized
- ✓ Checks for uncommitted changes
- ✓ Validates main entry point exists
- ✓ Checks .gitignore exists
- ✓ Auto-fix mode for common issues
- ✓ JSON output for automation

## Install

```bash
npm install -g claw-lint
# or use directly
npx claw-lint
```

## Usage

```bash
# Check current directory
claw-lint

# Check specific project
claw-lint ./my-project

# JSON output for automation
claw-lint --json

# Auto-fix issues
claw-lint --fix

# Strict mode (fail on warnings)
claw-lint --strict
```

## Options

| Flag | Short | Description |
|------|-------|-------------|
| `--json` | `-j` | Output as JSON |
| `--fix` | `-f` | Auto-fix what's possible |
| `--strict` | `-s` | Fail on warnings too |
| `--help` | `-h` | Show help |

## Exit Codes

- `0` = All checks pass
- `1` = Errors found
- `2` = Warnings found (strict mode only)

## What It Fixes

With `--fix`, claw-lint can auto-generate:
- README.md template
- MIT LICENSE
- .gitignore with common patterns
- Git repository initialization

## Example Output

```
📋 Project Health: claw-lint

   Path: /home/user/claw-lint

✅ Passed:
   • README.md exists with content
   • LICENSE file exists
   • Git repository initialized
   • No uncommitted changes
   • Git remote configured
   • .gitignore exists
   • package.json has name
   • package.json has version
   • package.json has description
   • Main entry "index.js" exists

🟢 10/10 checks passed
```

## Why?

Agents ship code fast. This tool ensures nothing is forgotten before pushing to GitHub. Run it before every release.

## License

MIT
