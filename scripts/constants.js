/**
 * Module-based constants
 */
export const MODULE = {
  ID: 'token-action-hud-l5r5e'
}

/**
 * System constants
 */
export const SYSTEM = {
  ID: 'l5r5e'
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
export const REQUIRED_CORE_MODULE_VERSION = '2.0.12'

/**
 * Action types
 */
export const ACTION_TYPE = {
  item: 'tokenActionHud.template.item',
  utility: 'tokenActionHud.utility',
  armor: 'l5r5e.armors.title',
  equipped: 'tokenActionHud.equipped',
  unequipped: 'tokenActionHud.unequipped',
  equipment: 'l5r5e.items.title',
  weapons: 'l5r5e.weapons.title',
  technique: 'l5r5e.techniques.title',
  ring: 'l5r5e.rings.title',
  skill: 'l5r5e.skills.title',
  derived: 'l5r5e.attributes.title',
  standing: 'l5r5e.social.title'
}

/**
 * Groups
 */
export const GROUP = {
  armor: { id: 'armor', name: 'l5r5e.armors.title', type: 'system' },
  equipment: { id: 'equipment', name: 'l5r5e.items.title', type: 'system' },
  equipped: { id: 'equipped', name: 'Equipped', type: 'system' }, //bugs
  unequipped: { id: 'unequipped', name: 'Unequipped', type: 'system' }, //bugs
  weapons: { id: 'weapons', name: 'l5r5e.weapons.title', type: 'system' },
  combat: { id: 'combat', name: 'tokenActionHud.combat', type: 'system' },
  token: { id: 'token', name: 'tokenActionHud.token', type: 'system' },
  rests: { id: 'rests', name: 'tokenActionHud.rests', type: 'system' },
  utility: { id: 'utility', name: 'tokenActionHud.utility', type: 'system' },
  rings: { id: 'rings', name: 'l5r5e.rings.title', type: 'system' },
  derived: { id: 'derived', name: 'l5r5e.attributes.title', type: 'system' },
  standing: { id: 'standing', name: 'l5r5e.social.title', type: 'system' },
  artisan: { id: 'artisan', name: 'l5r5e.skills.artisan.title', type: 'system' },
  martial: { id: 'martial', name: 'l5r5e.skills.martial.title', type: 'system' },
  scholar: { id: 'scholar', name: 'l5r5e.skills.scholar.title', type: 'system' },
  social: { id: 'social', name: 'l5r5e.skills.social.title', type: 'system' },
  trade: { id: 'trade', name: 'l5r5e.skills.trade.title', type: 'system' },
  kata: { id: 'kata', name: 'l5r5e.techniques.kata', type: 'system' },
  kiho: { id: 'kiho', name: 'l5r5e.techniques.kiho', type: 'system' },
  inversion: { id: 'inversion', name: 'l5r5e.techniques.inversion', type: 'system' },
  invocation: { id: 'invocation', name: 'l5r5e.techniques.invocation', type: 'system' },
  ritual: { id: 'ritual', name: 'l5r5e.techniques.ritual', type: 'system' },
  shuji: { id: 'shuji', name: 'l5r5e.techniques.shuji', type: 'system' },
  maho: { id: 'maho', name: 'l5r5e.techniques.maho', type: 'system' },
  ninjutsu: { id: 'ninjutsu', name: 'l5r5e.techniques.ninjutsu', type: 'system' },
  mantra: { id: 'mantra', name: 'l5r5e.techniques.mantra', type: 'system' },
  school_ability: { id: 'school-ability', name: 'l5r5e.techniques.school_ability', type: 'system' },
  mastery_ability: { id: 'mastery-ability', name: 'l5r5e.techniques.mastery_ability', type: 'system' },
  title_ability: { id: 'title-ability', name: 'l5r5e.techniques.title_ability', type: 'system' }
}

/**
 * Item types
 */
export const ITEM_TYPE = {
  armor: { groupId: 'armor' },
  equipment: { groupId: 'equipment' },
  weapon: { groupId: 'weapons' }
}

/**
 * Item types
 */
export const SKILL_TYPE = {
  artisan: { groupId: 'artisan' },
  martial: { groupId: 'martial' },
  scholar: { groupId: 'scholar' },
  social: { groupId: 'social' },
  trade: { groupId: 'trade' }
}

/**
 * Item Qualities
 */
export const ITEM_QUALITIES = {
  razor_edged: 'tokenActionHud.l5r5e.qualities.razorEdged',
  ceremonial: 'tokenActionHud.l5r5e.qualities.ceremonial',
  damaged: 'tokenActionHud.l5r5e.qualities.damaged',
  destroyed: 'tokenActionHud.l5r5e.qualities.destroyed',
  concealable: 'tokenActionHud.l5r5e.qualities.concealable',
  cumbersome: 'tokenActionHud.l5r5e.qualities.cumbersome',
  snaring: 'tokenActionHud.l5r5e.qualities.snaring',
  unholy: 'tokenActionHud.l5r5e.qualities.unholy',
  forbidden: 'tokenActionHud.l5r5e.qualities.forbidden',
  resplendent: 'tokenActionHud.l5r5e.qualities.resplendent',
  wargear: 'tokenActionHud.l5r5e.qualities.wargear',
  mundane: 'tokenActionHud.l5r5e.qualities.mundane',
  prepare: 'tokenActionHud.l5r5e.qualities.prepare',
  sacred: 'tokenActionHud.l5r5e.qualities.sacred',
  durable: 'tokenActionHud.l5r5e.qualities.durable',
  subtle: 'tokenActionHud.l5r5e.qualities.subtle',
  kenzo_blade: 'tokenActionHud.l5r5e.qualities.kenzoBlade'
}

/**
 * Item Patterns
 */
export const ITEM_PATTERN = {
  jade_inlay: 'tokenActionHud.l5r5e.patterns.jadeInlay',
  uchema: 'tokenActionHud.l5r5e.patterns.uchema',
  yasunori: 'tokenActionHud.l5r5e.patterns.yasunori',
  akodo: 'tokenActionHud.l5r5e.patterns.akodo',
  burning_water: 'tokenActionHud.l5r5e.patterns.burningWater',
  concealment: 'tokenActionHud.l5r5e.patterns.concealment',
  deadly_fangs: 'tokenActionHud.l5r5e.patterns.deadlyFangs',
  fearsome_snarl: 'tokenActionHud.l5r5e.patterns.fearsomeSnarl',
  ichiro: 'tokenActionHud.l5r5e.patterns.ichiro',
  mountain_silk: 'tokenActionHud.l5r5e.patterns.mountainSilk',
  screaming_fire: 'tokenActionHud.l5r5e.patterns.screamingFire',
  toriyama: 'tokenActionHud.l5r5e.patterns.toriyama',
  qamarist: 'tokenActionHud.l5r5e.patterns.qamarist',
  yodhaniya: 'tokenActionHud.l5r5e.patterns.yodhaniya',
  kokejin: 'tokenActionHud.l5r5e.patterns.kokejin',
  agasha: 'tokenActionHud.l5r5e.patterns.agasha'
}

/**
 * Item tags
 */
export const ITEM_TAGS = {
  default: { icon: 'fa-solid fa-tag', class: 'tah-tag-secondary' },
  pattern: { icon: 'fa-solid fa-swatchbook', class: 'tah-tag-tertiary' },
  bonus: { icon: 'fa-solid fa-arrow-up-right-dots', class: 'tah-tag-alt' },
  clan: { label: 'tokenActionHud.l5r5e.tags.clan', icon: 'fa-solid fa-flag', class: 'tah-tag-secondary' },
  culture: { label: 'tokenActionHud.l5r5e.tags.culture', icon: 'fa-solid fa-earth-asia', class: 'tah-tag-secondary' },
  material: { label: 'tokenActionHud.l5r5e.tags.material', icon: 'fa-solid fa-gem', class: 'tah-tag-secondary' },
  tradition: { label: 'tokenActionHud.l5r5e.tags.tradition', icon: 'fa-solid fa-scroll', class: 'tah-tag-secondary' }
}

/**
 * Item bonus descriptors
 */
export const ITEM_BONUS = {
  armorTN: { label: 'tokenActionHud.l5r5e.bonuses.armorTN', icon: 'fa-solid fa-shield-halved', class: 'tah-tag-alt' },
  resistance: { label: 'tokenActionHud.l5r5e.bonuses.resistance', icon: 'fa-solid fa-shield', class: 'tah-tag-alt' },
  fatigue: { label: 'tokenActionHud.l5r5e.bonuses.fatigue', icon: 'fa-solid fa-heart-pulse', class: 'tah-tag-alt' },
  strife: { label: 'tokenActionHud.l5r5e.bonuses.strife', icon: 'fa-solid fa-fire', class: 'tah-tag-alt' },
  deadliness: { label: 'tokenActionHud.l5r5e.bonuses.deadliness', icon: 'fa-solid fa-skull', class: 'tah-tag-alt' },
  damage: { label: 'tokenActionHud.l5r5e.bonuses.damage', icon: 'fa-solid fa-burst', class: 'tah-tag-alt' },
  opportunities: { label: 'tokenActionHud.l5r5e.bonuses.opportunities', icon: 'fa-solid fa-dice-d20', class: 'tah-tag-alt' }
}
