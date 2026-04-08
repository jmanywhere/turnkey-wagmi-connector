# Contributing

Contributions are welcome, but this project is maintained with a deliberately small review surface.

## Project Notes

- This project is maintained by a solo developer.
- A meaningful portion of the implementation and documentation was built with AI assistance.
- Testing to date has only covered EVM flows.
- Further optimizations, refactors, and polish may be possible, but they require review and time to validate against the package contract and demo behavior.

If you want to propose changes, prefer narrowly scoped updates with a clear behavior justification.

## Development Setup

```bash
pnpm install
pnpm dev
```

For the Wagmi 3 demo:

```bash
pnpm dev:wagmi3
```

## Before Opening A Change

Run the checks that match your edit:

```bash
pnpm typecheck
pnpm build
pnpm test
```

If you changed the package surface or docs, also review:

- `README.md`
- `docs/PACKAGE_USAGE.md`
- `docs/NPM_PUBLISHING.md`

## Documentation Expectations

- keep the root `README.md` package-focused
- keep workspace and demo-specific details in `docs/WORKSPACE.md`
- keep deeper integration notes in `docs/PACKAGE_USAGE.md`
- update version references when cutting a release

## Versioning

The package version lives in `packages/turnkey-wagmi-connector/package.json`.

When releasing:

1. bump the version there
2. rebuild and pack the package
3. publish from `packages/turnkey-wagmi-connector`
4. make sure the root README still reflects the published version

See `docs/NPM_PUBLISHING.md` for the release flow.
