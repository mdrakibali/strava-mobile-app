# Audit checklist

Status words: Identified, Fixed, Automated Tested, API Verified, Database Verified, Physical Device Verified, Deployment Verified, Blocked, Not Fixed.

Local code is not the live worker or the installed phone build until those are updated.

| Module | Issue | Status |
| --- | --- | --- |
| Home feed | Following list replaced everyone else's activities | Fixed, Automated Tested. Not Deployment Verified |
| Home feed | A new activity waited for the next feed response and could be missing if that response was stale | Fixed in local code (`presentActivities`). Automated Tested. Not Physical Device Verified |
| Activity edit | Old title stayed on screen until a later response | Fixed in local code (edit overlay re-renders Feed, Detail, Profile, History). Automated Tested. Not Physical Device Verified |
| Activity delete | A late response put a deleted activity back | Fixed earlier (`withoutRemoved`), still local. Not Physical Device Verified |
| Kudos | Like with an unknown previous state showed "No kudos yet" | Fixed, Automated Tested. Not two-phone verified |
| Comments | Empty refetch replaced comments already on screen | Fixed, Automated Tested. Not Physical Device Verified |
| Messages | `POST /messages/send` 404 when the id is a conversation id | Route exists on production (401 without a token). Conversation-id handling Fixed locally, API Verified in tests. Not Deployment Verified |
| Map | Two location markers (custom dot plus native puck) while recording or browsing | Fixed in local code. Not Physical Device Verified |
| GPS distance | Stationary points must not add distance | Automated Tested with simulated points only. Not Physical Device Verified |
| Workout | Indoor timer, not a GPS sport | Inspected. Recording still starts through the record screen. Not Physical Device Verified |
| Clubs, events, challenges | Join and leave counts | Earlier server counts exist in local code. Not re-tested on a device this pass |
| Real-time chat | WebSocket delivery | Not Fixed as unverified. Do not treat it as working |
| Push notifications | Not implemented | Not Fixed |
| Android install | Development build was not installed in this pass | Blocked for device checks until `npx expo run:android` is installed on the phone |
