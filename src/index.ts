#!/usr/bin/env node

import { setJsonMode } from './lib/output.js';
import { loginCommand } from './commands/login.js';
import { logoutCommand } from './commands/logout.js';
import { whoamiCommand } from './commands/whoami.js';
import { providersListCommand, providersSearchCommand, providerInfoCommand } from './commands/providers.js';
import { signupCommand } from './commands/signup.js';
import { statusCommand } from './commands/status.js';

const args = process.argv.slice(2);

// Extract --json flag
const jsonIndex = args.indexOf('--json');
if (jsonIndex !== -1) {
	setJsonMode(true);
	args.splice(jsonIndex, 1);
}

const command = args[0];
const subcommand = args[1];
const rest = args.slice(2);

const HELP = `bywrit — CLI for AI agents to interact with ByWrit

Usage:
  bywrit login [token]                 Configure agent token
  bywrit logout                        Remove agent token
  bywrit whoami                        Show verified identity

  bywrit providers list                List all available providers
  bywrit providers search <query>      Search providers by category or keyword
  bywrit providers info <slug>         Show provider details

  bywrit signup <provider>             Create account via headless OIDC
  bywrit status [provider]             Check account status

Options:
  --json                               Output as JSON (for programmatic use)
  --help, -h                           Show this help

Get started:
  1. Create an account at app.bywrit.com and generate an agent token
  2. Run: bywrit login
  3. Run: bywrit providers search <category>
`;

async function main() {
	if (!command || command === '--help' || command === '-h' || command === 'help') {
		console.log(HELP);
		return;
	}

	switch (command) {
		case 'login':
			await loginCommand(args.slice(1));
			break;

		case 'logout':
			logoutCommand();
			break;

		case 'whoami':
			await whoamiCommand();
			break;

		case 'providers':
			if (!subcommand || subcommand === 'list') {
				await providersListCommand();
			} else if (subcommand === 'search') {
				await providersSearchCommand(rest);
			} else if (subcommand === 'info') {
				await providerInfoCommand(rest);
			} else {
				console.error(`Unknown subcommand: providers ${subcommand}`);
				console.error('Run `bywrit providers --help` for usage.');
				process.exit(1);
			}
			break;

		case 'signup':
			await signupCommand(args.slice(1));
			break;

		case 'status':
			await statusCommand(args.slice(1));
			break;

		default:
			console.error(`Unknown command: ${command}`);
			console.error('Run `bywrit --help` for usage.');
			process.exit(1);
	}
}

main().catch((err) => {
	console.error('Fatal:', err.message || err);
	process.exit(1);
});
