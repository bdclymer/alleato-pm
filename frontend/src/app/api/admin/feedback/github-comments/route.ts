import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const issueNumber = searchParams.get("issueNumber");

  if (!issueNumber) {
    return NextResponse.json(
      { error: "issueNumber query param is required" },
      { status: 400 },
    );
  }

  const owner = process.env.GITHUB_FEEDBACK_REPO_OWNER;
  const repo = process.env.GITHUB_FEEDBACK_REPO_NAME;
  const token = process.env.GITHUB_FEEDBACK_TOKEN;

  if (!owner || !repo) {
    return NextResponse.json(
      { error: "GitHub feedback repo not configured" },
      { status: 500 },
    );
  }

  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "alleato-pm-feedback",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
      { headers, next: { revalidate: 30 } },
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `GitHub API error: ${res.status}`, detail: text },
        { status: res.status },
      );
    }

    const comments = await res.json();
    return NextResponse.json({ comments });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to fetch GitHub comments",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
