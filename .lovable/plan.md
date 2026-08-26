# Fix Instagram Direct webhook subscription

## Implementation
- Keep Facebook OAuth scopes unchanged and subscribe the Facebook Page only to `leadgen`.
- Add a server-only Instagram Graph helper that posts `messages,messaging_postbacks` to the linked Instagram professional account’s `subscribed_apps` edge using the stored Page token and app-secret proof.
- Update page confirmation to persist the linked Instagram account, enable it only after a successful Instagram subscription, and return separate/combined subscription errors without exposing secrets.
- Update “Formlarni yangilash” to rediscover or reuse the linked Instagram account, retry its subscription, and update the existing connection row without creating duplicates.
- Preserve existing webhook verification, ingestion, tenancy, and send-message behavior unless endpoint consistency requires a narrow correction.

## Verification
- Add focused tests for the Instagram subscription URL, fields, proof behavior, and enabled/disabled state transition.
- Run targeted tests, full tests, TypeScript checks, and build; review current build diagnostics.

## Technical details
- Instagram subscription endpoint: `POST https://graph.instagram.com/v24.0/{ig_user_id}/subscribed_apps` with `subscribed_fields=messages,messaging_postbacks`.
- App-level Instagram Webhooks fields still need to be enabled in Meta Dashboard; project code can subscribe accounts but cannot configure that product setting.
