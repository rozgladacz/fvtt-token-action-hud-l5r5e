import { createSystemManagerClass } from './system-manager.js'
import { MODULE, REQUIRED_CORE_MODULE_VERSION } from './constants.js'

Hooks.once('tokenActionHudCoreApiReady', (api) => {
  try {
    if (typeof api.registerSystem !== 'function') {
      console.error('Token Action HUD Core API does not provide registerSystem. Please update Token Action HUD Core to version 2.x.')
      return
    }

    const SystemManager = createSystemManagerClass(api)

    api.registerSystem({
      moduleId: MODULE.ID,
      requiredCoreModuleVersion: REQUIRED_CORE_MODULE_VERSION,
      SystemManager
    })
  } catch (error) {
    console.error('Failed to register Token Action HUD L5R5E system with Token Action HUD Core.', error)
  }
})
