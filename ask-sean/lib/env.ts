/** Load .env for CLI scripts. Next.js loads it on its own, and existing variables win. */
export function loadEnv(): void {
  try {
    process.loadEnvFile(".env");
  } catch {
    // No .env file: rely on variables already in the environment.
  }
}

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}. Set it in .env (see .env.example).`);
  }
  return value;
}
