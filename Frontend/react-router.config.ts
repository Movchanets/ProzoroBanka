import type { Config } from "@react-router/dev/config";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

export default {
  // Config options...
  ssr: false,
  prerender: async () => {
    const staticRoutes = [
      "/",
      "/login",
      "/register",
      "/forgot-password",
      "/reset-password",
    ];

    const manifestPath = path.join(
      process.cwd(),
      "public",
      "prerender-routes.json",
    );

    if (existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
        if (Array.isArray(manifest)) {
          return Array.from(new Set([...staticRoutes, ...manifest]));
        }
      } catch (e) {
        console.warn("Failed to parse prerender-routes.json", e);
      }
    }

    return staticRoutes;
  },
  appDirectory: "src",
} satisfies Config;
