# Repository Stats Script

A comprehensive Node.js tool to visualize GitHub repository information including commits, branches, working tree status, and project structure.

## Features

- Repository information (name, remote URL, branches)
- Git statistics (total commits, contributors)
- Working tree status (modified, staged, untracked files)
- Latest and recent commits
- Project information from package.json
- Directory structure visualization

## Installation

The script is already installed with the following dev dependencies:
- `chalk` - Terminal colors
- `boxen` - Bordered boxes
- `cli-table3` - Formatted tables

## Usage

### Method 1: NPM Script (Colorful Terminal Output)

Run the script directly in your terminal for a beautifully formatted, colorful display:

```bash
npm run stats
```

This displays:
- Color-coded sections with borders
- Tables for recent commits
- Directory tree structure
- All information in an easy-to-read format

### Method 2: OpenCode Slash Command

Use the slash command in OpenCode to run the stats script and get formatted output:

```
/repo-stats
```

**Aliases available:**
- `/repo`
- `/git-stats`

This command:
- Runs `npm run stats` automatically
- Shows the colorful terminal output in OpenCode
- Displays all repository statistics
- Works seamlessly within OpenCode's interface

## What Information is Displayed?

### Repository Information
- Repository name and remote URL
- Current branch (highlighted)
- All available branches
- Total commits
- Contributor count and names

### Working Tree Status
- Clean or dirty status
- Number of modified files
- Number of staged files
- Number of untracked files

### Latest Commit
- Commit hash
- Author name
- Time ago
- Commit message

### Recent Commits
- Last 7 commits in a formatted table
- Hash and message for each commit

### Project Information
- Package name and version
- Number of dependencies
- Number of dev dependencies
- All available npm scripts

### Directory Structure
- Tree view (2 levels deep)
- Excludes node_modules, dist, .git
- Shows file and directory counts

## Files

- `scripts/repo-info.js` - Main script for terminal use
- `.opencode/commands/repo-stats.md` - OpenCode slash command configuration
- `.opencode/commands/repo.md` - Alias for /repo command
- `.opencode/commands/git-stats.md` - Alias for /git-stats command

## Examples

### Terminal Output (npm run stats)
```
 REPOSITORY STATS 

╭────────────────────────────────────────────╮
│   Repository Information                   │
│   📦 Name: vkv21/commitspace-fe            │
│   🔗 Remote: github.com/...                │
│   🌿 Branch: presence-detect               │
╰────────────────────────────────────────────╯
...
```

### OpenCode Output (/repo-stats)

The OpenCode command runs `npm run stats` and displays the same colorful terminal output shown above, integrated into the OpenCode interface.

## Customization

To modify what information is displayed or how it's formatted:

1. **For terminal output:** Edit `scripts/repo-info.js`
2. **For OpenCode command prompt:** Edit `.opencode/commands/repo-stats.md` (and aliases)

## Requirements

- Node.js (ES modules support)
- Git repository
- npm packages: chalk, boxen, cli-table3 (already installed)
- Optional: `tree` command for directory visualization (falls back gracefully if not available)

## Notes

- OpenCode commands run `npm run stats` using shell command injection (!`command`)
- Terminal version uses colors and boxes for visual appeal
- Scripts are safe to run anytime - they only read information, never modify the repository
- Commands are defined as markdown files with frontmatter in `.opencode/commands/`
