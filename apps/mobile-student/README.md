# Mobile student app (Expo)

Expo React Native shell (D1) against the shared Nest API.

## Local (Expo Go)

```bash
cd apps/mobile-student
pnpm install
EXPO_PUBLIC_API_URL=http://127.0.0.1:3001/api/v1 EXPO_PUBLIC_APP_ID=education_app pnpm start
```

Demo: `student@edu.local` / `Password123!`

Expo Go uses the `gp_test_*` billing bridge. Native Play Billing needs an EAS / dev-client build.

## Production API URL (required before a Play build)

Store users cannot reach `127.0.0.1`. `app.config.js` **fails the production EAS profile** unless `EXPO_PUBLIC_API_URL` is a public `https://` URL (include `/api/v1`).

Set it as an EAS secret after you have a live API (do not commit a fake host):

```bash
npx eas-cli login
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_API_URL --value https://YOUR-API-HOST/api/v1 --type string
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_APP_ID --value education_app --type string
```

Replace `extra.eas.projectId` in `app.json` with the real Expo project id from `eas init`.

## Build / submit

```bash
# Internal AAB — does not upload itself
npx eas-cli build -p android --profile production

# Submit needs Play Console + google-play-service-account.json (gitignored)
npx eas-cli submit -p android --profile production --latest
```

`eas.json` production sets `EXPO_PUBLIC_NATIVE_IAP=1`. Install `react-native-iap` in that EAS build if you want real Play Billing; Expo Go stays on the test-token bridge.

See `docs/PLAY_AND_DATA_LAUNCH.md` for the full operator sequence.
