![Downloads](https://img.shields.io/github/downloads/rozgladacz/fvtt-token-action-hud-l5r5e/latest/module.zip?color=2b82fc&label=DOWNLOADS&style=for-the-badge) [![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Ftoken-action-hud-l5r5e&colorB=448d34&style=for-the-badge)](https://forge-vtt.com/bazaar#package=token-action-hud-l5r5e)

# Token Action HUD L5r5e

Token Action HUD is a repositionable HUD of actions for a selected token.

**Compatibility:** Compatible with Foundry Virtual Tabletop version 13 and the Legend of the Five Rings 5e system version 1.13.2.

# Features
- Make rolls directly from the HUD instead of opening your character sheet.
- Use items from the HUD or right-click an item to open its sheet.
- Move the HUD and choose to expand the menus up or down.
- Unlock the HUD to customise layout and groups per user, and actions per actor.
- Add your own macros, journal entries and roll table compendiums.

# Wymagania

- Foundry VTT v13+
- System Legend of the Five Rings 5e w wersji co najmniej 1.13.2 (wcześniejsze wydania są blokowane przez manifest)
- [Token Action HUD Core](https://foundryvtt.com/packages/token-action-hud-core) w wersji co najmniej 2.0.12
- [socketlib](https://foundryvtt.com/packages/socketlib)

# Installation

Przed instalacją upewnij się, że korzystasz z Foundry VTT w wersji 13 lub wyższej i masz zainstalowane wymagane moduły wymienione w sekcji powyżej.

Ten fork zachowuje kompatybilność z Foundry VTT v13 oraz systemem Legend of the Five Rings v1.13.2.

## Method 1
1. On Foundry VTT's **Configuration and Setup** screen, go to **Add-on Modules**
2. Click **Install Module**
3. Search for **Token Action HUD L5r5e**
4. Click **Install** next to the module listing
5. Install or update the required modules (Token Action HUD Core ≥2.0.12, socketlib) if prompted

## Method 2
1. On Foundry VTT's **Configuration and Setup** screen, go to **Add-on Modules**
2. Click **Install Module**
3. In the Manifest URL field, paste: `https://github.com/rozgladacz/fvtt-token-action-hud-l5r5e/releases/download/v2.0.0/module.json`
4. Click **Install** next to the pasted Manifest URL
5. Install or update the required modules (Token Action HUD Core ≥2.0.12, socketlib) if prompted

## Required Modules

**IMPORTANT** - Token Action HUD Template requires the [Token Action HUD Core](https://foundryvtt.com/packages/token-action-hud-core) module (version 2.0.12 or newer) and the [socketlib](https://foundryvtt.com/packages/socketlib) module to be installed.

## Recommended Modules
Token Action HUD uses the [Color Picker](https://foundryvtt.com/packages/color-picker) library module for its color picker settings.

# Support

For a guide on using Token Action HUD, go to: [How to Use Token Action HUD](https://github.com/Larkinabout/fvtt-token-action-hud-core/wiki/How-to-Use-Token-Action-HUD)

For questions, feature requests or bug reports, please open an issue [here](https://github.com/rozgladacz/fvtt-token-action-hud-l5r5e/issues).

Pull requests are welcome. Please include a reason for the request or create an issue before starting one.

# Acknowledgements

Thank you to the Community Helpers on Foundry's Discord who provide tireless support for people seeking help with the HUD.

# Release Notes

## 2.0.0

- Maintenance release for Foundry VTT v13 compatibility
- Verified support for the Legend of the Five Rings 5e system v1.13.2
- Requires Token Action HUD Core v2.0.12 or newer

## 1.3.0

- Aktualizacja manifestu i instrukcji instalacji do wydania v1.3.0
- Potwierdzono kompatybilność z Foundry VTT v13

## 1.2.0

- Aktualizacja manifestu i instrukcji instalacji pod repozytorium DonHuberto
- Wymagane Foundry VTT v13

## 1.1.0

- v13 compatibility, TAH Core 2.x

# License

This Foundry VTT module is licensed under a [Creative Commons Attribution 4.0 International License](https://creativecommons.org/licenses/by/4.0/) and this work is licensed under [Foundry Virtual Tabletop EULA - Limited License Agreement for module development](https://foundryvtt.com/article/license/).
