import { ActionHandler } from './action-handler.js'
import { RollHandler } from './roll-handler.js'
import { DEFAULTS } from './defaults.js'
import * as systemSettings from './settings.js'
import { getCoreApi } from './core-api.js'

const coreApi = getCoreApi()

export class SystemManager extends coreApi.SystemManager {
    /**
     * Returns an instance of the ActionHandler to Token Action HUD Core
     * Called by Token Action HUD Core
     * @override
     * @returns {class} The ActionHandler instance
     */
    getActionHandler() {
      return new ActionHandler()
    }

    /**
     * Returns a list of roll handlers to Token Action HUD Core
     * Used to populate the Roll Handler module setting choices
     * Called by Token Action HUD Core
     * @override
     * @returns {object} The available roll handlers
     */
    getAvailableRollHandlers() {
      const coreTitle = 'Core Template'
      const choices = { core: coreTitle }
      return choices
    }

    /**
     * Returns an instance of the RollHandler to Token Action HUD Core
     * Called by Token Action HUD Core
     * @override
     * @param {string} rollHandlerId The roll handler ID
     * @returns {class}              The RollHandler instance
     */
    getRollHandler(rollHandlerId) {
      let rollHandler
      switch (rollHandlerId) {
        case 'core':
        default:
          rollHandler = new RollHandler()
          break
      }
      return rollHandler
    }

    /**
     * Returns the default layout and groups to Token Action HUD Core
     * Called by Token Action HUD Core
     * @returns {object} The default layout and groups
     */
    async registerDefaults() {
      return DEFAULTS
    }

    /**
     * Register Token Action HUD system module settings
     * Called by Token Action HUD Core
     * @override
     * @param {function} coreUpdate The Token Action HUD Core update function
     */
    registerSettings(coreUpdate) {
      systemSettings.register(coreUpdate)
    }
}
