import { MODULE } from './constants.js'

export let Utils = null

export function initializeUtils(coreApi) {
    if (!coreApi || Utils) {
        return
    }

    /**
     * Utility functions
     */
    Utils = class Utils {
        /**
         * Get setting
         * @param {string} key               The key
         * @param {string=null} defaultValue The default value
         * @returns {string}                 The setting value
         */
        static getSetting (key, defaultValue = null) {
            let value = defaultValue ?? null
            try {
                value = game.settings.get(MODULE.ID, key)
            } catch {
                coreApi.Logger.debug(`Setting '${key}' not found`)
            }
            return value
        }

        /**
         * Set setting
         * @param {string} key   The key
         * @param {string} value The value
         */
        static async setSetting (key, value) {
            try {
                value = await game.settings.set(MODULE.ID, key, value)
                coreApi.Logger.debug(`Setting '${key}' set to '${value}'`)
            } catch {
                coreApi.Logger.debug(`Setting '${key}' not found`)
            }
        }
    }
}

Hooks.once('tokenActionHudCoreApiReady', initializeUtils)
