/**
 * Gimbal Performance Benchmark
 *
 * Compares response times between:
 * 1. Minimal mode - Claude Agent SDK with no extras
 * 2. Full Gimbal mode - System prompt, MCP servers, project context
 *
 * Usage:
 *   # Start Gimbal server first: pnpm --filter @gimbal/server dev
 *   # Then run: pnpm exec tsx benchmarks/run.ts
 */

import { query } from "@anthropic-ai/claude-agent-sdk";

const GIMBAL_URL = "http://localhost:3001";

interface BenchmarkResult {
  prompt: string;
  minimal: { durationMs: number; error?: string };
  gimbal: { durationMs: number; error?: string };
}

const TEST_PROMPTS = [
  // Simple question - no tools needed
  { prompt: "What is the capital of Germany? Reply in one word.", label: "Simple (no tools)" },

  // Web search required
  { prompt: "What is the population of Sydney Australia? Brief answer.", label: "Web search" },

  // File system operations
  { prompt: "List the files in the project root directory.", label: "List directory" },
  { prompt: "Read the CLAUDE.md file and tell me the first line.", label: "Read file" },
  { prompt: "Create a file called test-benchmark.txt with the content 'hello world'.", label: "Write file" },
];

async function timeMinimal(
  prompt: string
): Promise<{ durationMs: number; error?: string }> {
  const start = Date.now();
  try {
    // Minimal: no system prompt, no MCP servers, no tools
    for await (const _message of query({
      prompt,
      options: {
        permissionMode: "bypassPermissions",
      },
    })) {
      // consume messages
    }
    return { durationMs: Date.now() - start };
  } catch (err) {
    return { durationMs: Date.now() - start, error: String(err) };
  }
}

async function timeGimbal(
  projectId: string,
  prompt: string
): Promise<{ durationMs: number; error?: string }> {
  const start = Date.now();
  try {
    const response = await fetch(
      `${GIMBAL_URL}/api/projects/${projectId}/query`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      }
    );
    if (!response.ok) {
      return {
        durationMs: Date.now() - start,
        error: `HTTP ${response.status}`,
      };
    }
    await response.json();
    return { durationMs: Date.now() - start };
  } catch (err) {
    return { durationMs: Date.now() - start, error: String(err) };
  }
}

async function getOrCreateTestProject(): Promise<string> {
  // List projects to find an existing one
  const listRes = await fetch(`${GIMBAL_URL}/api/projects`);
  const { projects } = (await listRes.json()) as {
    projects: Array<{ id: string; name: string }>;
  };

  if (projects.length > 0) {
    console.log(`Using existing project: ${projects[0].name}`);
    return projects[0].id;
  }

  // Create a test project
  const createRes = await fetch(`${GIMBAL_URL}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "benchmark-test",
      basePath: "~/Documents/Gimbal",
    }),
  });
  const { project } = (await createRes.json()) as {
    project: { id: string; name: string };
  };
  console.log(`Created test project: ${project.name}`);
  return project.id;
}

async function runBenchmarks() {
  console.log("Gimbal Performance Benchmark\n");
  console.log("=".repeat(60));
  console.log("Comparing: Minimal SDK vs Full Gimbal (with MCP, system prompt)");

  // Check if Gimbal server is running
  try {
    const health = await fetch(`${GIMBAL_URL}/api/health`);
    if (!health.ok) throw new Error("Server not healthy");
  } catch {
    console.error(
      "\nError: Gimbal server not running. Start it with:\n  pnpm --filter @gimbal/server dev\n"
    );
    process.exit(1);
  }

  const projectId = await getOrCreateTestProject();

  console.log(`\nProject ID: ${projectId}`);
  console.log(`Running ${TEST_PROMPTS.length} test prompts...\n`);

  const results: BenchmarkResult[] = [];

  for (const test of TEST_PROMPTS) {
    console.log(`\n[${test.label}]`);
    console.log(`Prompt: "${test.prompt.slice(0, 50)}..."`);
    console.log("-".repeat(60));

    // Only run Gimbal for file operations (minimal SDK doesn't have file access configured)
    const isFileOp = test.label.includes("directory") || test.label.includes("file");

    let minimalResult = { durationMs: 0, error: "skipped" };
    if (!isFileOp) {
      process.stdout.write("  Minimal:  ");
      minimalResult = await timeMinimal(test.prompt);
      console.log(
        minimalResult.error
          ? `ERROR (${minimalResult.error})`
          : `${minimalResult.durationMs}ms`
      );
    }

    // Run Gimbal
    process.stdout.write("  Gimbal:   ");
    const gimbalResult = await timeGimbal(projectId, test.prompt);
    console.log(
      gimbalResult.error
        ? `ERROR (${gimbalResult.error})`
        : `${gimbalResult.durationMs}ms`
    );

    // Calculate overhead (only for non-file ops)
    if (!isFileOp && !minimalResult.error && !gimbalResult.error) {
      const overhead = gimbalResult.durationMs - minimalResult.durationMs;
      const overheadPct = ((overhead / minimalResult.durationMs) * 100).toFixed(1);
      console.log(
        `  Overhead: ${overhead > 0 ? "+" : ""}${overhead}ms (${overheadPct}%)`
      );
    }

    results.push({ prompt: test.prompt, minimal: minimalResult, gimbal: gimbalResult });
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY\n");

  const validResults = results.filter(
    (r) => !r.minimal.error && !r.gimbal.error
  );
  if (validResults.length > 0) {
    const avgMinimal =
      validResults.reduce((sum, r) => sum + r.minimal.durationMs, 0) /
      validResults.length;
    const avgGimbal =
      validResults.reduce((sum, r) => sum + r.gimbal.durationMs, 0) /
      validResults.length;
    const avgOverhead = avgGimbal - avgMinimal;

    console.log(`Average Minimal: ${avgMinimal.toFixed(0)}ms`);
    console.log(`Average Gimbal:  ${avgGimbal.toFixed(0)}ms`);
    console.log(
      `Average Overhead: ${avgOverhead > 0 ? "+" : ""}${avgOverhead.toFixed(0)}ms (${((avgOverhead / avgMinimal) * 100).toFixed(1)}%)`
    );
  }

  const errors = results.filter((r) => r.minimal.error || r.gimbal.error);
  if (errors.length > 0) {
    console.log(`\nErrors: ${errors.length}/${results.length} tests had errors`);
  }
}

runBenchmarks().catch(console.error);
