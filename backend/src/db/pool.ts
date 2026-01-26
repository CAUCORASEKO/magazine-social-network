import { Pool } from "pg";

import { config } from "../config";

console.log("🧪 PG DATABASE_URL =", config.databaseUrl);
export const pool = new Pool({
  connectionString: config.databaseUrl
});





