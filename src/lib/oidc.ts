import { randomBytes, createHash } from 'node:crypto';
import { getToken } from './config.js';

const OIDC_ISSUER = 'https://id.bywrit.com';

function base64UrlEncode(buffer: Buffer): string {
	return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Generate PKCE code_verifier and code_challenge (S256) */
export function generatePkce(): { codeVerifier: string; codeChallenge: string } {
	const codeVerifier = base64UrlEncode(randomBytes(32));
	const hash = createHash('sha256').update(codeVerifier).digest();
	const codeChallenge = base64UrlEncode(hash);
	return { codeVerifier, codeChallenge };
}

/** Detect agent environment from env vars */
export function detectAgent(): {
	agent_type: string;
	agent_model: string;
	agent_provider: string;
	agent_instance_id: string;
} {
	const env = process.env;

	let agent_provider = 'unknown';
	let agent_model = 'unknown';
	let agent_type = 'coding';

	// Claude Code
	if (env.CLAUDE_CODE || env.CLAUDE_MODEL) {
		agent_provider = 'anthropic';
		agent_model = env.CLAUDE_MODEL || 'claude';
		agent_type = 'coding';
	}
	// Cursor
	else if (env.CURSOR_VERSION || env.CURSOR_TRACE_ID) {
		agent_provider = 'cursor';
		agent_model = env.CURSOR_MODEL || 'cursor';
		agent_type = 'coding';
	}
	// Windsurf / Codeium
	else if (env.WINDSURF_VERSION || env.CODEIUM_API_KEY) {
		agent_provider = 'codeium';
		agent_model = 'windsurf';
		agent_type = 'coding';
	}
	// GitHub Copilot
	else if (env.GITHUB_COPILOT || env.COPILOT_AGENT) {
		agent_provider = 'github';
		agent_model = 'copilot';
		agent_type = 'coding';
	}

	const agent_instance_id = `cli_${randomBytes(8).toString('hex')}`;

	return { agent_type, agent_model, agent_provider, agent_instance_id };
}

export type SignupResult = {
	success: boolean;
	provider: string;
	redirect_url?: string;
	status_code?: number;
	error?: string;
};

/** Execute the headless OIDC signup flow */
export async function headlessOidcSignup(provider: {
	slug: string;
	name: string;
	client_id: string;
	redirect_uris: string[];
	scopes: string[];
}): Promise<SignupResult> {
	const token = getToken();
	if (!token) {
		return { success: false, provider: provider.slug, error: 'Not logged in' };
	}

	const { codeVerifier, codeChallenge } = generatePkce();
	const agent = detectAgent();

	// Use first redirect URI
	const redirectUri = provider.redirect_uris[0];
	if (!redirectUri) {
		return { success: false, provider: provider.slug, error: 'Provider has no registered redirect URIs' };
	}

	// Build authorize URL
	const params = new URLSearchParams({
		client_id: provider.client_id,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: provider.scopes.join(' '),
		code_challenge: codeChallenge,
		code_challenge_method: 'S256',
		state: randomBytes(16).toString('hex'),
		agent_type: agent.agent_type,
		agent_model: agent.agent_model,
		agent_provider: agent.agent_provider,
		agent_instance_id: agent.agent_instance_id,
	});

	const authorizeUrl = `${OIDC_ISSUER}/authorize?${params.toString()}`;

	// Step 1: Hit /authorize with agent token (manual redirect to capture Location)
	const authorizeRes = await fetch(authorizeUrl, {
		headers: { 'Authorization': `Bearer ${token}` },
		redirect: 'manual',
	});

	// Should be 302 redirect to SP callback with ?code=...
	if (authorizeRes.status !== 302) {
		const body = await authorizeRes.text();
		let errorMsg = `Authorization failed (HTTP ${authorizeRes.status})`;
		try {
			const data = JSON.parse(body);
			errorMsg = data.error_description || data.message || data.error || errorMsg;
		} catch {
			// not JSON
		}
		return { success: false, provider: provider.slug, error: errorMsg };
	}

	const location = authorizeRes.headers.get('Location');
	if (!location) {
		return { success: false, provider: provider.slug, error: 'No redirect from authorize endpoint' };
	}

	// Check for error in redirect
	const redirectUrl = new URL(location);
	const errorParam = redirectUrl.searchParams.get('error');
	if (errorParam) {
		const desc = redirectUrl.searchParams.get('error_description') || errorParam;
		return { success: false, provider: provider.slug, error: desc };
	}

	// Step 2: Follow redirect to SP's callback (triggers account creation)
	try {
		const callbackRes = await fetch(location, { redirect: 'follow' });
		return {
			success: callbackRes.ok,
			provider: provider.slug,
			redirect_url: location,
			status_code: callbackRes.status,
			error: callbackRes.ok ? undefined : `SP callback returned HTTP ${callbackRes.status}`,
		};
	} catch (err) {
		// Network error following redirect is OK — the authorize code was still issued
		// The SP may not have a reachable callback yet (common in development)
		return {
			success: true,
			provider: provider.slug,
			redirect_url: location,
			error: undefined,
		};
	}
}
