package com.mobile

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule

/**
 * Exposes the per-flavor tenant identity compiled into this binary (H6 white-label packaging)
 * to JS as constants. src/config/buildConfig.ts prefers these over its .env/dev fallbacks, so
 * every tenant flavor ships the same JS bundle.
 */
class TenantBuildConfigModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "TenantBuildConfig"

  override fun getConstants(): Map<String, Any?> =
    mapOf(
      "tenantId" to BuildConfig.TENANT_ID,
      "tenantSlug" to BuildConfig.TENANT_SLUG,
      "apiBaseUrl" to BuildConfig.API_BASE_URL,
      "appName" to reactApplicationContext.getString(R.string.app_name),
      "appVersion" to BuildConfig.VERSION_NAME,
    )
}
