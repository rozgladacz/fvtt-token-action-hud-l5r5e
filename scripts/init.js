import { createSystemManagerClass } from './system-manager.js'
import { initializeDefaults } from './defaults.js'
import { initializeUtils } from './utils.js'
import { CORE_MODULE, MODULE, REQUIRED_CORE_MODULE_VERSION, SYSTEM } from './constants.js'

let coreApiReadyDispatched = false

const registerWithCore = (api) => {
  if (!api || coreApiReadyDispatched) {
    return
  }

  try {
    if (typeof api.registerSystem !== 'function') {
      console.error('Token Action HUD Core API does not provide registerSystem. Please update Token Action HUD Core to version 2.x.')
      return
    }

    coreApiReadyDispatched = true
    Hooks.off('tokenActionHudCoreApiReady', onCoreApiReady)

    initializeUtils(api)
    initializeDefaults(api)

    const SystemManager = createSystemManagerClass(api)
    const registrationOptions = {
      moduleId: MODULE.ID,
      requiredCoreModuleVersion: REQUIRED_CORE_MODULE_VERSION,
      systemId: SYSTEM.ID,
      SystemManager
    }

    if (api.registerSystem.length >= 2) {
      api.registerSystem(SYSTEM.ID, SystemManager, registrationOptions)
    } else {
      api.registerSystem(registrationOptions)
    }
  } catch (error) {
    coreApiReadyDispatched = false
    console.error('Failed to register Token Action HUD L5R5E system with Token Action HUD Core.', error)
  }
}

const onCoreApiReady = (api) => {
  if (!coreApiReadyDispatched) {
    registerWithCore(api)
  }
}

Hooks.once('init', () => {
  Hooks.on('tokenActionHudCoreApiReady', onCoreApiReady)
})

Hooks.once('ready', () => {
  const coreModule = game.modules.get(CORE_MODULE.ID)
  const api = coreModule?.api ?? game.tokenActionHUD?.api

  if (!api) {
    console.error('Token Action HUD Core API is not available. Ensure Token Action HUD Core 2.x or later is installed and active.')
    return
  }

  if (!coreApiReadyDispatched) {
    registerWithCore(api)
  }
})
