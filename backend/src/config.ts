const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to start the API.");
}

export const config = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl
};
