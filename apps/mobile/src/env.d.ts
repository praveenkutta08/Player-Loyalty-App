/** Types for the react-native-dotenv virtual module (`@env`). Keys are optional — a missing
 * apps/mobile/.env yields `undefined`, and buildConfig.ts falls back to the demo values. */
declare module '@env' {
  /** Seeded demo tenant UUID (X-Tenant for the manifest fetch). See docs/RUNNING.md step 4. */
  export const TENANT_ID: string | undefined;
  /** Override the dev API host, e.g. http://192.168.1.50:8000 for a physical device. */
  export const API_HOST: string | undefined;
}
