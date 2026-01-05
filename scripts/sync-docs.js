const fs = require('fs');
const { spawnSync } = require('child_process');
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

// Function to ensure markdown file has title in front matter
function ensureTitleInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if file has front matter
    const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontMatterRegex);
    
    // Helper function to extract title from content
    const extractTitle = (bodyContent) => {
      // Try to extract from first heading
      const headingMatch = bodyContent.match(/^#+\s+(.+)$/m);
      if (headingMatch) {
        return headingMatch[1].trim();
      }
      // Use filename as title
      const fileName = path.basename(filePath, '.md');
      return fileName
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };
    
    // Helper function to check if title exists and is not empty
    const hasValidTitle = (frontMatterText) => {
      const titleMatch = frontMatterText.match(/^title:\s*(.+)$/m);
      if (titleMatch) {
        const titleValue = titleMatch[1].trim();
        // Remove quotes if present
        const cleanTitle = titleValue.replace(/^["']|["']$/g, '').trim();
        return cleanTitle.length > 0;
      }
      return false;
    };
    
    if (match) {
      // File has front matter
      const frontMatter = match[1];
      const body = match[2];
      
      // Check if title exists and is valid
      if (!hasValidTitle(frontMatter)) {
        // Extract title from first heading or filename
        let title = extractTitle(body);
        
        // Escape quotes in title
        title = title.replace(/"/g, '\\"');
        
        // Remove existing title line if present but empty
        let newFrontMatter = frontMatter.replace(/^title:\s*.*$/m, '');
        newFrontMatter = newFrontMatter.trim();
        
        // Add title to front matter
        if (newFrontMatter) {
          newFrontMatter = newFrontMatter + `\ntitle: "${title}"`;
        } else {
          newFrontMatter = `title: "${title}"`;
        }
        
        const newContent = `---\n${newFrontMatter}\n---\n${body}`;
        fs.writeFileSync(filePath, newContent, 'utf8');
      }
    } else {
      // No front matter - create it
      let title = extractTitle(content);
      
      // Escape quotes in title
      title = title.replace(/"/g, '\\"');
      
      const newContent = `---\ntitle: "${title}"\n---\n${content}`;
      fs.writeFileSync(filePath, newContent, 'utf8');
    }
  } catch (error) {
    console.error(`⚠️  Error processing ${filePath}:`, error.message);
  }
}

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
    const result = spawnSync(
      'git',
      ['clone', '--depth', '1', '--quiet', urlWithToken, tempRepoPath],
      { stdio: 'inherit' }
    );

    if (result.status !== 0) {
      throw new Error(`Git clone failed with status ${result.status}`);
    }
    
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
    
    // Copy documentation files using Node.js fs
    console.log(`📋 Copying documentation from ${repoName}...`);
    const files = fs.readdirSync(sourceDocsPath);
    let copiedCount = 0;
    
    files.forEach(file => {
      const sourceFile = path.join(sourceDocsPath, file);
      const targetFile = path.join(targetDocsPath, file);
      const stat = fs.statSync(sourceFile);
      
      if (stat.isFile()) {
        // Skip _index.md if it exists - we'll create our own
        if (file !== '_index.md' && file.endsWith('.md')) {
          fs.copyFileSync(sourceFile, targetFile);
          // Ensure file has title in front matter
          ensureTitleInFile(targetFile);
          copiedCount++;
        } else if (file !== '_index.md') {
          fs.copyFileSync(sourceFile, targetFile);
          copiedCount++;
        }
      } else if (stat.isDirectory()) {
        // Recursively copy directories
        const copyDir = (src, dest) => {
          if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
          }
          const entries = fs.readdirSync(src);
          entries.forEach(entry => {
            const srcPath = path.join(src, entry);
            const destPath = path.join(dest, entry);
            const entryStat = fs.statSync(srcPath);
            if (entryStat.isFile()) {
              if (entry.endsWith('.md') && entry !== '_index.md') {
                fs.copyFileSync(srcPath, destPath);
                // Ensure file has title in front matter
                ensureTitleInFile(destPath);
                copiedCount++;
              } else {
                fs.copyFileSync(srcPath, destPath);
                copiedCount++;
              }
            } else if (entryStat.isDirectory()) {
              copyDir(srcPath, destPath);
            }
          });
        };
        copyDir(sourceFile, targetFile);
      }
    });
    
    console.log(`   📄 Copied ${copiedCount} files`);
    
    // Create _index.md file with repository metadata (overwrite if exists)
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

