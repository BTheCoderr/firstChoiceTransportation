#!/bin/bash
# Fetches default Expo assets (icon, splash, adaptive-icon) from the blank template.
# Run from project root: ./scripts/get-assets.sh

set -e
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"
npx create-expo-app@latest temp-assets --template blank --yes
cp -r temp-assets/assets ../assets
cd ..
rm -rf "$TEMP_DIR"
echo "Assets copied to ./assets"
