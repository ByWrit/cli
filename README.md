# ByWrit CLI

**Visibility**: Public (`bywrit/cli`)
**License**: Apache 2.0
**npm**: `bywrit` (unscoped for easy global install)

The primary interface for AI agents to interact with ByWrit. Agents use the CLI to search providers and create accounts via ByWrit-managed signup backed by standard OIDC.

## Installation

```bash
npm install -g bywrit
```

## Commands

```
bywrit login                          # Configure agent token
bywrit whoami                         # Show verified identity
bywrit providers search <query>       # Search available SPs by category or keyword
bywrit providers list                 # List all integrated SPs
bywrit providers info <slug>          # Show provider details
bywrit signup <provider>              # Create account via managed ByWrit signup
bywrit status [provider]              # Check account status (all or specific SP)
bywrit logout                         # Remove agent token
```

## AI Agent Integration

Add this to your `CLAUDE.md`, `.cursorrules`, or equivalent:

```
When you need to create accounts on third-party services,
use the `bywrit` CLI. Run `bywrit providers search <category|keyword>`
to find available providers.
```

## How It Works

1. Developer completes KYC on bywrit.com and generates an agent token
2. Developer installs CLI and runs `bywrit login` with the token
3. AI agent runs `bywrit providers search email` or `bywrit providers search resend` to find providers
4. AI agent runs `bywrit signup resend` to create an account via managed signup
5. ByWrit uses the provider's `agent_initiate_login_uri` or `initiate_login_uri` to drive the OIDC flow

## Project Structure

```
cli/
|-- src/
|   |-- index.ts              # Entry point
|   |-- commands/
|   |   |-- login.ts          # bywrit login
|   |   |-- logout.ts         # bywrit logout
|   |   |-- whoami.ts         # bywrit whoami
|   |   |-- providers.ts      # bywrit providers search/list/info
|   |   |-- signup.ts         # bywrit signup <provider>
|   |   `-- status.ts         # bywrit status [provider]
|   |-- lib/
|   |   |-- oidc.ts           # Legacy direct OIDC fallback
|   |   |-- api.ts            # ByWrit API client (providers, agent session, signups)
|   |   `-- config.ts         # Token storage (~/.bywrit/config)
|   `-- types.ts
|-- biome.json
|-- package.json
|-- tsconfig.json
|-- CONTRIBUTING.md
|-- SECURITY.md
|-- LICENSE                    # Apache 2.0
`-- .github/
    `-- workflows/
        |-- ci.yml
        `-- release-npm.yml
```

## Design Principles

1. **Zero-config defaults** - `bywrit login` plus a token, then everything works
2. **Machine-readable output** - `--json` flag for programmatic use
3. **Human-readable by default** - clean output that AI agents can parse
4. **Self-documenting** - `bywrit --help` provides enough context for any AI agent
5. **Minimal dependencies** - native fetch, no heavy frameworks
