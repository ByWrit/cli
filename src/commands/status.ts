import { getToken } from '../lib/config.js';
import { listGrants, ApiError } from '../lib/api.js';
import { info, error, output, table, isJsonMode } from '../lib/output.js';

export async function statusCommand(args: string[]) {
	const provider = args[0];

	if (!getToken()) {
		error('Not logged in. Run `bywrit login` first.');
		process.exit(1);
	}

	try {
		const result = await listGrants(provider);

		if (result.grants.length === 0) {
			if (isJsonMode()) {
				output({ grants: [] });
			} else {
				if (provider) {
					info(`No active connection to "${provider}".`);
					info(`Run \`bywrit signup ${provider}\` to create an account.`);
				} else {
					info('No connected services yet.');
					info('Run `bywrit providers list` to see available providers.');
				}
			}
			return;
		}

		if (isJsonMode()) {
			output(result);
			return;
		}

		const formatDate = (ts: number) =>
			new Date(ts * 1000).toLocaleDateString('en-AU', {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
			});

		table(
			result.grants.map((g) => ({
				provider: g.service.slug,
				name: g.service.name,
				category: g.service.category,
				connected: formatDate(g.first_authorized_at),
				last_used: formatDate(g.last_authorized_at),
			})),
			[
				{ key: 'provider', label: 'PROVIDER' },
				{ key: 'name', label: 'NAME' },
				{ key: 'category', label: 'CATEGORY' },
				{ key: 'connected', label: 'CONNECTED' },
				{ key: 'last_used', label: 'LAST USED' },
			],
		);
	} catch (err) {
		error(err instanceof ApiError ? err.message : 'Failed to fetch status');
		process.exit(1);
	}
}
