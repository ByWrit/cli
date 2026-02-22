import { getToken } from '../lib/config.js';
import { getProvider, ApiError } from '../lib/api.js';
import { headlessOidcSignup } from '../lib/oidc.js';
import { info, error, output, isJsonMode } from '../lib/output.js';

export async function signupCommand(args: string[]) {
	const slug = args[0];
	if (!slug) {
		error('Usage: bywrit signup <provider-slug>');
		process.exit(1);
	}

	if (!getToken()) {
		error('Not logged in. Run `bywrit login` first.');
		process.exit(1);
	}

	// Fetch provider details (including OIDC config)
	let provider;
	try {
		provider = await getProvider(slug);
	} catch (err) {
		if (err instanceof ApiError && err.status === 404) {
			error(`Provider "${slug}" not found. Run \`bywrit providers list\` to see available providers.`);
		} else {
			error(err instanceof ApiError ? err.message : 'Failed to fetch provider');
		}
		process.exit(1);
	}

	if (!isJsonMode()) {
		info(`Signing up with ${provider.name}...`);
	}

	// Execute headless OIDC flow
	const result = await headlessOidcSignup(provider);

	if (isJsonMode()) {
		output(result);
		if (!result.success) process.exit(1);
		return;
	}

	if (result.success) {
		info(`Account created on ${provider.name} via ByWrit OIDC.`);
		if (provider.website_url) {
			info(`Dashboard: ${provider.website_url}`);
		}
		info('Run `bywrit status` to see your connected services.');
	} else {
		error(result.error || 'Signup failed');
		process.exit(1);
	}
}
