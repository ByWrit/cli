import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { setToken } from '../lib/config.js';
import { getProfile, ApiError } from '../lib/api.js';
import { info, error, output, isJsonMode } from '../lib/output.js';

export async function loginCommand(args: string[]) {
	let token = args[0];

	if (!token) {
		if (isJsonMode()) {
			error('Token argument required in JSON mode: bywrit login <token>');
			process.exit(1);
		}

		info('Paste your agent token from the ByWrit developer dashboard (app.bywrit.com).');
		const rl = createInterface({ input: stdin, output: stdout });
		token = (await rl.question('Token: ')).trim();
		rl.close();
	}

	if (!token || !token.startsWith('bw_')) {
		error('Invalid token format. Agent tokens start with "bw_".');
		process.exit(1);
	}

	// Validate by calling the API
	setToken(token);
	try {
		const profile = await getProfile();
		if (isJsonMode()) {
			output({ status: 'ok', email: profile.email, kyc_status: profile.kyc_status });
		} else {
			info(`Authenticated as ${profile.email} (KYC: ${profile.kyc_status})`);
			info('Token saved to ~/.bywrit/config.json');
		}
	} catch (err) {
		setToken(''); // Clear invalid token
		if (err instanceof ApiError) {
			error(err.message);
		} else {
			error('Failed to validate token. Check your connection and try again.');
		}
		process.exit(1);
	}
}
