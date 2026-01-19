import { app } from "./app";
import { config } from "./config";

if (!process.env.DEV_USER_ID) {
  console.warn(
    "DEV_USER_ID is not set. Authenticated routes require the x-user-id header."
  );
}

app.listen(config.port, () => {
  console.log(`API listening on port ${config.port}`);
});
