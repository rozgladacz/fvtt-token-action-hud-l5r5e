import { GROUP } from './constants.js'
import { resolveCoreApi } from './core-api.js'
import { getTechniqueTypeEntries } from './system-data.js'

/**
 * Default layout and groups
 */
export let DEFAULTS = null

let defaultsInitialised = false
let defaultsHookRegistered = false

function buildDefaults(payload) {
  if (defaultsInitialised) {
    return
  }

  const api = resolveCoreApi(payload)

  if (!api) {
    return
  }

  const groups = GROUP
  const techniqueEntries = getTechniqueTypeEntries()

  techniqueEntries.forEach((entry) => {
    if (!groups[entry.id]) {
      groups[entry.id] = { id: entry.id, name: entry.translationKey ?? entry.label ?? entry.id, type: 'system' }
    } else if (!groups[entry.id].name) {
      groups[entry.id].name = entry.translationKey ?? entry.label ?? entry.id
    }
  })

  Object.values(groups).forEach(group => {
    group.name = api.Utils.i18n(group.name)
    group.listName = `Group: ${api.Utils.i18n(group.listName ?? group.name)}`
  })

  const groupsArray = Object.values(groups)
  const techniqueGroups = techniqueEntries.map((entry) => {
    const group = groups[entry.id]
    const suffix = String(entry.actorKey ?? entry.id).replace(/[^a-zA-Z0-9]+/g, '_')
    return { ...group, nestId: `techniques_${suffix}` }
  })

  DEFAULTS = {
    layout: [
      {
        nestId: 'inventory',
        id: 'inventory',
        name: api.Utils.i18n('l5r5e.sheets.inventory'),
        groups: [
          { ...groups.weapons, nestId: 'inventory_weapons' },
          { ...groups.armor, nestId: 'inventory_armor' },
          { ...groups.equipment, nestId: 'inventory_items' }
        ]
      },
      {
        nestId: 'attributes',
        id: 'attributes',
        name: api.Utils.i18n('l5r5e.attributes.title'),
        groups: [
          { ...groups.rings, nestId: 'attributes_rings' },
          { ...groups.derived, nestId: 'attributes_derived' },
          { ...groups.standing, nestId: 'attributes_standing' }
        ]
      },
      {
        nestId: 'skills',
        id: 'skills',
        name: api.Utils.i18n('l5r5e.skills.title'),
        groups: [
          { ...groups.artisan, nestId: 'skills_artisan' },
          { ...groups.martial, nestId: 'skills_martial' },
          { ...groups.scholar, nestId: 'skills_scholar' },
          { ...groups.social, nestId: 'skills_social' },
          { ...groups.trade, nestId: 'skills_trade' }
        ]
      },
      {
        nestId: 'techniques',
        id: 'techniques',
        name: api.Utils.i18n('l5r5e.techniques.title'),
        groups: techniqueGroups
      },
      {
        nestId: 'utility',
        id: 'utility',
        name: api.Utils.i18n('tokenActionHud.utility'),
        groups: [
          { ...groups.combat, nestId: 'utility_combat' },
          { ...groups.token, nestId: 'utility_token' },
          { ...groups.rests, nestId: 'utility_rests' },
          { ...groups.utility, nestId: 'utility_utility' }
        ]
      }
    ],
    groups: groupsArray
  }

  defaultsInitialised = true
  defaultsHookRegistered = false
}

function prepareDefaults() {
  if (defaultsInitialised) {
    return
  }

  const api = resolveCoreApi()
  if (api) {
    buildDefaults(api)
    return
  }

  if (!defaultsHookRegistered) {
    defaultsHookRegistered = true
    Hooks.once('tokenActionHudCoreApiReady', buildDefaults)
  }
}

Hooks.once('init', prepareDefaults)

Hooks.once('ready', prepareDefaults)
