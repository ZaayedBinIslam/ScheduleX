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
        const result = await runFetCli(bin, project, opts.timeoutSeconds ?? 120, log);
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

    const args = [
      `--inputfile=${inputFile}`,
      `--outputdir=${outDir}`,
      "--verbose",
    ];
    log.push(`[${ts()}] Running: ${bin} ${args.join(" ")}`);

    const { stdout, stderr } = await run(bin, args, timeoutSeconds);
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
