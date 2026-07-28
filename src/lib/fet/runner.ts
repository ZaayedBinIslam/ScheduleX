import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Project, Timetable } from "./types";
import { generateFetFile } from "./generator";
import { parseFetOutput } from "./parser";
import { fallbackSchedule } from "./scheduler";

export interface RunOptions {
  /** Override the binary path. Defaults to auto-detect. */
  binaryPath?: string;
  /** Time budget in seconds given to the solver. */
  timeoutSeconds?: number;
  /** Force the fallback scheduler (skip fet-cli). */
  forceFallback?: boolean;
}

/**
 * Time budget used when the caller does not specify one. Matches the default
 * shown in the generate UI so the two never disagree.
 */
export const DEFAULT_TIMEOUT_SECONDS = 300;

/**
 * Extra time the watchdog allows on top of the solver's own time limit.
 *
 * fet-cl stops itself at --timelimitseconds and then spends a little longer
 * writing out the HTML/XML timetables, so the watchdog must not fire during
 * that write phase. It exists only to catch a genuinely wedged process.
 */
const WATCHDOG_GRACE_SECONDS = 60;

export interface RunResult {
  timetable: Timetable;
  usedEngine: "fet" | "fallback";
  fetVersion?: string;
  warnings: string[];
  log: string;
}

function windowsFetCandidates(): string[] {
  const roots = [
    "C:\\Program Files\\FET",
    "C:\\Program Files (x86)\\FET",
    "C:\\Program Files\\fet",
    "D:\\Programs\\fet",
  ];
  const out: string[] = [];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    // direct
    for (const exe of ["fet-cl.exe", "fet-cl.bat", "fet.exe"]) {
      const p = join(root, exe);
      if (existsSync(p)) out.push(p);
    }
    // versioned subfolders (e.g. fet-7.8.7)
    try {
      for (const sub of readdirSync(root)) {
        for (const exe of ["fet-cl.exe", "fet-cl.bat"]) {
          const p = join(root, sub, exe);
          if (existsSync(p)) out.push(p);
        }
      }
    } catch {
      /* ignore */
    }
  }
  return out;
}

