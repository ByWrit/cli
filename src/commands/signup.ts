import { getToken } from '../lib/config.js';
import { getProvider, createManagedSignup, ApiError, type SignupAttempt } from '../lib/api.js';
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

	try {
		const result = await createManagedSignup(slug);

		if (isJsonMode()) {
			output(result);
			if (result.status !== 'completed' && result.status !== 'already_exists') {
				process.exit(1);
			}
			return;
		}

		if (result.status === 'completed') {
			info(`Account created on ${provider.name} via ByWrit OIDC.`);
			if (provider.website_url) {
				info(`Dashboard: ${provider.website_url}`);
			}
			info('Run `bywrit status` to see your connected services.');
			return;
		}

		if (result.status === 'already_exists') {
			info(`An account on ${provider.name} is already connected to this ByWrit identity.`);
			if (provider.website_url) {
				info(`Dashboard: ${provider.website_url}`);
			}
			return;
		}

		if (result.status === 'unsupported_by_provider') {
			info(`Managed signup is not supported for ${provider.name}. Falling back to legacy headless OIDC...`);
		} else if (result.status === 'browser_required') {
			error(result.error_message || 'This provider requires a real browser or a machine-friendly initiate login URL.');
			info(`Run \`bywrit providers info ${provider.slug}\` to inspect the provider's initiate URLs.`);
			process.exit(1);
		} else {
			error(result.error_message || 'Managed signup failed');
			process.exit(1);
		}
	} catch (err) {
		if (!(err instanceof ApiError)) {
			error('Managed signup failed');
			process.exit(1);
		}

		const managedAttempt = asSignupAttempt(err.data);
		if (managedAttempt) {
			if (isJsonMode()) {
				output(managedAttempt);
			}

			if (managedAttempt.status === 'browser_required') {
				error(managedAttempt.error_message || 'This provider requires a real browser.');
				info(`Run \`bywrit providers info ${provider.slug}\` to inspect the provider's initiate URLs.`);
				process.exit(1);
			}

			if (managedAttempt.status !== 'unsupported_by_provider') {
				error(managedAttempt.error_message || 'Managed signup failed');
				process.exit(1);
			}

			info(`Managed signup is not supported for ${provider.name}. Falling back to legacy headless OIDC...`);
		} else if (err.status !== 404 && err.status !== 409) {
			error(err.message);
			process.exit(1);
		} else {
			info(`Managed signup is unavailable for ${provider.name}. Falling back to legacy headless OIDC...`);
		}
	}

	// Legacy fallback while managed signup rolls out.
	const legacyResult = await headlessOidcSignup(provider);

	if (isJsonMode()) {
		output(legacyResult);
		if (!legacyResult.success) process.exit(1);
		return;
	}

	if (legacyResult.success) {
		info(`Account created on ${provider.name} via ByWrit OIDC.`);
		if (provider.website_url) {
			info(`Dashboard: ${provider.website_url}`);
		}
		info('Run `bywrit status` to see your connected services.');
		return;
	}

	error(legacyResult.error || 'Signup failed');
	process.exit(1);
}

function asSignupAttempt(data: unknown): SignupAttempt | null {
	if (!data || typeof data !== 'object') {
		return null;
	}

	const candidate = data as Partial<SignupAttempt>;
	return typeof candidate.id === 'string' && typeof candidate.status === 'string'
		? (candidate as SignupAttempt)
		: null;
}
