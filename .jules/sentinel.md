## 2024-08-05 - Path Traversal in Sync Script

**Vulnerability:** A path traversal vulnerability was identified in the `scripts/sync-docs.js` script. The `repo.name` field from the `repos.json` configuration file was used to construct file paths without proper sanitization. This allowed for directory traversal using payloads like `"../../"`.

**Learning:** The script uses `fs.rmSync` with `{ recursive: true, force: true }` on the constructed paths. A malicious `repo.name` could cause the script to delete directories outside of its intended scope, leading to data loss and potential denial of service. The root cause was trusting configuration data (`repos.json`) as safe input for file system operations.

**Prevention:** To prevent this, all file paths constructed from external or configurable data must be validated. Specifically, resolve the absolute path and verify that it is a subdirectory of the intended base directory before performing any file system operations, especially destructive ones like `rmSync`.
