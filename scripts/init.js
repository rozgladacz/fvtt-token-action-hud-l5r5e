import { createSystemManagerClass } from './system-manager.js'
import { MODULE, REQUIRED_CORE_MODULE_VERSION } from './constants.js'
import { initialiseDefaults } from './defaults.js'
let systemReady = false

function registerSystemWithCore(payload = {}) {
  if (systemReady) {
    return
  }

  const coreApi = payload.api ?? game.modules.get('token-action-hud-core')?.api

  if (!coreApi) {
    console.error('Token Action HUD Core API is not available. Ensure Token Action HUD Core 2.x is installed and active.')
    return
  }

  try {
    const SystemManager = createSystemManagerClass(coreApi)
    const moduleInstance = game.modules.get(MODULE.ID)

    if (!moduleInstance) {
      console.error('Token Action HUD L5R5E module could not be found in the game module registry.')
      return
    }

    moduleInstance.api = {
      requiredCoreModuleVersion: REQUIRED_CORE_MODULE_VERSION,
      SystemManager
    }

    systemReady = true

    initialiseDefaults(coreApi)

    Hooks.call('tokenActionHudSystemReady', moduleInstance)
  } catch (error) {
    console.error('Failed to register Token Action HUD L5R5E system with Token Action HUD Core.', error)
  }
}

function ensureRegistration() {
  if (systemReady) {
    return
  }

  const coreApi = game.modules.get('token-action-hud-core')?.api

  if (coreApi) {
    registerSystemWithCore({ api: coreApi })
  }
}

Hooks.on('tokenActionHudCoreApiReady', registerSystemWithCore)

Hooks.once('init', () => {
  ensureRegistration()
})

Hooks.once('ready', () => {
  ensureRegistration()
})
