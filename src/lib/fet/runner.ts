import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Project, Timetable } from "./types";
import { generateFetFile } from "./generator";
import { parseFetOutput } from "./parser";
import { fallbackSchedule } from "./scheduler";

export interface RunOptions {
  /** Override the binary path. Defaults to auto-detect. */
  binaryPath?: string;
  /** Hard limit in seconds for the FET process. */
  timeoutSeconds?: number;
  /** Force the fallback scheduler (skip fet-cli). */
  forceFallback?: boolean;
}

export interface RunResult {
  timetable: Timetable;
  usedEngine: "fet" | "fallback";
  fetVersion?: string;
  warnings: string[];
  log: string;
}

// Detect whether the fet CLI binary is available and return its path.
// FET ships several binary names depending on platform/build:
//   - fet            (Linux/macOS GUI+CLI build)
//   - fet-cl         (Linux/macOS command-line build)
//   - fet-cli        (some distros rename it)
//   - fet.exe        (Windows GUI build — not usable headless)
//   - fet-cl.exe     (Windows command-line build — the one to use on Windows)
// We probe each candidate on PATH (and a few common absolute locations)
// by running it with --version.
export async function detectFetBinary(
  explicit?: string
): Promise<{ path: string | null; version: string | null }> {
  const candidates = explicit
    ? [explicit]
    : [
        "fet-cl",        // Windows console build (also resolves fet-cl.exe on Windows)
        "fet-cl.exe",    // explicit Windows console build name
        "fet",           // generic / Linux / macOS
        "fet-cli",       // alternate name used by some packagers
        "/usr/bin/fet",
        "/usr/local/bin/fet",
        "/usr/bin/fet-cl",
        "/usr/local/bin/fet-cl",
        "/opt/fet/fet",
        "/opt/fet/fet-cl",
      ];
  for (const bin of candidates) {
    // Try --version first; some FET builds only respond to --help or print
    // version info to stderr on any invocation.
    const probeArgs = [["--version"], ["--help"], ["-v"]];
    let detected: { path: string; version: string | null } | null = null;
    for (const args of probeArgs) {
      try {
        const { stdout, stderr } = await run(bin, args, 8);
        const out = `${stdout}\n${stderr}`.trim();
        const vMatch = out.match(/(\d+\.\d+\.\d+)/);
        // Accept the match as long as the process ran and produced some
        // output containing "fet" or a version number. This avoids false
        // positives from unrelated `fet` binaries.
        if (out.length > 0 && (/fet/i.test(out) || vMatch || args[0] === "--version")) {
          detected = { path: bin, version: vMatch ? vMatch[1] : null };
          break;
        }
      } catch {
        /* try next probe arg or candidate */
      }
    }
    if (detected) return detected;
  }
  return { path: null, version: null };
}

// Run the full generation pipeline for a project.
export async function runGeneration(
  project: Project,
  opts: RunOptions = {}
): Promise<RunResult> {
  const log: string[] = [];
  log.push(`[${ts()}] Starting timetable generation for "${project.name}"`);

  // Try the real FET binary first.
  if (!opts.forceFallback) {
    const { path: bin, version } = await detectFetBinary(opts.binaryPath);
    if (bin) {
      log.push(`[${ts()}] Found FET binary: ${bin} (version ${version ?? "?"})`);
      try {
        const result = await runFetCli(bin, project, opts.timeoutSeconds ?? 120, log);
        return {
          timetable: result.timetable,
          usedEngine: "fet",
          fetVersion: version ?? undefined,
          warnings: result.warnings,
          log: log.join("\n"),
        };
      } catch (e) {
        log.push(
          `[${ts()}] FET run failed: ${(e as Error).message}. Falling back to internal scheduler.`
        );
      }
    } else {
      log.push(
        `[${ts()}] FET binary not found on PATH. Using internal fallback scheduler.`
      );
    }
  }

  // Fallback scheduler
  const tt = fallbackSchedule(project);
  log.push(
    `[${ts()}] Fallback scheduler placed ${tt.entries.length}/${project.activities.filter((a) => a.active).length} activities (${tt.unassigned.length} unassigned).`
  );
  return {
    timetable: tt,
    usedEngine: "fallback",
    warnings: tt.warnings,
    log: log.join("\n"),
  };
}

async function runFetCli(
  bin: string,
  project: Project,
  timeoutSeconds: number,
  log: string[]
): Promise<{ timetable: Timetable; warnings: string[] }> {
  const workDir = mkdtempSync(join(tmpdir(), "fet-"));
  const inputFile = join(workDir, "input.fet");
  const outDir = join(workDir, "out");
  try {
    const xml = generateFetFile(project);
    writeFileSync(inputFile, xml, "utf8");
    log.push(`[${ts()}] Wrote .fet file (${xml.length} bytes)`);

    const args = [
      `--inputfile=${inputFile}`,
      `--outputdir=${outDir}`,
      "--verbose",
    ];
    log.push(`[${ts()}] Running: ${bin} ${args.join(" ")}`);

    const { stdout, stderr } = await run(bin, args, timeoutSeconds);
    const combined = `${stdout}\n${stderr}`;
    log.push(`[${ts()}] FET finished. Output length: ${combined.length} bytes`);

    if (!existsSync(outDir)) {
      throw new Error("FET did not create an output directory.");
    }

    const parsed = parseFetOutput(outDir, project);
    log.push(
      `[${ts()}] Parsed ${parsed.timetable.entries.length} scheduled activities, ${parsed.timetable.unassigned.length} unassigned.`
    );
    return parsed;
  } finally {
    // Best-effort cleanup
    try {
      rmSync(workDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

function run(bin: string, args: string[], timeoutSeconds: number) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    // On Windows, spawning needs `shell: true` so that `fet-cl` resolves to
    // `fet-cl.exe` via PATH and so .bat/.cmd wrappers work. On Unix we keep
    // shell:false for safety with the arg vector.
    const isWindows = process.platform === "win32";
    const child = spawn(bin, args, {
      env: process.env,
      cwd: process.cwd(),
      shell: isWindows,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        child.kill(isWindows ? "SIGKILL" : "SIGTERM");
      } catch {
        /* ignore */
      }
      reject(new Error(`Process timed out after ${timeoutSeconds}s`));
    }, timeoutSeconds * 1000);

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", (e) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code === 0 || code === 1) {
        // FET sometimes returns 1 even on success
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Process exited with code ${code}. ${stderr.slice(0, 500)}`));
      }
    });
  });
}

function ts(): string {
  return new Date().toISOString().slice(11, 19);
}
