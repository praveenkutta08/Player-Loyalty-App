import Foundation
import React

/**
 * iOS side of the TenantBuildConfig native module (H6): exposes the per-scheme tenant identity
 * (from the attached xcconfig, surfaced through Info.plist) to JS as constants. Mirrors
 * android/.../TenantBuildConfigModule.kt.
 *
 * NOTE: this file (and TenantBuildConfig.m) must be added to the Xcode project on a Mac, and
 * Info.plist needs the matching keys — see docs/WHITE_LABEL_CUSTOMIZATION_ROADMAP.md. Until
 * then the module is absent and src/config/buildConfig.ts uses its .env/dev fallbacks.
 */
@objc(TenantBuildConfig)
class TenantBuildConfig: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc func constantsToExport() -> [AnyHashable: Any] {
    let info = Bundle.main.infoDictionary ?? [:]
    return [
      "tenantId": info["TenantId"] as? String ?? "",
      "tenantSlug": info["TenantSlug"] as? String ?? "",
      "apiBaseUrl": info["TenantApiBaseUrl"] as? String ?? "",
      "appName": info["CFBundleDisplayName"] as? String ?? info["CFBundleName"] as? String ?? "",
      "appVersion": info["CFBundleShortVersionString"] as? String ?? "",
    ]
  }
}