// Detect whether the fet CLI binary is available and return its path.
export async function detectFetBinary(
  explicit?: string
): Promise<{ path: string | null; version: string | null }> {
  let candidates: string[] = [];

  if (explicit) {
    candidates = [explicit];
  } else {
    const envPath = process.env.FET_BINARY_PATH;
    if (envPath) {
      candidates.push(envPath);
    }
    candidates.push("fet-cl", "fet-cl.exe", "fet", "fet-cli");
    if (process.platform === "win32") {
      candidates.push(...windowsFetCandidates());
    } else {
      candidates.push(
        "/usr/bin/fet",
        "/usr/local/bin/fet",
        "/usr/bin/fet-cl",
        "/usr/local/bin/fet-cl",
        "/opt/fet/fet",
        "/opt/fet/fet-cl"
      );
    }
  }

  for (const bin of candidates) {
    const probeArgs = [["--version"], ["--help"], ["-v"]];
    let detected: { path: string; version: string | null } | null = null;
    for (const args of probeArgs) {
      try {
        const { stdout, stderr } = await run(bin, args, 8);
        const out = `${stdout}\n${stderr}`.trim();
        const vMatch = out.match(/(\d+\.\d+\.\d+)/);
        // Require output to contain /fet/i or a version number (remove --version catch-all)
        if (out.length > 0 && (/fet/i.test(out) || vMatch)) {
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
  const startTime = Date.now();
  const log: string[] = [];
  const warnings: string[] = [];
  log.push(`[${ts()}] Starting timetable generation for "${project.name}"`);

  // Try the real FET binary first.
  if (!opts.forceFallback) {
    const { path: bin, version } = await detectFetBinary(opts.binaryPath);
    if (bin) {
      log.push(`[${ts()}] Found FET binary: ${bin} (version ${version ?? "?"})`);
      try {
        const result = await runFetCli(
          bin,
          project,
          opts.timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS,
          log
        );
        const durationMs = Date.now() - startTime;
        result.timetable.durationMs = durationMs;
        log.push(`[${ts()}] Generation completed in ${durationMs}ms`);
        return {
          timetable: result.timetable,
          usedEngine: "fet",
          fetVersion: version ?? undefined,
          warnings: result.warnings,
          log: log.join("\n"),
        };
      } catch (e) {
        const errMsg = (e as Error).message;
        log.push(
          `[${ts()}] FET run failed: ${errMsg}. Falling back to internal scheduler.`
        );
        warnings.push(
          `FET engine reported an error and was not used: ${errMsg.split("\n")[0]}. Showing fallback-scheduler result.`
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
  const durationMs = Date.now() - startTime;
  tt.durationMs = durationMs;
  log.push(
    `[${ts()}] Fallback scheduler placed ${tt.entries.length}/${project.activities.filter((a) => a.active).length} activities (${tt.unassigned.length} unassigned) in ${durationMs}ms.`
  );
  return {
    timetable: tt,
    usedEngine: "fallback",
    warnings: [...warnings, ...tt.warnings],
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

    // Let fet-cl enforce the time budget itself: on reaching --timelimitseconds
    // it stops searching, writes the best timetable it found and exits 0. Killing
    // the process from the outside instead would discard that partial result.
    const solverSeconds = Math.max(1, Math.floor(timeoutSeconds));
    const args = [
      `--inputfile=${inputFile}`,
      `--outputdir=${outDir}`,
      `--timelimitseconds=${solverSeconds}`,
      // Must be --verbose=true; a bare --verbose is rejected as unrecognized.
      "--verbose=true",
    ];
    log.push(
      `[${ts()}] Time budget: ${solverSeconds}s (watchdog at ${solverSeconds + WATCHDOG_GRACE_SECONDS}s)`
    );
    log.push(`[${ts()}] Running: ${bin} ${args.join(" ")}`);

    const { stdout, stderr } = await run(
      bin,
      args,
      solverSeconds + WATCHDOG_GRACE_SECONDS
    );
    const combined = `${stdout}\n${stderr}`;
    log.push(`[${ts()}] FET finished. Output length: ${combined.length} bytes`);

    // Surface detailed errors from FET's logs/errors.txt if present
    const errorLogPath = join(outDir, "logs", "errors.txt");
    const warningLogPath = join(outDir, "logs", "warnings.txt");
    let fetErrors = "";
    let fetWarnings: string[] = [];

    if (existsSync(errorLogPath)) {
      try {
        const raw = readFileSync(errorLogPath, "utf8")
          .replace(/^\uFEFF/, "")
          .replace(/\0/g, "")
          .trim();
        if (raw) fetErrors = raw;
      } catch {
        /* ignore */
      }
    }

    if (existsSync(warningLogPath)) {
      try {
        const raw = readFileSync(warningLogPath, "utf8")
          .replace(/^\uFEFF/, "")
          .replace(/\0/g, "")
          .trim();
        if (raw) {
          fetWarnings = raw.split("\n").map((s) => s.trim()).filter(Boolean);
        }
      } catch {
        /* ignore */
      }
    }

    if (fetErrors) {
      throw new Error(`FET Engine Error: ${fetErrors}`);
    }

    if (!existsSync(outDir)) {
      throw new Error("FET did not create an output directory.");
    }

    const parsed = parseFetOutput(outDir, project);
    parsed.warnings.push(...fetWarnings);

    // FET prints "Time exceeded" when it hit --timelimitseconds. The timetable it
    // wrote is then the best partial result rather than a complete solution, so
    // say so instead of presenting it as a finished timetable.
    if (/Time exceeded/i.test(combined)) {
      log.push(
        `[${ts()}] FET stopped at the ${solverSeconds}s time budget; result is the best timetable found so far.`
      );
      parsed.warnings.push(
        `FET reached the ${formatBudget(solverSeconds)} time budget before finding a complete timetable. This is the best result it found — raise the timeout and generate again to keep searching.`
      );
    }

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
    const isWindows = process.platform === "win32";
    // On Windows, if bin ends with .bat or .cmd we use shell: true.
    // Otherwise, spawn directly with shell: false so arguments with spaces (like tmpdir paths)
    // are passed cleanly without shell word-splitting.
    const isBat = /\.bat$|\.cmd$/i.test(bin);
    const useShell = isWindows && isBat;

    const child = spawn(bin, args, {
      env: process.env,
      cwd: process.cwd(),
      shell: useShell,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      // SIGTERM asks fet-cl to write its timetable and exit; on Windows Node has
      // no real signals and terminates the process outright. Either way we are
      // past the solver's own limit, so this only fires on a wedged process.
      try {
        child.kill("SIGTERM");
      } catch {
        /* ignore */
      }
      if (!isWindows) {
        setTimeout(() => {
          try {
            child.kill("SIGKILL");
          } catch {
            /* ignore */
          }
        }, 5000).unref?.();
      }
      reject(
        new Error(
          `FET did not exit ${timeoutSeconds}s after starting and was stopped.`
        )
      );
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

// Render a seconds budget the way the user entered it ("5 minute", "90 second").
function formatBudget(seconds: number): string {
  if (seconds % 60 === 0) {
    const mins = seconds / 60;
    return `${mins} minute${mins === 1 ? "" : "s"}`;
  }
  return `${seconds} seconds`;
}
