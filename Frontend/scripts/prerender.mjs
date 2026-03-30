import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "dist");
const routesManifest = path.join(distDir, "prerender-routes.json");

const HOST = "127.0.0.1";
const PORT = Number(process.env.PRERENDER_PORT || 4173);
const BASE_URL = `http://${HOST}:${PORT}`;

const MIME_TYPES = {
  ".html": "text/html; charset=UTF-8",
  ".js": "application/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=UTF-8",
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

async function fileExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getRoutes() {
  if (!(await fileExists(routesManifest))) {
    return ["/"];
  }

  const text = await readFile(routesManifest, "utf8");
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) {
    return ["/"];
  }

  const routes = parsed
    .filter((value) => typeof value === "string" && value.startsWith("/"))
    .map((value) => (value === "/" ? "/" : value.replace(/\/$/, "")));

  return Array.from(new Set(routes));
}

function createStaticServer() {
  return createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url || "/", BASE_URL);
      const sanitizedPath = decodeURIComponent(requestUrl.pathname).replace(
        /^\/+/,
        "",
      );

      const directFilePath = path.join(distDir, sanitizedPath);
      const indexFilePath = path.join(distDir, sanitizedPath, "index.html");
      const fallbackIndex = path.join(distDir, "index.html");

      let filePath = fallbackIndex;

      if (await fileExists(directFilePath)) {
        filePath = directFilePath;
      } else if (await fileExists(indexFilePath)) {
        filePath = indexFilePath;
      }

      const content = await readFile(filePath);
      res.statusCode = 200;
      res.setHeader("Content-Type", getMimeType(filePath));
      res.end(content);
    } catch {
      res.statusCode = 500;
      res.end("Server error");
    }
  });
}

function routeToOutputFile(route) {
  if (route === "/") {
    return path.join(distDir, "index.html");
  }

  const normalized = route.replace(/^\/+/, "");
  return path.join(distDir, normalized, "index.html");
}

async function ensureParentDir(filePath) {
  const fs = await import("node:fs/promises");
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function main() {
  const routes = await getRoutes();
  const server = createStaticServer();

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(PORT, HOST, () => resolve());
  });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    for (const route of routes) {
      const url = `${BASE_URL}${route}`;
      await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
      const html = await page.content();

      const outputFile = routeToOutputFile(route);
      await ensureParentDir(outputFile);
      await (
        await import("node:fs/promises")
      ).writeFile(outputFile, `${html}\n`, "utf8");

      console.log(`Prerendered ${route} -> ${outputFile}`);
    }

    console.log(`Prerender complete. Total routes: ${routes.length}`);
  } finally {
    await context.close();
    await browser.close();
    await new Promise((resolve) => server.close(() => resolve()));
  }
}

main().catch((error) => {
  console.error("Prerender failed:", error.message);
  process.exit(1);
});
