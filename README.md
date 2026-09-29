# Dependency Upgrade Auditor

A repository-focused tool for checking whether a dependency upgrade changes build or test behavior.

The first version targets Node.js repositories. It compares a known baseline revision with a candidate revision, identifies dependency version changes from `package.json`, runs explicit verification commands in isolated Git worktrees, and reports whether the candidate introduced a regression.

The tool audits an existing upgrade commit or branch; it does not automatically rewrite dependency files.
