import { Platform } from "react-native";

export type StoreProvider = "mock" | "google_play" | "apple_iap";

export type StorePurchaseResult = {
  /** Play purchaseToken or Apple transactionId */
  token: string;
  sku: string;
  /** Dev bridge vs native StoreKit / Play Billing */
  mode: "dev_bridge" | "native";
  signedTransaction?: string;
};

/**
 * Native IAP requires an EAS / dev-client build with react-native-iap (or equivalent).
 * Set EXPO_PUBLIC_NATIVE_IAP=1 in that binary; Expo Go stays on the test-token bridge.
 */
export function nativeIapEnabled(): boolean {
  return process.env.EXPO_PUBLIC_NATIVE_IAP === "1";
}

export function defaultProviderForPlatform(): StoreProvider {
  if (Platform.OS === "android") return "google_play";
  if (Platform.OS === "ios") return "apple_iap";
  return "mock";
}

export function platformForApi(): "android" | "ios" | "web" | "unknown" {
  if (Platform.OS === "android") return "android";
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "web") return "web";
  return "unknown";
}

/**
 * Store billing façade.
 *
 * - Default / Expo Go → deterministic test tokens (`gp_test_*` / `iap_test_*`)
 * - EAS with EXPO_PUBLIC_NATIVE_IAP=1 → `purchaseNative` (wire react-native-iap)
 */
export async function purchaseStoreProduct(input: {
  provider: StoreProvider;
  sku: string;
  orderId: string;
  appAccountToken?: string;
}): Promise<StorePurchaseResult> {
  if (input.provider === "mock") {
    return { token: `mock_${input.orderId}`, sku: input.sku, mode: "dev_bridge" };
  }

  if (nativeIapEnabled()) {
    return purchaseNative(input);
  }

  if (input.provider === "google_play") {
    return {
      token: `gp_test_${input.orderId}_${Date.now()}`,
      sku: input.sku,
      mode: "dev_bridge",
    };
  }

  return {
    token: `iap_test_${input.orderId}_${Date.now()}`,
    sku: input.sku,
    mode: "dev_bridge",
  };
}

/**
 * Hook point for react-native-iap / Play Billing Library / StoreKit 2.
 * Throws until the native dependency is installed in an EAS build.
 */
async function purchaseNative(input: {
  provider: StoreProvider;
  sku: string;
  orderId: string;
  appAccountToken?: string;
}): Promise<StorePurchaseResult> {
  void input;
  throw new Error(
    "Native IAP not wired. Install react-native-iap in an EAS build and implement purchaseNative.",
  );
}
