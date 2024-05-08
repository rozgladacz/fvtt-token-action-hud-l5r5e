/**
 * Module-based constants
 */
export const MODULE = {
    ID: 'token-action-hud-l5r5e'
}

/**
 * Core module
 */
export const CORE_MODULE = {
    ID: 'token-action-hud-core'
}

/**
 * Core module version required by the system module
 */
export const REQUIRED_CORE_MODULE_VERSION = '1.5'

/**
 * Action types
 */
export const ACTION_TYPE = {
    item: 'tokenActionHud.template.item',
    utility: 'tokenActionHud.utility'
}

/**
 * Groups
 */
export const GROUP = {
    armor: { id: 'armor', name: 'tokenActionHud.template.armor', type: 'system' },
    equipment: { id: 'equipment', name: 'tokenActionHud.template.equipment', type: 'system' },
    consumables: { id: 'consumables', name: 'tokenActionHud.template.consumables', type: 'system' },
    containers: { id: 'containers', name: 'tokenActionHud.template.containers', type: 'system' },
    treasure: { id: 'treasure', name: 'tokenActionHud.template.treasure', type: 'system' },
    weapons: { id: 'weapons', name: 'tokenActionHud.template.weapons', type: 'system' },
    combat: { id: 'combat', name: 'tokenActionHud.combat', type: 'system' },
    token: { id: 'token', name: 'tokenActionHud.token', type: 'system' },
    utility: { id: 'utility', name: 'tokenActionHud.utility', type: 'system' }
}

/**
 * Item types
 */
export const ITEM_TYPE = {
    armor: { groupId: 'armor' },
    backpack: { groupId: 'containers' },
    consumable: { groupId: 'consumables' },
    equipment: { groupId: 'equipment' },
    treasure: { groupId: 'treasure' },
    weapon: { groupId: 'weapons' }
}

/**
 * Item Qualities
 */
export const ITEM_QUALITIES = {
  razor_edged: 'Razor-Edged',
  ceremonial: 'Ceremonial',
  damaged: 'Damaged',
  destroyed: 'Destroyed',
  concealable: 'Concealable',
  cumbersome: 'Cumbersome',
  snaring: 'Snaring',
  unholy: 'Unholy',
  forbidden: 'Forbidden',
  resplendent: 'Resplendent',
  wargear: 'Wargear',
  mundane: 'Mundane',
  prepare: 'Prepare',
  sacred: 'Sacred',
  durable: 'Durable',
  subtle: 'Subtle',
  kenzo_blade: 'Kenzō Blade'
}

/**
 * Item Patterns
 */
export const ITEM_PATTERN = {
  jade_inlay: 'Shirogane Jade Inlay',
  uchema: 'Uchema’s Technique',
  yasunori: 'Yasunori Steel',
  akodo: 'Akodo Pattern',
  burning_water: 'Burning Watter Pattern',
  concealment: 'Concealment Pattern',
  deadly_fangs: 'Deadly Fangs Pattern',
  fearsome_snarl: 'Fearsome Snarl Pattern',
  ichiro: 'Ichirō Pattern',
  mountain_silk: 'Mountain Silk Pattern',
  screaming_fire: 'Screaming Fire Pattern',
  toriyama: 'Toriyama Endurance Pattern',
  qamarist: 'Spirit of the Qamarist Pattern',
  yodhaniya: 'Ghostlands Yodhaniya Pattern',
  kokejin: 'Kökejin’s Heart of the Wind Pattern',
  agasha: 'Agasha Pattern'

}