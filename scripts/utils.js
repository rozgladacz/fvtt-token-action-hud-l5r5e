import { MODULE } from './constants.js'
import { resolveCoreApi } from './core-api.js'

export let Utils = null

let utilsInitialised = false
let utilsHookRegistered = false

function initialiseUtils(payload) {
  if (utilsInitialised) {
    return
  }

  const api = resolveCoreApi(payload)

  if (!api) {
    return
  }

  const logger = api.Logger

  Utils = class Utils {
    /**
     * Get setting
     * @param {string} key               The key
     * @param {string|null} defaultValue The default value
     * @returns {string}                 The setting value
     */
    static getSetting(key, defaultValue = null) {
      let value = defaultValue ?? null

      try {
        value = game.settings.get(MODULE.ID, key)
      } catch {
        logger?.debug?.(`Setting '${key}' not found`)
      }

      return value
    }

    /**
     * Set setting
     * @param {string} key   The key
     * @param {string} value The value
     */
    static async setSetting(key, value) {
      try {
        const updatedValue = await game.settings.set(MODULE.ID, key, value)
        logger?.debug?.(`Setting '${key}' set to '${updatedValue}'`)
        return updatedValue
      } catch {
        logger?.debug?.(`Setting '${key}' not found`)
        return value
      }
    }
  }

  utilsInitialised = true
  utilsHookRegistered = false
}

function prepareUtils() {
  if (utilsInitialised) {
    return
  }

  const api = resolveCoreApi()
  if (api) {
    initialiseUtils(api)
    return
  }

  if (!utilsHookRegistered) {
    utilsHookRegistered = true
    Hooks.once('tokenActionHudCoreApiReady', initialiseUtils)
  }
}

Hooks.once('init', prepareUtils)

Hooks.once('ready', prepareUtils)
