## 2024-08-05 - Path Traversal in Sync Script

**Vulnerability:** A path traversal vulnerability was identified in the `scripts/sync-docs.js` script. The `repo.name` field from the `repos.json` configuration file was used to construct file paths without proper sanitization. This allowed for directory traversal using payloads like `"../../"`.

**Learning:** The script uses `fs.rmSync` with `{ recursive: true, force: true }` on the constructed paths. A malicious `repo.name` could cause the script to delete directories outside of its intended scope, leading to data loss and potential denial of service. The root cause was trusting configuration data (`repos.json`) as safe input for file system operations.

**Prevention:** To prevent this, all file paths constructed from external or configurable data must be validated. Specifically, resolve the absolute path and verify that it is a subdirectory of the intended base directory before performing any file system operations, especially destructive ones like `rmSync`.

## 2024-08-06 - Credential Leak in Sync Script

**Vulnerability:** A credential leak vulnerability was discovered in the `scripts/sync-docs.js` script. The script was embedding the `GITHUB_TOKEN` into the repository clone URL without first validating that the URL belonged to `github.com`.

**Learning:** An attacker with the ability to modify the `repos.json` file could add a malicious URL pointing to a server they control. When the sync script runs, it would send the `GITHUB_TOKEN` to this malicious server, compromising repository access. The root cause was the implicit trust that all configured repository URLs were safe.

**Prevention:** Before embedding sensitive credentials into a URL, always validate that the URL's hostname belongs to the expected, trusted domain. In this case, a simple check to ensure the URL starts with `https://github.com/` was added to prevent the token from being sent to an untrusted third party.

## 2024-08-07 - Command Injection in Sync Script

**Vulnerability:** A command injection vulnerability was identified in the `scripts/sync-docs.js` script. The `repo.url` from `repos.json` was passed directly to a `git clone` command, allowing an attacker to inject arbitrary command-line options.

**Learning:** An attacker who could modify `repos.json` could add spaces and git options (e.g., `--upload-pack='touch /tmp/pwned'`) to the `repo.url` field. This would lead to arbitrary command execution on the machine running the script. The root cause was the failure to sanitize the URL before using it as an argument in a shell command.

**Prevention:** To prevent this, all inputs used in shell commands must be strictly validated. The fix was to disallow spaces in the `repo.url`, which effectively prevents the injection of additional command-line arguments.
