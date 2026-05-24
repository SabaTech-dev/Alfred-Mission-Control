/**
 * Startup configuration validation
 * Ensures critical environment variables are set before the app starts
 */

export function validateStartupConfig(): void {
  const errors: string[] = [];

  // JWT_SECRET validation
  if (!process.env.JWT_SECRET) {
    errors.push("JWT_SECRET is not set in environment variables");
  } else if (process.env.JWT_SECRET.length < 32) {
    errors.push(`JWT_SECRET must be at least 32 characters long (current: ${process.env.JWT_SECRET.length})`);
  }

  if (errors.length > 0) {
    console.error("❌ Startup configuration validation failed:");
    errors.forEach((error) => console.error(`  - ${error}`));
    console.error("\n⚠️  Please configure these environment variables before starting the app.");
    throw new Error(`Startup validation failed: ${errors.join(", ")}`);
  }

  console.log("✅ Startup configuration validation passed");
}