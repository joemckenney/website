/**
 * Terminal colors for CLI output
 */
export const colors = {
	red: (text: string) => `\x1b[0;31m${text}\x1b[0m`,
	green: (text: string) => `\x1b[0;32m${text}\x1b[0m`,
	yellow: (text: string) => `\x1b[1;33m${text}\x1b[0m`,
	blue: (text: string) => `\x1b[0;34m${text}\x1b[0m`,
	dim: (text: string) => `\x1b[2m${text}\x1b[0m`,
};

export const symbols = {
	success: colors.green("✓"),
	error: colors.red("✗"),
	warning: colors.yellow("⚠"),
	bullet: "•",
};

export function header(text: string): void {
	console.log(colors.blue(`=== ${text} ===`));
	console.log();
}

export function step(text: string): void {
	console.log(colors.yellow(text));
}

export function success(text: string): void {
	console.log(`  ${symbols.success} ${text}`);
}

export function error(text: string): void {
	console.log(`  ${symbols.error} ${text}`);
}

export function warning(text: string): void {
	console.log(`  ${symbols.warning} ${text}`);
}

export function info(text: string): void {
	console.log(`  ${text}`);
}
