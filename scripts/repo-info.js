#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import boxen from 'boxen';
import Table from 'cli-table3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper to execute git commands
function gitCommand(command) {
  try {
    return execSync(command, { encoding: 'utf8', cwd: join(__dirname, '..') }).trim();
  } catch (error) {
    return null;
  }
}

// Helper to execute shell commands
function shellCommand(command) {
  try {
    return execSync(command, { encoding: 'utf8', cwd: join(__dirname, '..') }).trim();
  } catch (error) {
    return null;
  }
}

// Get repository information
function getRepoInfo() {
  const remoteUrl = gitCommand('git config --get remote.origin.url');
  const currentBranch = gitCommand('git branch --show-current');
  const allBranches = gitCommand('git branch -a');
  const totalCommits = gitCommand('git rev-list --count HEAD');
  const contributors = gitCommand("git log --all --format='%aN' | sort -u | wc -l");
  const contributorNames = gitCommand("git log --all --format='%aN' | sort -u");
  
  return {
    remoteUrl,
    currentBranch,
    allBranches: allBranches ? allBranches.split('\n').map(b => b.trim()) : [],
    totalCommits: parseInt(totalCommits) || 0,
    contributorCount: parseInt(contributors) || 0,
    contributors: contributorNames ? contributorNames.split('\n') : []
  };
}

// Get latest commit information
function getLatestCommit() {
  const hash = gitCommand('git log -1 --format=%h');
  const author = gitCommand('git log -1 --format=%aN');
  const date = gitCommand('git log -1 --format=%ar');
  const message = gitCommand('git log -1 --format=%s');
  
  return { hash, author, date, message };
}

// Get recent commits
function getRecentCommits(count = 7) {
  const commits = [];
  const log = gitCommand(`git log --oneline -${count}`);
  
  if (log) {
    log.split('\n').forEach(line => {
      const match = line.match(/^([a-f0-9]+)\s+(.+)$/);
      if (match) {
        commits.push({ hash: match[1], message: match[2] });
      }
    });
  }
  
  return commits;
}

// Get working tree status
function getWorkingTreeStatus() {
  const status = gitCommand('git status --short');
  const modified = status ? status.split('\n').filter(line => line.match(/^\s*M/)).length : 0;
  const untracked = status ? status.split('\n').filter(line => line.match(/^\?\?/)).length : 0;
  const staged = status ? status.split('\n').filter(line => line.match(/^[AMD]/)).length : 0;
  const isClean = !status || status.length === 0;
  
  return { modified, untracked, staged, isClean };
}

// Get package.json information
function getPackageInfo() {
  try {
    const packagePath = join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
    
    const scripts = Object.keys(packageJson.scripts || {});
    const dependencies = Object.keys(packageJson.dependencies || {}).length;
    const devDependencies = Object.keys(packageJson.devDependencies || {}).length;
    
    return {
      name: packageJson.name,
      version: packageJson.version,
      scripts,
      dependencies,
      devDependencies
    };
  } catch (error) {
    return null;
  }
}

// Get directory structure
function getDirectoryTree() {
  const tree = shellCommand("tree -L 2 -I 'node_modules|dist|.git' --dirsfirst 2>/dev/null");
  return tree || 'tree command not available';
}

// Display repository information
function displayRepoInfo(info) {
  const repoName = info.remoteUrl 
    ? info.remoteUrl.replace(/^.*[:/]([^/]+\/[^/]+?)(\.git)?$/, '$1')
    : 'Unknown';
  
  const content = [
    chalk.bold.cyan('Repository Information'),
    '',
    `${chalk.yellow('📦 Name:')} ${chalk.white(repoName)}`,
    `${chalk.yellow('🔗 Remote:')} ${chalk.white(info.remoteUrl || 'N/A')}`,
    `${chalk.yellow('🌿 Branch:')} ${chalk.green.bold(info.currentBranch || 'N/A')}`,
    '',
    chalk.dim('All branches:'),
    ...info.allBranches.slice(0, 5).map(b => chalk.dim(`  ${b}`))
  ].join('\n');
  
  console.log(boxen(content, {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'cyan'
  }));
}

