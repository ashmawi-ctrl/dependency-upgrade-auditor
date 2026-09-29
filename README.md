# Dependency Upgrade Auditor

[![quality](https://github.com/ashmawi-ctrl/dependency-upgrade-auditor/actions/workflows/quality.yml/badge.svg)](https://github.com/ashmawi-ctrl/dependency-upgrade-auditor/actions/workflows/quality.yml)

A repository-focused tool for checking whether a dependency upgrade changes build or test behavior.

The first version targets Node.js repositories. It compares a known baseline revision with a candidate revision, identifies dependency declaration changes from `package.json`, runs explicit verification commands in isolated Git worktrees, and reports whether the candidate introduced a regression.

The tool audits an existing upgrade commit or branch. It does not automatically rewrite dependency files or install packages on the caller's checkout.

## Why this exists

Dependency upgrade pull requests are often visually small:

```diff
- "fastify": "^4.0.0"
+ "fastify": "^5.0.0"
```

but the real review question is broader:

- did the known baseline actually pass?
- what dependency declarations changed?
- does the candidate still build and test successfully?
- did a command time out rather than fail normally?
- can the comparison be rerun without switching my active branch?

This project keeps those questions explicit.

## Install

Node.js 22+:

```bash
npm install
npm run build
```

Run from source during development:

```bash
node --enable-source-maps dist/cli.js --help
```

## Audit two revisions

Each `--check` is a JSON argument array rather than a shell string:

```bash
dependency-upgrade-auditor . \
  --base main~1 \
  --candidate main \
  --check '["npm","test"]' \
  --check '["npm","run","build"]'
```

Using argument arrays avoids shell interpolation and makes the exact command part of the report.

Example result:

```text
verdict: regression
base: 7ac2...
candidate: 9bf1...

dependency changes:
- [dependencies] fastify: ^4.0.0 -> ^5.0.0 (changed)

baseline checks:
- pass exit=0 duration=812.4ms command=["npm","test"]

candidate checks:
- fail exit=1 duration=905.1ms command=["npm","test"]
```

## Verdicts

The first version uses three deliberately narrow verdicts:

- `candidate-pass`: baseline passed and candidate passed
- `regression`: baseline passed and candidate failed or timed out
- `baseline-failed`: the baseline itself is not green, so candidate comparison stops

A `regression` means the candidate revision changed observable verification behavior. It does **not** prove that the dependency change alone caused the failure if the candidate contains unrelated code changes.

## Isolation model

Both revisions are resolved to commits and evaluated in temporary detached Git worktrees.

The caller's branch and working directory are never switched.

The worktrees are removed after the run, including failed checks.

## Dependency diff

The auditor currently compares only:

- `dependencies`
- `devDependencies`

It reports added, removed, and changed declarations.

Other package.json fields are intentionally ignored by the dependency diff.

## JSON output

```bash
dependency-upgrade-auditor . \
  --base v1.8.0 \
  --candidate dependency-bump \
  --check '["npm","test"]' \
  --format json \
  --output artifacts/upgrade-audit.json
```

The report preserves:

- resolved base and candidate commits
- dependency declaration changes
- exact verification command arrays
- exit codes
- stdout / stderr
- durations
- timeout state
- final verdict

## Test strategy

The integration suite creates a real temporary Git repository.

It commits a passing baseline, creates a later candidate with a dependency version change and failing verification behavior, then checks that:

- the baseline is green
- the candidate is classified as a regression
- the dependency change is reported
- the caller's HEAD is not moved

A separate test covers the case where the supplied baseline already fails.

## Development

```bash
npm install
npm run quality
```

## Engineering workflow

The first Node upgrade audit is tracked through:

- [Issue #1](https://github.com/ashmawi-ctrl/dependency-upgrade-auditor/issues/1)
- branch `feat/node-upgrade-audit`
- manifest diff unit tests
- real temporary Git repository integration tests
- command timeout coverage
- GitHub Actions
- reviewable pull request

## Deliberate limitations

- Node.js / package.json repositories only
- no automatic dependency modification
- no automatic `npm install`
- no package-lock semantic diff yet
- no Python dependency manifests yet
- trusted local verification commands only
- no container isolation yet

The first version separates **evaluating an upgrade** from **performing an upgrade**. That keeps the audit result reproducible and avoids silently changing the repository under review.

## Next changes

- package-lock integrity checks
- Python `pyproject.toml` support
- optional setup/install command before verification
- Docker-backed execution mode
- compare runtime/toolchain metadata between revisions
- Markdown and GitHub PR summary output

## License

MIT
