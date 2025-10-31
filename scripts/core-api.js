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

const CORE_API_CLASS_KEYS = ['SystemManager', 'ActionHandler', 'RollHandler']

function hasRequiredCoreClasses(api) {
  if (!api || typeof api !== 'object') {
    return false
  }

  return CORE_API_CLASS_KEYS.every((key) => typeof api[key] === 'function')
}

function getCoreModuleSafely() {
  try {
    return getCoreModule()
  } catch {
    return null
  }
}

function resolveCoreApiCandidate(candidate) {
  if (hasRequiredCoreClasses(candidate)) {
    return candidate
  }

  if (hasRequiredCoreClasses(candidate?.api)) {
    return candidate.api
  }

  return null
}

export function resolveCoreApi(payload = null) {
  const payloadApi = resolveCoreApiCandidate(payload)
  if (payloadApi) {
    return payloadApi
  }

  const coreApi = resolveCoreApiCandidate(getCoreApiIfAvailable())
  if (coreApi) {
    return coreApi
  }

  const coreModuleApi = resolveCoreApiCandidate(getCoreModuleSafely()?.api)
  if (coreModuleApi) {
    return coreModuleApi
  }

  return null
}
