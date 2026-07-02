import { setApiBaseUrl } from '@repo/api-client';

import { buildConfig } from '../config/buildConfig';

/**
 * Set the initial API base URL used for the very first manifest fetch (before the manifest supplies
 * the tenant's own `endpoints.apiBaseUrl`). Imported for its side effect at app startup. Player auth
 * (`configureApiAuth`) is wired in P4.3.
 */
setApiBaseUrl(buildConfig.apiBaseUrl);
