import app from "./app.js";
import { env } from "./config/env.js";

app.listen(env.PORT, () => {
  console.info(`JalSaathi API running on http://localhost:${env.PORT}`);
});
