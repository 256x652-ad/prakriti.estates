import { beforeAll, afterAll, afterEach } from "vitest";

beforeAll(async () => {
  // Global test setup: e.g. initialize test environment variables
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/test_db";
});

afterEach(async () => {
  // Clear mocks between test runs
});

afterAll(async () => {
  // Teardown connections
});
