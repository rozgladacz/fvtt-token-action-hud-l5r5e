import { GROUP } from './constants.js'

/**
 * Default layout and groups
 */
export let DEFAULTS = null

Hooks.once('tokenActionHudCoreApiReady', async (coreModule) => {
  const groups = GROUP
  Object.values(groups).forEach(group => {
    group.name = coreModule.api.Utils.i18n(group.name)
    group.listName = `Group: ${coreModule.api.Utils.i18n(group.listName ?? group.name)}`
  })
  const groupsArray = Object.values(groups)
  DEFAULTS = {
    layout: [
      {
        nestId: 'inventory',
        id: 'inventory',
        name: coreModule.api.Utils.i18n('l5r5e.sheets.inventory'),
        groups: [
          { ...groups.weapons, nestId: 'inventory_weapons' },
          { ...groups.armor, nestId: 'inventory_armor' },
          { ...groups.equipment, nestId: 'inventory_items' }
        ]
      },
      {
        nestId: 'attributes',
        id: 'attributes',
        name: coreModule.api.Utils.i18n('l5r5e.attributes.title'),
        groups: [
          { ...groups.rings, nestId: 'attributes_rings' },
          { ...groups.derived, nestId: 'attributes_derived' },
          { ...groups.standing, nestId: 'attributes_standing' }
        ]
      },
      {
        nestId: 'skills',
        id: 'skills',
        name: coreModule.api.Utils.i18n('l5r5e.skills.title'),
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
        name: coreModule.api.Utils.i18n('l5r5e.techniques.title'),
        groups: [
          { ...groups.school_ability, nestId: 'techniques_school' },
          { ...groups.mastery_ability, nestId: 'techniques_mastery' },
          { ...groups.kata, nestId: 'techniques_kata' },
          { ...groups.kiho, nestId: 'techniques_kiho' },
          { ...groups.inversion, nestId: 'techniques_inversion' },
          { ...groups.invocation, nestId: 'techniques_invocation' },
          { ...groups.ritual, nestId: 'techniques_ritual' },
          { ...groups.shuji, nestId: 'techniques_shuji' },
          { ...groups.maho, nestId: 'techniques_maho' },
          { ...groups.ninjutsu, nestId: 'techniques_ninjutsu' },
          { ...groups.mantra, nestId: 'techniques_mantra' },
          { ...groups.title_ability, nestId: 'techniques_title' }
        ]
      },
      {
        nestId: 'utility',
        id: 'utility',
        name: coreModule.api.Utils.i18n('tokenActionHud.utility'),
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
})
