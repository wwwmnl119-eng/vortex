# Vortex

Repository structure for the Vortex messenger project.

## Folders
- `backend/` — Node.js backend for Render
- `android/` — native Android app project
- `updates/` — update metadata for APK auto-update

## Notes
- APK files should go to GitHub Releases, not into the repository
- `updates/version.json` should point to the latest APK release
- `MONGO_URL` should be stored in Render Environment Variables
