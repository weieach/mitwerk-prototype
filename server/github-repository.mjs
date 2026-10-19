import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const repositoryPattern = /^[\w.-]+\/[\w.-]+$/;

/** Vercel source checkouts may have neither Git history nor an origin remote. */
export async function githubRepository(root, env = process.env) {
  if (env.VERCEL_GIT_PROVIDER === 'github' || !env.VERCEL_GIT_PROVIDER) {
    const owner = env.VERCEL_GIT_REPO_OWNER;
    const slug = env.VERCEL_GIT_REPO_SLUG;
    if (owner && slug && repositoryPattern.test(`${owner}/${slug}`)) return `${owner}/${slug}`;
  }

  try {
    const { stdout } = await execFileAsync('git', ['remote', 'get-url', 'origin'], { cwd: root });
    const repo = /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([\w.-]+\/[\w.-]+?)(?:\.git)?$/i.exec(stdout.trim())?.[1];
    if (repo) return repo;
  } catch { /* A source-only deployment has no usable local remote. */ }

  throw new Error('Cannot identify the GitHub repository for saved prototypes. Provide VERCEL_GIT_REPO_OWNER and VERCEL_GIT_REPO_SLUG, or a GitHub origin remote.');
}
