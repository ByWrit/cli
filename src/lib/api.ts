import { getToken, getApiUrl } from './config.js';

export class ApiError extends Error {
	constructor(
		message: string,
		public status: number,
		public data?: unknown,
	) {
		super(message);
	}
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
	const token = getToken();
	const apiUrl = getApiUrl();
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		...((options.headers as Record<string, string>) || {}),
	};
	if (token) {
		headers['Authorization'] = `Bearer ${token}`;
	}

	const res = await fetch(`${apiUrl}${path}`, { ...options, headers });

	if (res.status === 401) {
		throw new ApiError('Authentication failed. Run `bywrit login` to configure your token.', 401);
	}

	const data = await res.json();
	if (!res.ok) {
		const msg = (data as Record<string, string>).message || (data as Record<string, string>).error || 'Request failed';
		throw new ApiError(msg, res.status, data);
	}
	return data as T;
}

// --- Endpoints ---

export type DeveloperProfile = {
	id: string;
	email: string;
	email_verified: boolean;
	kyc_status: string;
	kyc_verified_at: number | null;
	created_at: number;
};

export function getProfile() {
	return request<DeveloperProfile>('/v1/developers/me');
}

export type Provider = {
	id?: string;
	slug: string;
	name: string;
	description: string | null;
	category: string | null;
	website_url: string | null;
};

export type ProviderDetail = Provider & {
	id?: string;
	client_id: string;
	redirect_uris: string[];
	scopes: string[];
	initiate_login_uri?: string | null;
	agent_initiate_login_uri?: string | null;
	created_at: number;
};

export function listProviders(category?: string, search?: string) {
	const params = new URLSearchParams();
	if (category) params.set('category', category);
	if (search) params.set('search', search);
	const qs = params.toString();
	return request<{ providers: Provider[] }>(`/v1/providers${qs ? `?${qs}` : ''}`);
}

export function getProvider(slug: string) {
	return request<ProviderDetail>(`/v1/providers/${slug}`);
}

export type AgentSession = {
	session_token: string;
	token_type: 'Session';
	expires_in: number;
};

export function createAgentSession() {
	return request<AgentSession>('/v1/agent/session', {
		method: 'POST',
	});
}

export type SignupAttempt = {
	id: string;
	status:
		| 'completed'
		| 'already_exists'
		| 'browser_required'
		| 'additional_input_required'
		| 'provider_unavailable'
		| 'unsupported_by_provider'
		| 'failed'
		| 'in_progress';
	provider: {
		id: string;
		slug: string;
		name: string;
	};
	used_login_uri: string | null;
	http_status: number | null;
	final_url: string | null;
	error_code: string | null;
	error_message: string | null;
	result: Record<string, unknown> | null;
	created_at: number;
	updated_at: number;
	completed_at: number | null;
};

export function createManagedSignup(provider: string) {
	return request<SignupAttempt>('/v1/agent/signups', {
		method: 'POST',
		body: JSON.stringify({ provider }),
	});
}

export function getManagedSignup(attemptId: string) {
	return request<SignupAttempt>(`/v1/agent/signups/${encodeURIComponent(attemptId)}`);
}

export type Grant = {
	id: string;
	first_authorized_at: number;
	last_authorized_at: number;
	service: {
		id: string;
		name: string;
		slug: string;
		description: string | null;
		category: string | null;
		website_url: string | null;
	};
};

export function listGrants(provider?: string) {
	const qs = provider ? `?provider=${encodeURIComponent(provider)}` : '';
	return request<{ grants: Grant[] }>(`/v1/developers/grants${qs}`);
}
