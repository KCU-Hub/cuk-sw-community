import { spawnSync } from "node:child_process";
import { existsSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outputPath = join(root, "src/lib/types.generated.ts");
const tempPath = `${outputPath}.tmp-${process.pid}`;
const args = ["gen", "types", "typescript", ...process.argv.slice(2)];

const result = spawnSync("supabase", args, {
  cwd: root,
  encoding: "utf8",
  maxBuffer: 20 * 1024 * 1024,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

if (!result.stdout.includes("export type Database")) {
  console.error("Supabase type generation did not produce Database types.");
  process.exit(1);
}

try {
  writeFileSync(tempPath, result.stdout);
  renameSync(tempPath, outputPath);
} catch (error) {
  if (existsSync(tempPath)) unlinkSync(tempPath);
  throw error;
}

if (result.stderr) process.stderr.write(result.stderr);
