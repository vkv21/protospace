# OpenCode Slash Commands Setup

## Commands Created

I've set up OpenCode slash commands for your repository stats script. These commands are now available:

### Available Commands

1. `/repo-stats` - Full command name
2. `/repo` - Short alias  
3. `/git-stats` - Alternative alias

All three commands do the same thing - they run your `npm run stats` script and display the repository information.

## How It Works

OpenCode commands are defined as **markdown files** in the `.opencode/commands/` directory.

Each command file has:
- **Frontmatter** (YAML between `---`) - Configuration
- **Content** - The prompt/instructions for OpenCode

Example structure:
```markdown
---
description: Display comprehensive repository information
agent: build
---

Your instructions here...
!`npm run stats`
```

## Special Syntax

- **!`command`** - Runs a shell command and injects its output into the prompt
- **$ARGUMENTS** - Passes arguments from the command
- **@filename** - References files from your project

## Using the Commands

### In OpenCode TUI:

1. Type `/repo-stats` (or `/repo` or `/git-stats`)
2. Press Enter
3. OpenCode will run `npm run stats` and show you the output

### In Terminal:

You can still use the npm script directly:
```bash
npm run stats
```

## Files Created

```
.opencode/
└── commands/
    ├── repo-stats.md  (main command)
    ├── repo.md        (alias)
    └── git-stats.md   (alias)
```

## Why It Works Now

The issue before was that I created JSON + JS files, but OpenCode uses **markdown files with frontmatter** for custom commands. The correct format is:

- ✅ `.opencode/commands/command-name.md` 
- ❌ `.opencode/commands/command-name.json` + `.js`

## Testing

Try typing `/repo-stats` in your OpenCode chat right now! It should:
1. Appear in the autocomplete when you type `/`
2. Execute `npm run stats` when you run it
3. Display the colorful repository statistics

## Documentation

For more info on OpenCode commands, see:
https://opencode.ai/docs/commands
