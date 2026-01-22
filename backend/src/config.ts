const databaseUrl = process.env.DATABASE_URL;
const sessionSecret = process.env.SESSION_SECRET;
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:3001";

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to start the API.");
}

if (!sessionSecret) {
  throw new Error("SESSION_SECRET is required to start the API.");
}

export const config = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl,
  sessionSecret,
  frontendOrigin
};
