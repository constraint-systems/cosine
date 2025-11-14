import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import viteTsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

const config = defineConfig({
  plugins: [
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    tanstackStart(),
    nitro({
      preset: "node-server",
      rollupConfig: {
        external: ['pg', 'pg-native', 'pg/lib', 'drizzle-orm/node-postgres', 'sharp']
      },
      port: 8008,
    }),
    viteReact(),
  ],
  ssr: {
    noExternal: [],
    external: ['pg', 'pg-native', 'drizzle-orm', 'sharp']
  },
  server: {
    allowedHosts: ["cosine.local"]
  },
});

export default config;
