import { Platform } from 'react-native';

/**
 * Make a stored asset URL loadable from the current device. On the Android emulator, `localhost`
 * (and `127.0.0.1`) refer to the emulator itself, so media served by a dev MinIO/S3 on the host
 * won't load — rewrite those to `10.0.2.2` (the host loopback), matching how the API base URL is
 * resolved. Real/CDN hosts and https URLs pass through unchanged. Empty/undefined → undefined so
 * callers can fall back to a themed placeholder.
 */
export function resolveAssetUri(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (Platform.OS === 'android') {
    return url.replace('://localhost', '://10.0.2.2').replace('://127.0.0.1', '://10.0.2.2');
  }
  return url;
}
