import { defineConfig, loadEnv } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";

export default defineConfig(({ mode }) => {
  // loadEnv reads .env, .env.[mode], .env.local — same source Vite uses
  // for `import.meta.env`. We use it here so the `define` replacement
  // picks up `DEMO_MODE` from the project .env file (Vite does NOT
  // populate `process.env` from .env files when evaluating the config).
  const env = loadEnv(mode, process.cwd(), "");
  const demoMode = env.DEMO_MODE === "true";

  return {
    plugins: [
      tanstackRouter({
        target: "react",
        autoCodeSplitting: false,
      }),
      tanstackStart(),
      nitro({
        preset: "vercel",
      }),
      viteReact(),
      tailwindcss(),
      tsConfigPaths(),
    ],
    define: {
      // Expose DEMO_MODE to the client bundle as a build-time constant.
      // Replaced by Vite at build time — no runtime cost.
      //
      // UX-only — controls whether the `/demo` link is shown in the
      // Navbar/Footer. The actual demo OTP behavior (returning
      // `devCode` from the API) is enforced server-side in
      // `src/server/auth/actions.server.ts` and is unaffected by this
      // client flag.
      "import.meta.env.DEMO_MODE": JSON.stringify(demoMode),
    },
    build: {
      target: "es2022",
    },
  };
});
