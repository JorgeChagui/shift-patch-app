import { setupTestDb } from "./test-db";

// `npm run db:test:setup`: create and migrate the API test database.
setupTestDb()
  .then(() => console.log("Test database is ready."))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
