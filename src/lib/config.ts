import { readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const CONFIG_DIR = join(homedir(), '.bywrit');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

type Config = {
	token?: string;
	api_url?: string;
};

function ensureDir() {
	mkdirSync(CONFIG_DIR, { recursive: true });
}

export function readConfig(): Config {
	try {
		const raw = readFileSync(CONFIG_FILE, 'utf-8');
		return JSON.parse(raw);
	} catch {
		return {};
	}
}

export function writeConfig(config: Config) {
	ensureDir();
	writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 });
}

export function getToken(): string | null {
	return readConfig().token || null;
}

export function setToken(token: string) {
	const config = readConfig();
	config.token = token;
	writeConfig(config);
}

export function clearToken() {
	try {
		unlinkSync(CONFIG_FILE);
	} catch {
		// File doesn't exist, that's fine
	}
}

export function getApiUrl(): string {
	return readConfig().api_url || 'https://api.bywrit.com';
}
