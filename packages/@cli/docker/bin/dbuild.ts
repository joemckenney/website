#!/usr/bin/env bun

import { buildLocal } from "../src/build";
import { colors } from "../src/utils/colors";

function printHelp(): void {
	console.log(`
${colors.blue("dbuild")} - Docker image builder for monorepo packages

${colors.yellow("Usage:")}
  dbuild --image <name> [options]

${colors.yellow("Options:")}
  --image <name>           Image name (required)
  --tag <tag>              Image tag (default: "latest")
  --build-arg <KEY=VALUE>  Build argument (repeatable)
  -h, --help               Show this help message

${colors.yellow("Examples:")}
  dbuild --image api-service
  dbuild --image app-web --build-arg VITE_API_URL=http://api.local.com
  dbuild --image api-service --tag my-feature
`);
}

const args = process.argv.slice(2);

if (args.includes("-h") || args.includes("--help") || args.length === 0) {
	printHelp();
	process.exit(0);
}

function getFlag(name: string): string | undefined {
	const index = args.indexOf(name);
	return index !== -1 && args[index + 1] ? args[index + 1] : undefined;
}

function getAllFlags(name: string): string[] {
	const values: string[] = [];
	for (let i = 0; i < args.length; i++) {
		if (args[i] === name && args[i + 1]) {
			values.push(args[i + 1]);
		}
	}
	return values;
}

const image = getFlag("--image");
if (!image) {
	console.error(colors.red("Missing required --image flag"));
	process.exit(1);
}

const tag = getFlag("--tag") ?? "latest";
const buildArgs = getAllFlags("--build-arg");

await buildLocal(image, tag, buildArgs);
