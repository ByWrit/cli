/** Output helpers — human-readable by default, JSON with --json flag */

let jsonMode = false;

export function setJsonMode(enabled: boolean) {
	jsonMode = enabled;
}

export function isJsonMode(): boolean {
	return jsonMode;
}

export function output(data: unknown) {
	if (jsonMode) {
		console.log(JSON.stringify(data, null, 2));
	}
}

export function info(message: string) {
	if (!jsonMode) {
		console.log(message);
	}
}

export function error(message: string) {
	if (jsonMode) {
		console.log(JSON.stringify({ error: message }));
	} else {
		console.error(`Error: ${message}`);
	}
}

export function table(rows: Record<string, string | null>[], columns: { key: string; label: string }[]) {
	if (jsonMode) {
		console.log(JSON.stringify(rows, null, 2));
		return;
	}

	if (rows.length === 0) {
		return;
	}

	// Calculate column widths
	const widths = columns.map((col) => {
		const values = rows.map((r) => String(r[col.key] || '').length);
		return Math.max(col.label.length, ...values);
	});

	// Header
	const header = columns.map((col, i) => col.label.padEnd(widths[i]!)).join('  ');
	console.log(header);
	console.log(columns.map((_, i) => '─'.repeat(widths[i]!)).join('  '));

	// Rows
	for (const row of rows) {
		const line = columns.map((col, i) => String(row[col.key] || '—').padEnd(widths[i]!)).join('  ');
		console.log(line);
	}
}
