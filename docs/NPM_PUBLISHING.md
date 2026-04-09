# Publishing To npm

This document explains how to publish `turnkey-wagmi-connector` to npm.

## Current State

The package is publish-ready from a packaging perspective.

Current publish shape:

- `packages/turnkey-wagmi-connector/package.json` points `main`, `module`, `types`, and `exports` at `dist/`
- the package build emits JavaScript and declaration files into `dist/`
- the manifest includes a `files` allowlist so demo app files are excluded from the npm tarball
- `prepack` rebuilds the package before `npm pack` or `npm publish`

## Recommended Package Hardening

Keep `packages/turnkey-wagmi-connector/package.json` in this shape:

Recommended shape:

```json
{
    "name": "turnkey-wagmi-connector",
    "version": "0.0.1",
    "type": "module",
    "main": "./dist/index.js",
    "module": "./dist/index.js",
    "types": "./dist/index.d.ts",
    "exports": {
        ".": {
            "types": "./dist/index.d.ts",
            "import": "./dist/index.js",
            "default": "./dist/index.js"
        }
    },
    "files": ["dist", "README.md"],
    "scripts": {
        "prepack": "pnpm run build"
    }
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

1. run `pnpm --filter turnkey-wagmi-connector typecheck`
2. run `pnpm --filter turnkey-wagmi-connector test`
3. run `pnpm --filter turnkey-wagmi-connector build`
4. run `pnpm --filter turnkey-wagmi-connector pack`
5. inspect the tarball contents
6. bump the package version
7. run `npm publish`

## Optional Improvements Before Publishing

These are not required, but they would improve the package:

- add a `prepublishOnly` script to run typecheck and tests automatically
- add automated tests for connector behavior and session expiry handling
- add changesets or another release/versioning workflow
- add CI to verify typecheck and build before publish
- add a package-specific README inside `packages/turnkey-wagmi-connector`

## Important Notes

- publish only the package directory, not the monorepo root
- do not publish until `pack` shows only the expected package files
- make sure the version is bumped before each release
- make sure workspace-only import assumptions are removed before publishing
