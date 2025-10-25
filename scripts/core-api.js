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

export function getCoreApiIfAvailable() {
  return game.modules.get(CORE_MODULE.ID)?.api ?? null
}

function hasRegistrationMethods(api) {
  return typeof api?.registerSystem === 'function' || typeof api?.registerApi === 'function'
}

export function resolveCoreApi(payload = null) {
  const coreApi = getCoreApiIfAvailable()

  if (hasRegistrationMethods(payload)) {
    return payload
  }

  if (hasRegistrationMethods(payload?.api)) {
    return payload.api
  }

  if (hasRegistrationMethods(coreApi)) {
    return coreApi
  }

  if (hasRegistrationMethods(coreApi?.api)) {
    return coreApi.api
  }

  return null
}
