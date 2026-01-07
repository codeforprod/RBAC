# Release Process

This document describes the automated CI/CD pipeline for publishing the @callairis/rbac packages to NPM.

## Overview

The RBAC monorepo uses [Changesets](https://github.com/changesets/changesets) for version management and automated NPM publishing via GitHub Actions.

## Workflow

### Developer Flow

1. **Make changes** to any package(s) in the monorepo
2. **Create a changeset** describing your changes:
   ```bash
   npx changeset
   ```
   - Select affected packages
   - Choose version bump type (major, minor, patch)
   - Write a description of the changes
3. **Commit the changeset file** with your PR
4. **Merge PR to main** branch

### Automation Flow

When changes are merged to `main`:

1. **CI Pipeline** runs (`ci.yml`):
   - Tests on Node.js 18, 20, 22
   - Runs build, lint, typecheck, and tests

2. **Release Pipeline** runs (`release.yml`):
   - If changesets exist → Creates "Version Packages" PR
   - If version PR is merged → Publishes all updated packages to NPM
   - Creates GitHub Releases for each published package

## Configuration

### Changesets Configuration

Located at `.changeset/config.json`:

```json
{
  "linked": [["@callairis/rbac-*"]],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch"
}
```

**Key settings:**
- `linked`: All @callairis/rbac-* packages are linked for coordinated version bumps
- `access`: Public packages (required for scoped packages)
- `updateInternalDependencies`: Automatically bump internal deps on patch releases

### GitHub Secrets

Required secrets in GitHub repository settings:

| Secret | Source | Purpose |
|--------|--------|---------|
| `NPM_TOKEN` | npmjs.com | NPM package publishing (Automation token) |
| `GITHUB_TOKEN` | Auto-provided | PR creation, releases |

## NPM Organization Setup

1. Login to [npmjs.com](https://www.npmjs.com/)
2. Create organization `@callairis` if not exists:
   - Go to [https://www.npmjs.com/org/create](https://www.npmjs.com/org/create)
   - Create organization named `callairis`
3. Generate NPM Automation Token:
   - Go to Access Tokens → Generate New Token
   - Select "Automation" token type
   - Copy token
4. Add token to GitHub:
   - Go to Repository Settings → Secrets and variables → Actions
   - Create secret `NPM_TOKEN` with the automation token

## Package Publishing

### First Release

To trigger the first release:

1. Changeset already created at `.changeset/initial-release.md`
2. Commit and push to main:
   ```bash
   git add .
   git commit -m "feat: setup CI/CD pipeline with changesets"
   git push origin main
   ```
3. Changesets action will create "Version Packages" PR
4. Review and merge the version PR
5. All packages publish to NPM automatically

### Subsequent Releases

For each feature or fix:

1. Create a changeset:
   ```bash
   npx changeset
   ```
2. Select packages affected by your changes
3. Choose appropriate version bump:
   - **major**: Breaking changes
   - **minor**: New features (backwards compatible)
   - **patch**: Bug fixes
4. Write clear description
5. Commit changeset file with your changes
6. Merge to main
7. Version PR created automatically
8. Merge version PR to publish

## Package Dependencies

The packages have the following dependency structure:

```text
@callairis/rbac-core (standalone)
       ↓
┌──────┴──────┬─────────────┐
↓             ↓             ↓
adapter-      adapter-      cache
mongoose      typeorm       (depends on core)
       ↓             ↓
       └──────┬──────┘
              ↓
      @callairis/rbac-nestjs
      (depends on core)
```

Due to the `linked` configuration, version bumps are coordinated across all packages.

## Verification

Before merging to main, ensure:

- [ ] All tests pass locally: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Linting passes: `npm run lint`
- [ ] Type checking passes: `npm run typecheck`
- [ ] Changeset created: check `.changeset/` directory
- [ ] All packages have `publishConfig.access: "public"`

## Troubleshooting

### Publishing Fails

If publishing fails:

1. Check NPM_TOKEN is valid
2. Verify @callairis organization exists
3. Check package names are available
4. Review GitHub Actions logs

### Version PR Not Created

If version PR is not created:

1. Verify changesets exist in `.changeset/` directory
2. Check GitHub Actions logs for errors
3. Ensure GITHUB_TOKEN has correct permissions

### Build Failures

If build fails in CI:

1. Reproduce locally: `npm ci && npm run build`
2. Fix issues
3. Push fix to branch
4. CI will re-run

## Scripts

Available npm scripts:

```bash
npm run build          # Build all packages
npm test               # Run all tests
npm run lint           # Lint all packages
npm run typecheck      # Type check all packages
npm run changeset      # Create new changeset
npm run version-packages  # Version packages (used by CI)
npm run release        # Build and publish (used by CI)
```

## References

- [Changesets Documentation](https://github.com/changesets/changesets)
- [Changesets GitHub Action](https://github.com/changesets/action)
- [NPM Automation Tokens](https://docs.npmjs.com/creating-and-viewing-access-tokens)
- [Turborepo + Changesets Guide](https://turbo.build/repo/docs/guides/publishing-packages)
