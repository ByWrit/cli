import { getToken } from '../lib/config.js';
import { getProfile, ApiError } from '../lib/api.js';
import { info, error, output, isJsonMode } from '../lib/output.js';

export async function whoamiCommand() {
	if (!getToken()) {
		error('Not logged in. Run `bywrit login` first.');
		process.exit(1);
	}

	try {
		const profile = await getProfile();

		if (isJsonMode()) {
			output(profile);
		} else {
			const date = new Date(profile.created_at * 1000).toLocaleDateString('en-AU', {
				year: 'numeric',
				month: 'long',
				day: 'numeric',
			});
			info(`Email:    ${profile.email}`);
			info(`KYC:      ${profile.kyc_status}`);
			info(`Member:   ${date}`);
			info(`ID:       ${profile.id}`);
		}
	} catch (err) {
		error(err instanceof ApiError ? err.message : 'Failed to fetch profile');
		process.exit(1);
	}
}
