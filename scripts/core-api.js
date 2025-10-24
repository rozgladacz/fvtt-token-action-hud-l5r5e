import { CORE_MODULE } from './constants.js'

export function getCoreModule() {
  const coreModule = game.modules.get(CORE_MODULE.ID)
  if (!coreModule) {
    throw new Error('Token Action HUD Core module is not available. Please ensure it is installed and active.')
  }
  return coreModule
}

export function getCoreApi() {
  const coreModule = getCoreModule()
  if (!coreModule.api) {
    throw new Error('Token Action HUD Core API is not available. Ensure you are using Token Action HUD Core 2.x or later.')
  }
  return coreModule.api
}