// Display commit statistics
function displayCommitStats(info, latest, status) {
  const statusIcon = status.isClean ? chalk.green('✓ Clean') : chalk.yellow('⚠ Changes');
  
  const content = [
    chalk.bold.magenta('Git Statistics'),
    '',
    `${chalk.yellow('Total Commits:')} ${chalk.white(info.totalCommits)}`,
    `${chalk.yellow('Contributors:')} ${chalk.white(info.contributorCount)} ${chalk.dim(`(${info.contributors.join(', ')})`)}`,
    `${chalk.yellow('Status:')} ${statusIcon}`,
    '',
    chalk.dim(`Modified: ${status.modified} | Staged: ${status.staged} | Untracked: ${status.untracked}`),
    '',
    chalk.bold('Latest Commit:'),
    `${chalk.cyan(latest.hash)} ${chalk.dim(latest.date)}`,
    `${chalk.white(latest.message)}`,
    chalk.dim(`by ${latest.author}`)
  ].join('\n');
  
  console.log(boxen(content, {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'magenta'
  }));
}

// Display recent commits table
function displayRecentCommits(commits) {
  const table = new Table({
    head: [chalk.cyan('Hash'), chalk.cyan('Message')],
    colWidths: [10, 70],
    style: {
      head: [],
      border: ['dim']
    },
    wordWrap: true
  });
  
  commits.forEach(commit => {
    table.push([
      chalk.yellow(commit.hash),
      chalk.white(commit.message)
    ]);
  });
  
  console.log(chalk.bold.green('\nRecent Commits:'));
  console.log(table.toString());
}

// Display project information
function displayProjectInfo(pkg) {
  if (!pkg) {
    console.log(chalk.yellow('⚠ Could not read package.json'));
    return;
  }
  
  const content = [
    chalk.bold.green('Project Information'),
    '',
    `${chalk.yellow('Name:')} ${chalk.white(pkg.name)}`,
    `${chalk.yellow('Version:')} ${chalk.white(pkg.version)}`,
    `${chalk.yellow('Dependencies:')} ${chalk.white(pkg.dependencies)}`,
    `${chalk.yellow('Dev Dependencies:')} ${chalk.white(pkg.devDependencies)}`,
    '',
    chalk.bold('Available Scripts:'),
    ...pkg.scripts.slice(0, 8).map(s => chalk.dim(`  npm run ${s}`)),
    pkg.scripts.length > 8 ? chalk.dim(`  ... and ${pkg.scripts.length - 8} more`) : ''
  ].filter(Boolean).join('\n');
  
  console.log(boxen(content, {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'green'
  }));
}

// Display directory structure
function displayDirectoryTree(tree) {
  console.log(chalk.bold.blue('\nDirectory Structure:'));
  console.log(boxen(chalk.dim(tree), {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'blue'
  }));
}

// Main function
async function main() {
  console.clear();
  console.log(chalk.bold.white.bgBlue(' REPOSITORY STATS ') + '\n');
  
  const repoInfo = getRepoInfo();
  const latestCommit = getLatestCommit();
  const recentCommits = getRecentCommits(7);
  const status = getWorkingTreeStatus();
  const packageInfo = getPackageInfo();
  const directoryTree = getDirectoryTree();
  
  displayRepoInfo(repoInfo);
  displayCommitStats(repoInfo, latestCommit, status);
  displayRecentCommits(recentCommits);
  displayProjectInfo(packageInfo);
  displayDirectoryTree(directoryTree);
  
  console.log(chalk.dim('\n💡 Run this anytime with: npm run stats\n'));
}

main().catch(error => {
  console.error(chalk.red('Error:'), error.message);
  process.exit(1);
});
