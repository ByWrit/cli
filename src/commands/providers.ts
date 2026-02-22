import { listProviders, getProvider, ApiError } from '../lib/api.js';
import { info, error, output, table, isJsonMode } from '../lib/output.js';

export async function providersListCommand() {
	try {
		const result = await listProviders();

		if (result.providers.length === 0) {
			if (isJsonMode()) {
				output({ providers: [] });
			} else {
				info('No providers available yet.');
			}
			return;
		}

		if (isJsonMode()) {
			output(result);
			return;
		}

		table(
			result.providers.map((p) => ({
				slug: p.slug,
				name: p.name,
				category: p.category,
				description: p.description ? (p.description.length > 50 ? p.description.slice(0, 47) + '...' : p.description) : null,
			})),
			[
				{ key: 'slug', label: 'SLUG' },
				{ key: 'name', label: 'NAME' },
				{ key: 'category', label: 'CATEGORY' },
				{ key: 'description', label: 'DESCRIPTION' },
			],
		);
	} catch (err) {
		error(err instanceof ApiError ? err.message : 'Failed to list providers');
		process.exit(1);
	}
}

export async function providersSearchCommand(args: string[]) {
	const query = args[0];
	if (!query) {
		error('Usage: bywrit providers search <category|keyword>');
		process.exit(1);
	}

	try {
		// Try as category first, then fall back to text search
		let result = await listProviders(query);

		if (result.providers.length === 0) {
			result = await listProviders(undefined, query);
		}

		if (result.providers.length === 0) {
			if (isJsonMode()) {
				output({ providers: [] });
			} else {
				info(`No providers found for "${query}".`);
			}
			return;
		}

		if (isJsonMode()) {
			output(result);
			return;
		}

		info(`Found ${result.providers.length} provider(s):\n`);
		table(
			result.providers.map((p) => ({
				slug: p.slug,
				name: p.name,
				category: p.category,
				description: p.description ? (p.description.length > 50 ? p.description.slice(0, 47) + '...' : p.description) : null,
			})),
			[
				{ key: 'slug', label: 'SLUG' },
				{ key: 'name', label: 'NAME' },
				{ key: 'category', label: 'CATEGORY' },
				{ key: 'description', label: 'DESCRIPTION' },
			],
		);
	} catch (err) {
		error(err instanceof ApiError ? err.message : 'Search failed');
		process.exit(1);
	}
}

export async function providerInfoCommand(args: string[]) {
	const slug = args[0];
	if (!slug) {
		error('Usage: bywrit providers info <slug>');
		process.exit(1);
	}

	try {
		const provider = await getProvider(slug);

		if (isJsonMode()) {
			output(provider);
			return;
		}

		info(`Name:        ${provider.name}`);
		info(`Slug:        ${provider.slug}`);
		info(`Category:    ${provider.category || '—'}`);
		info(`Website:     ${provider.website_url || '—'}`);
		info(`Scopes:      ${provider.scopes.join(', ')}`);
		if (provider.description) {
			info(`Description: ${provider.description}`);
		}
	} catch (err) {
		if (err instanceof ApiError && err.status === 404) {
			error(`Provider "${slug}" not found. Run \`bywrit providers list\` to see available providers.`);
		} else {
			error(err instanceof ApiError ? err.message : 'Failed to fetch provider');
		}
		process.exit(1);
	}
}
