import { createSystemManagerClass } from './system-manager.js'
import { MODULE, REQUIRED_CORE_MODULE_VERSION } from './constants.js'
import { resolveCoreApi } from './core-api.js'

let systemRegistered = false
let coreApiHookRegistered = false

function registerWithCore(payload) {
  if (systemRegistered) {
    return
  }

  const api = resolveCoreApi(payload)

  if (!api) {
    console.error('Token Action HUD Core API is not available. Ensure Token Action HUD Core 2.x is installed and active.')
    return
  }

  try {
    const SystemManager = createSystemManagerClass(api)
    const registrationPayload = {
      moduleId: MODULE.ID,
      requiredCoreModuleVersion: REQUIRED_CORE_MODULE_VERSION,
      SystemManager
    }

    if (typeof api.registerSystem === 'function') {
      api.registerSystem(registrationPayload)
    } else if (typeof api.registerApi === 'function') {
      api.registerApi(registrationPayload)
    } else {
      console.error('Token Action HUD Core API does not provide registerSystem or registerApi. Please update Token Action HUD Core to version 2.x.')
      return
    }

    systemRegistered = true
    coreApiHookRegistered = false
  } catch (error) {
    console.error('Failed to register Token Action HUD L5R5E system with Token Action HUD Core.', error)
  }
}

function prepareRegistration() {
  if (systemRegistered) {
    return
  }

  const api = resolveCoreApi()
  if (api) {
    registerWithCore(api)
    return
  }

  if (!coreApiHookRegistered) {
    coreApiHookRegistered = true
    Hooks.once('tokenActionHudCoreApiReady', registerWithCore)
  }
}

Hooks.once('init', () => {
  prepareRegistration()
})

Hooks.once('ready', () => {
  prepareRegistration()
})
