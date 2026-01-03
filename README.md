# QuoteSystemX Documentation Site

Centralized documentation site for all QuoteSystemX projects, automatically syncing documentation from the `docs` folder of all company repositories.

## Architecture

The site is built on [Hugo](https://gohugo.io/) and automatically syncs documentation from other repositories via GitHub Actions.

## Setup

### 1. GitHub App Configuration

To access private repositories, you need to create a GitHub App and configure secrets:

1. Create a GitHub App in QuoteSystemX organization settings
2. Add the following secrets to the repository:
   - `GH_APP_ID` - Your GitHub App ID
   - `GH_APP_PRIVATE_KEY` - GitHub App private key

### 2. Repository Configuration

Edit the `repos.json` file and add the list of repositories to sync:

```json
{
  "repositories": [
    {
      "name": "repo-name",
      "url": "https://github.com/QuoteSystemX/repo-name.git",
      "docs_path": "docs",
      "display_name": "Display Name",
      "description": "Repository description"
    }
  ]
}
```

### 3. GitHub Pages Configuration

1. Go to Settings → Pages
2. Select Source: GitHub Actions
3. The workflow will automatically deploy the site on each run

## Local Development

### Requirements

- [Hugo Extended](https://gohugo.io/installation/) (version with SCSS support)
- Node.js 18+

### Installation

```bash
# Install dependencies (if needed)
npm install

# Sync documentation (requires GITHUB_TOKEN)
export GITHUB_TOKEN=your_token
npm run sync-docs

# Start local server
hugo server --buildDrafts
```

The site will be available at http://localhost:1313

## Automatic Synchronization

GitHub Action automatically:

1. Runs every day at 2:00 UTC
2. Can be triggered manually via `workflow_dispatch`
3. Runs on push to `main` or `master` branches

The workflow performs the following steps:

1. Creates GitHub App token for accessing private repositories
2. Clones each repository from `repos.json`
3. Copies the `docs/` folder from each repository to `content/docs/{repo-name}/`
4. Builds Hugo site
5. Deploys to GitHub Pages

## Project Structure

```
web-site-space/
├── .github/
│   └── workflows/
│       └── sync-and-deploy.yml  # GitHub Action workflow
├── content/
│   └── docs/                    # Synced documentation
├── scripts/
│   └── sync-docs.js             # Sync script
├── config.toml                   # Hugo configuration
├── repos.json                    # Repository list
└── README.md
```

## Adding a New Repository

1. Add an entry to `repos.json`
2. Ensure the repository has a `docs/` folder
3. Trigger the workflow manually or wait for automatic run

## Troubleshooting

### Documentation Not Syncing

- Check that the GitHub App has access to repositories
- Ensure `GH_APP_ID` and `GH_APP_PRIVATE_KEY` secrets are configured correctly
- Check GitHub Actions logs

### Hugo Build Fails

- Ensure you're using Hugo Extended version
- Check syntax in `config.toml`

## License

Apache-2.0
