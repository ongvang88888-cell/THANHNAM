import { Platform } from "react-native";

export type StoreProvider = "mock" | "google_play" | "apple_iap";

export type StorePurchaseResult = {
  /** Play purchaseToken or Apple transactionId */
  token: string;
  sku: string;
  /** Dev bridge vs native StoreKit / Play Billing */
  mode: "dev_bridge" | "native" | "native_simulate";
  signedTransaction?: string;
};

/**
 * Native IAP requires an EAS / dev-client build with react-native-iap (or equivalent).
 * - EXPO_PUBLIC_NATIVE_IAP=1 → attempt real native module
 * - EXPO_PUBLIC_NATIVE_IAP=simulate → deterministic native-shaped tokens for QA
 * Expo Go stays on the test-token bridge when unset.
 */
export function nativeIapEnabled(): boolean {
  const v = process.env.EXPO_PUBLIC_NATIVE_IAP;
  return v === "1" || v === "simulate";
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
 * - EXPO_PUBLIC_NATIVE_IAP=simulate → native_sim_* tokens
 * - EXPO_PUBLIC_NATIVE_IAP=1 → dynamic import of react-native-iap when present
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
 * Uses simulate mode or optional native module; never crashes Expo Go when unset.
 */
async function purchaseNative(input: {
  provider: StoreProvider;
  sku: string;
  orderId: string;
  appAccountToken?: string;
}): Promise<StorePurchaseResult> {
  if (process.env.EXPO_PUBLIC_NATIVE_IAP === "simulate") {
    const prefix = input.provider === "google_play" ? "gp_test" : "iap_test";
    return {
      token: `${prefix}_native_sim_${input.orderId}_${Date.now()}`,
      sku: input.sku,
      mode: "native_simulate",
      signedTransaction:
        input.provider === "apple_iap"
          ? `sim_signed_${input.orderId}`
          : undefined,
    };
  }

  try {
    // Optional peer dep — present only in EAS builds that install react-native-iap.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const iap = require("react-native-iap") as {
      initConnection?: () => Promise<boolean>;
      requestPurchase?: (args: {
        sku?: string;
        skus?: string[];
        appAccountToken?: string;
      }) => Promise<{ purchaseToken?: string; transactionId?: string; transactionReceipt?: string }>;
    };
    if (iap.initConnection) await iap.initConnection();
    if (!iap.requestPurchase) {
      throw new Error("react-native-iap.requestPurchase missing");
    }
    const purchase = await iap.requestPurchase({
      sku: input.sku,
      skus: [input.sku],
      appAccountToken: input.appAccountToken,
    });
    const token =
      purchase.purchaseToken ||
      purchase.transactionId ||
      `native_${input.orderId}`;
    return {
      token,
      sku: input.sku,
      mode: "native",
      signedTransaction: purchase.transactionReceipt,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Native IAP unavailable (${msg}). Install react-native-iap in an EAS build, or set EXPO_PUBLIC_NATIVE_IAP=simulate for QA.`,
    );
  }
}
