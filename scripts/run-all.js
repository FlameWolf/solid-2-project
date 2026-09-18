import { spawn } from "node:child_process";

let shuttingDown = false;
const isWindows = process.platform === "win32";
const modes = {
	dev: [
		{ name: "vercel", command: "vercel dev" },
		{ name: "vite", command: "vite" }
	],
	preview: [
		{ name: "vercel", command: "vercel dev" },
		{ name: "vite", command: "vite preview" }
	]
};
const mode = process.argv[2] ?? "dev";
const services = modes[mode];
if (!services) {
	console.error(`[run-all] Unknown mode "${mode}". Expected one of: ${Object.keys(modes).join(", ")}.`);
	process.exit(1);
}
const children = services.map(({ name, command }) => {
	const child = spawn(command, {
		stdio: "inherit",
		shell: true,
		detached: !isWindows
	});
	child.on("exit", code => {
		if (!shuttingDown) {
			console.log(`\n[run-all] ${name} exited (${code ?? "via signal"}); stopping the rest.`);
			shutdown();
		}
	});
	return child;
});

function shutdown() {
	if (shuttingDown) {
		return;
	}
	shuttingDown = true;
	for (const child of children) {
		if (!child.pid || child.exitCode !== null || child.signalCode !== null) {
			continue;
		}
		if (isWindows) {
			spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "overlapped" });
		} else {
			try {
				process.kill(-child.pid, "SIGTERM");
			} catch {
				console.error(`Failed to kill child process with ID: ${child.pid}`, err);
			}
		}
	}
	const forceExit = setTimeout(() => {
		console.error("[run-all] Children did not exit in time; forcing shutdown.");
		process.exit(1);
	}, 5000);
	forceExit.unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);