import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { resolve } from "node:path";

const file = resolve("apps/mobile/preview/index.html");
const port = Number(process.env.MOBILE_PREVIEW_PORT ?? 4173);

createServer((_request, response) => {
  response.setHeader("content-type", "text/html; charset=utf-8");
  createReadStream(file).pipe(response);
}).listen(port, () => {
  console.log(`Mobile preview frame: http://localhost:${port}`);
  console.log("Start Expo web separately with: pnpm mobile:web");
});
