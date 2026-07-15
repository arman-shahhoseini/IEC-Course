/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Build-time flag exposing the server-side `DEMO_MODE` env var to the
   * client bundle. Replaced by Vite's `define` in `vite.config.ts` with
   * the literal boolean value at build time.
   *
   * UX-only — controls whether the `/demo` link is shown in the Navbar.
   * The actual demo OTP behavior (returning `devCode` from the API) is
   * enforced server-side in `src/server/auth/actions.server.ts`.
   */
  readonly DEMO_MODE: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
