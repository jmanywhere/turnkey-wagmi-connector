# Publishing To npm

This document explains how to publish `turnkey-wagmi-connector` to npm.

## Current State

The package is **not publish-ready yet**.

Current blockers:

- `packages/turnkey-wagmi-connector/package.json` has `"private": true`
- package `main`, `module`, and `types` point at `src/index.ts`
- there is no dedicated `dist/` build output
- there is no `files` allowlist in the package manifest

Before you publish, fix those items first.

## Recommended Package Hardening

Update `packages/turnkey-wagmi-connector/package.json`:

1. change `"private": true` to `"private": false`
2. point outputs to built files
3. define a `files` list
4. keep app-level libraries as peers

Recommended shape:

```json
{
  "name": "turnkey-wagmi-connector",
  "version": "0.1.0",
  "private": false,
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "files": [
    "dist"
  ]
}
```

## Recommended Build Output

Create a real package build:

- output JavaScript to `dist/`
- emit declarations to `dist/`

For example, create a dedicated package tsconfig such as:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "declaration": true,
    "declarationMap": true,
    "emitDeclarationOnly": false,
    "noEmit": false
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"]
}
```

Then verify:

```bash
pnpm --filter turnkey-wagmi-connector build
```

Expected result:

- `packages/turnkey-wagmi-connector/dist/index.js`
- `packages/turnkey-wagmi-connector/dist/index.d.ts`

## Peer Dependencies

Keep these as peers in the published package:

- `react`
- `wagmi`
- `viem`
- `@tanstack/react-query`
- `@turnkey/react-wallet-kit`

This avoids provider duplication in consuming apps.

## Before Publishing

From the repo root, run:

```bash
pnpm typecheck
pnpm build
```

Then inspect the package contents:

```bash
pnpm --filter turnkey-wagmi-connector pack
```

This generates a tarball preview so you can confirm:

- only expected files are included
- `dist/` exists
- no demo app files are included
- no local workspace-only paths leak into the package

## npm Login

Authenticate locally:

```bash
npm login
```

Verify the active user:

```bash
npm whoami
```

## First Publish

If the package name is public and available:

```bash
cd packages/turnkey-wagmi-connector
npm publish --access public
```

Use `--access public` for the first publish of a scoped public package or if npm requests it.

If the name is already taken, choose a new package name first.

## Version Bumps

For later releases:

1. update the package version
2. rebuild
3. publish again

Examples:

```bash
cd packages/turnkey-wagmi-connector
npm version patch
```

Then:

```bash
npm publish
```

## Recommended Release Flow

Suggested sequence:

1. make package manifest publish-ready
2. ensure `dist/` builds cleanly
3. run `pnpm typecheck`
4. run `pnpm build`
5. run `pnpm --filter turnkey-wagmi-connector pack`
6. commit the release changes
7. tag the release if you want git tags
8. run `npm publish --access public`

## Optional Improvements Before Publishing

These are not required, but they would improve the package:

- add a `prepublishOnly` script to run the package build automatically
- add automated tests for connector behavior and session expiry handling
- add changesets or another release/versioning workflow
- add CI to verify typecheck and build before publish
- add a package-specific README inside `packages/turnkey-wagmi-connector`

## Example `prepublishOnly`

Inside `packages/turnkey-wagmi-connector/package.json`:

```json
{
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "prepublishOnly": "pnpm build"
  }
}
```

## Important Notes

- publish only the package directory, not the monorepo root
- do not publish while `"private": true` is still set
- do not publish while outputs still point at `src/*.ts`
- make sure workspace-only import assumptions are removed before publishing
