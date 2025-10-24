import { SystemManager } from './system-manager.js'
import { MODULE, REQUIRED_CORE_MODULE_VERSION } from './constants.js'
import { getCoreApi } from './core-api.js'

Hooks.once('init', () => {
  try {
    const coreApi = getCoreApi()

    if (typeof coreApi.registerSystem !== 'function') {
      console.error('Token Action HUD Core API does not provide registerSystem. Please update Token Action HUD Core to version 2.x.')
      return
    }

    coreApi.registerSystem({
      moduleId: MODULE.ID,
      requiredCoreModuleVersion: REQUIRED_CORE_MODULE_VERSION,
      SystemManager
    })
  } catch (error) {
    console.error('Failed to register Token Action HUD L5R5E system with Token Action HUD Core.', error)
  }
})
