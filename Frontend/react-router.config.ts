import type { Config } from "@react-router/dev/config";

export default {
  // Config options...
  ssr: false,
  prerender: async () => {
    return ["/"];
  },
  appDirectory: "src",
} satisfies Config;
