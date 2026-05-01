import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export interface AttachmentExtractionResult {
  status: "ok" | "unsupported" | "error";
  text: string;
  fileType?: string;
  warnings: string[];
  error?: string;
}

export async function extractAttachmentText(input: {
  bytes: Buffer | null;
  fileName: string;
}): Promise<AttachmentExtractionResult> {
  if (!input.bytes || input.bytes.length === 0) {
    return { status: "unsupported", text: "", warnings: ["Attachment has no file bytes"] };
  }

  const tempDir = await mkdtemp(path.join(tmpdir(), "alleato-graph-attachment-"));
  const filePath = path.join(tempDir, safeFileName(input.fileName));

  try {
    await writeFile(filePath, input.bytes);
    return await runPythonExtractor(filePath, input.fileName);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function runPythonExtractor(filePath: string, fileName: string): Promise<AttachmentExtractionResult> {
  const repoRoot = process.cwd();
  const child = spawn(
    process.env.PYTHON ?? "python3",
    [
      "-m",
      "src.services.integrations.microsoft_graph.cli_extract_attachment_text",
      "--path",
      filePath,
      "--name",
      fileName,
    ],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        PYTHONPATH: [path.join(repoRoot, "backend"), process.env.PYTHONPATH].filter(Boolean).join(path.delimiter),
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => {
      const parsed = parseExtractorOutput(stdout);
      if (code === 0 && parsed) {
        resolve(parsed);
        return;
      }
      if (parsed) {
        resolve({
          ...parsed,
          status: "error",
          error: parsed.error ?? (stderr.trim() || `Extractor exited with code ${code}`),
        });
        return;
      }
      reject(new Error(`Attachment extractor failed with code ${code}: ${stderr.trim() || stdout.trim()}`));
    });
  });
}

function parseExtractorOutput(stdout: string): AttachmentExtractionResult | null {
  const line = stdout
    .split("\n")
    .map((part) => part.trim())
    .filter(Boolean)
    .at(-1);
  if (!line) return null;
  const parsed = JSON.parse(line) as {
    status?: string;
    text?: string;
    file_type?: string;
    warnings?: string[];
    error?: string;
  };
  if (parsed.status !== "ok" && parsed.status !== "unsupported" && parsed.status !== "error") {
    throw new Error(`Unexpected extractor status: ${parsed.status}`);
  }
  return {
    status: parsed.status,
    text: parsed.text ?? "",
    fileType: parsed.file_type,
    warnings: parsed.warnings ?? [],
    error: parsed.error,
  };
}

function safeFileName(fileName: string): string {
  return fileName.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 180) || "attachment";
}
