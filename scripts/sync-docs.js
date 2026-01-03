const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPOS_CONFIG = path.join(__dirname, '..', 'repos.json');
const DOCS_DIR = path.join(__dirname, '..', 'content', 'docs');
const TEMP_DIR = '/tmp/repos-sync';

// Create temporary directory for cloning
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Read repositories configuration
if (!fs.existsSync(REPOS_CONFIG)) {
  console.error(`❌ Configuration file not found: ${REPOS_CONFIG}`);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(REPOS_CONFIG, 'utf8'));

if (!config.repositories || !Array.isArray(config.repositories)) {
  console.error('❌ Invalid configuration format: expected repositories array');
  process.exit(1);
}

console.log(`📚 Found ${config.repositories.length} repositories to sync\n`);

// Function to clone repository with token
function cloneRepo(repo) {
  const repoName = repo.name;
  const repoUrl = repo.url;
  const docsPath = repo.docs_path || 'docs';
  const tempRepoPath = path.join(TEMP_DIR, repoName);
  
  // Remove old directory if exists
  if (fs.existsSync(tempRepoPath)) {
    fs.rmSync(tempRepoPath, { recursive: true, force: true });
  }

  try {
    console.log(`🔄 Cloning ${repoName}...`);
    
    // Replace URL to use token
    const urlWithToken = repoUrl.replace(
      'https://github.com/',
      `https://x-access-token:${GITHUB_TOKEN}@github.com/`
    );
    
    // Clone repository (shallow clone for speed)
    execSync(
      `git clone --depth 1 --quiet "${urlWithToken}" "${tempRepoPath}"`,
      { stdio: 'inherit' }
    );
    
    const sourceDocsPath = path.join(tempRepoPath, docsPath);
    const targetDocsPath = path.join(DOCS_DIR, repoName);
    
    if (!fs.existsSync(sourceDocsPath)) {
      console.log(`⚠️  Folder ${docsPath} not found in ${repoName}, skipping`);
      return false;
    }
    
    // Create target directory
    if (fs.existsSync(targetDocsPath)) {
      fs.rmSync(targetDocsPath, { recursive: true, force: true });
    }
    fs.mkdirSync(targetDocsPath, { recursive: true });
    
    // Copy documentation
    console.log(`📋 Copying documentation from ${repoName}...`);
    execSync(`cp -r "${sourceDocsPath}"/* "${targetDocsPath}/"`, { stdio: 'inherit' });
    
    // Create _index.md file with repository metadata
    const indexContent = `---
title: "${repo.display_name || repoName}"
description: "${repo.description || ''}"
weight: 1
---
`;
    fs.writeFileSync(path.join(targetDocsPath, '_index.md'), indexContent);
    
    console.log(`✅ Successfully synced ${repoName}\n`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error syncing ${repoName}:`, error.message);
    return false;
  } finally {
    // Clean up temporary directory
    if (fs.existsSync(tempRepoPath)) {
      fs.rmSync(tempRepoPath, { recursive: true, force: true });
    }
  }
}

// Check for token
if (!GITHUB_TOKEN) {
  console.error('❌ GITHUB_TOKEN is not set in environment variables');
  process.exit(1);
}

// Sync each repository
let successCount = 0;
let failCount = 0;

config.repositories.forEach(repo => {
  if (cloneRepo(repo)) {
    successCount++;
  } else {
    failCount++;
  }
});

console.log('\n📊 Sync summary:');
console.log(`   ✅ Success: ${successCount}`);
console.log(`   ❌ Errors: ${failCount}`);

if (failCount > 0 && successCount === 0) {
  console.error('\n❌ Failed to sync any repository');
  process.exit(1);
}

console.log('\n✨ Sync completed!');

