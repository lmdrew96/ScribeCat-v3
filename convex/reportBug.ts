/**
 * reportBug - HTTP action to create a GitHub Issue from a user bug report.
 * Requires GITHUB_TOKEN (PAT with public_repo scope) and GITHUB_REPO (owner/repo)
 * set in Convex Dashboard environment variables.
 */

import { httpAction } from './_generated/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

interface BugReportBody {
  title: string;
  description: string;
  userDisplayName?: string;
  browserInfo: string;
  appVersion: string;
  pageUrl: string;
}

export const reportBug = httpAction(async (_ctx, request) => {
  const githubToken = process.env.GITHUB_TOKEN;
  const githubRepo = process.env.GITHUB_REPO;

  if (!githubToken || !githubRepo) {
    return new Response(
      JSON.stringify({ success: false, error: 'Bug reporting is not configured.' }),
      { status: 503, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  let body: BugReportBody;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Invalid request body.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const { title, description, userDisplayName, browserInfo, appVersion, pageUrl } = body;

  if (!title?.trim() || !description?.trim()) {
    return new Response(
      JSON.stringify({ success: false, error: 'Title and description are required.' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  const reportedAt = new Date().toISOString();
  const reporter = userDisplayName?.trim() || 'Anonymous';

  const issueBody = `## Bug Report

${description.trim()}

---

| Field | Value |
|-------|-------|
| **Reporter** | ${reporter} |
| **App Version** | ${appVersion} |
| **Browser** | \`${browserInfo}\` |
| **Page** | \`${pageUrl}\` |
| **Reported at** | ${reportedAt} |
`;

  try {
    const response = await fetch(`https://api.github.com/repos/${githubRepo}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        title: title.trim().slice(0, 256),
        body: issueBody,
        labels: ['bug', 'user-report'],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create GitHub issue.' }),
        { status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      );
    }

    const issue = await response.json();

    return new Response(
      JSON.stringify({
        success: true,
        issueNumber: issue.number,
        issueUrl: issue.html_url,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('reportBug error:', message);
    return new Response(JSON.stringify({ success: false, error: 'Failed to submit report.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
