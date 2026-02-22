import { clearToken } from '../lib/config.js';
import { info, output, isJsonMode } from '../lib/output.js';

export function logoutCommand() {
	clearToken();
	if (isJsonMode()) {
		output({ status: 'ok' });
	} else {
		info('Logged out. Token removed from ~/.bywrit/config.json');
	}
}
