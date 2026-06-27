import "@testing-library/jest-dom";
import { vi, afterEach } from "vitest";

// Enable React's act() environment so @testing-library/react works with
// React 19 under Vitest (otherwise "React.act is not a function").
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Set up environment variables for tests before any modules load
vi.stubEnv("JWT_SECRET", "test-secret-key-min-32-chars-long-12345");
vi.stubEnv("AUTH_SECRET", "test-auth-secret-key-min-32-chars-long");

vi.mock("server-only", () => ({}));

// Global cleanup after each test: reset activities-db singleton
afterEach(async () => {
  try {
    const activitiesDb = await import("@/lib/activities-db");
    if (activitiesDb.resetDbForTesting) {
      activitiesDb.resetDbForTesting();
    }
  } catch {
    // Ignore if activities-db hasn't been imported
  }
});

