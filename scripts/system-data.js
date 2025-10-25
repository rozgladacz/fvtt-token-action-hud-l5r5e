const FALLBACK_TECHNIQUE_TYPES = [
  { id: 'kata', actorKey: 'kata', translationKey: 'l5r5e.techniques.kata' },
  { id: 'kiho', actorKey: 'kiho', translationKey: 'l5r5e.techniques.kiho' },
  { id: 'inversion', actorKey: 'inversion', translationKey: 'l5r5e.techniques.inversion' },
  { id: 'invocation', actorKey: 'invocation', translationKey: 'l5r5e.techniques.invocation' },
  { id: 'ritual', actorKey: 'ritual', translationKey: 'l5r5e.techniques.ritual' },
  { id: 'shuji', actorKey: 'shuji', translationKey: 'l5r5e.techniques.shuji' },
  { id: 'maho', actorKey: 'maho', translationKey: 'l5r5e.techniques.maho' },
  { id: 'ninjutsu', actorKey: 'ninjutsu', translationKey: 'l5r5e.techniques.ninjutsu' },
  { id: 'mantra', actorKey: 'mantra', translationKey: 'l5r5e.techniques.mantra' },
  { id: 'school-ability', actorKey: 'school_ability', translationKey: 'l5r5e.techniques.school_ability' },
  { id: 'mastery-ability', actorKey: 'mastery_ability', translationKey: 'l5r5e.techniques.mastery_ability' },
  { id: 'title-ability', actorKey: 'title_ability', translationKey: 'l5r5e.techniques.title_ability' }
]

const FALLBACK_INVENTORY_GROUPS = [
  { id: 'armor', actorKey: 'armor', translationKey: 'l5r5e.armors.title' },
  { id: 'equipment', actorKey: 'equipment', translationKey: 'l5r5e.items.title' },
  { id: 'weapons', actorKey: 'weapons', translationKey: 'l5r5e.weapons.title' }
]

const FALLBACK_RINGS = [
  { id: 'air', translationKey: 'l5r5e.rings.air' },
  { id: 'earth', translationKey: 'l5r5e.rings.earth' },
  { id: 'fire', translationKey: 'l5r5e.rings.fire' },
  { id: 'water', translationKey: 'l5r5e.rings.water' },
  { id: 'void', translationKey: 'l5r5e.rings.void' }
]

const ATTRIBUTE_CONFIG = {
  derived: {
    helperMethods: ['getDerivedAttributesList', 'getDerivedList', 'getDerivedAttributes'],
    helperArgsSets: args => [[args], []],
    configPaths: ['derivedAttributes', 'derived', 'attributes.derived'],
    actorPaths: ['derived', 'attributes.derived'],
    translationPrefix: 'l5r5e.attributes'
  },
  standing: {
    helperMethods: ['getStandingAttributesList', 'getStandingList', 'getSocialAttributesList', 'getSocialAttributes'],
    helperArgsSets: args => [[args], []],
    configPaths: ['standingAttributes', 'standing', 'social', 'attributes.social'],
    actorPaths: ['standing', 'social', 'attributes.standing', 'attributes.social'],
    translationPrefix: 'l5r5e.social'
  }
}

export function sanitizeId(id) {
  if (id === null || id === undefined) return ''
  const value = String(id)
  return value.trim().replace(/\s+/g, '-').replace(/_/g, '-').toLowerCase()
}

export function unsanitizeId(id) {
  if (id === null || id === undefined) return ''
  const value = String(id)
  return value.trim().replace(/\s+/g, '_').replace(/-/g, '_')
}

export function getTechniqueTypeEntries() {
  const entries = collectEntries({
    helperMethods: ['getTechniqueTypesList', 'getTechniqueTypes', 'getTechniquesTypesList', 'getTechniquesList'],
    configPaths: ['techniqueTypes', 'technique_types', 'techniques.types', 'techniques.categories', 'techniques.type'],
    translationPrefix: 'l5r5e.techniques',
    stringIsTranslation: true,
    fallback: FALLBACK_TECHNIQUE_TYPES
  })

  return dedupeEntries(entries)
}

export function getInventoryGroupEntries() {
  const entries = collectEntries({
    helperMethods: ['getInventoryGroupIds', 'getInventoryCategoriesList', 'getInventorySections'],
    configPaths: ['inventory.groups', 'inventory.categories', 'inventoryCategories', 'itemGroups.inventory', 'items.inventory'],
    translationPrefix: null,
    stringIsTranslation: true,
    fallback: FALLBACK_INVENTORY_GROUPS
  })

  return dedupeEntries(entries)
}

export function getRingEntries(actor) {
  const helper = getHelpers()

  const helperMethods = [
    'getRingsList',
    'getRings',
    'getRingList',
    'getRingEntries',
    'ringsList',
    'rings'
  ]

  const helperArgSets = actor
    ? [[actor], [actor, { actor }], [{ actor }], []]
    : [[{ actor }], []]

  for (const methodName of helperMethods) {
    const method = helper?.[methodName]
    const entries = invokeAndNormalizeRingEntries(method, helper, helperArgSets, actor)
    if (entries.length > 0) return entries
  }

  const configPaths = [
    'rings.list',
    'rings.entries',
    'rings',
    'attributes.rings',
    'characteristics.rings'
  ]

  for (const path of configPaths) {
    const value = foundry.utils.getProperty(CONFIG?.l5r5e ?? {}, path)
    const entries = normalizeRingEntries(value, actor)
    if (entries.length > 0) return entries
  }

  const actorEntries = normalizeRingEntries(actor?.system?.rings, actor)
  if (actorEntries.length > 0) return actorEntries

  return normalizeRingEntries(FALLBACK_RINGS, actor)
}

export function getAttributeEntries(type, actor) {
  const config = ATTRIBUTE_CONFIG[type]
  if (!config) {
    return { entries: [], section: null }
  }

  const helperArgsSets = typeof config.helperArgsSets === 'function' ? config.helperArgsSets(actor) : (config.helperArgsSets ?? [[]])

  const entries = collectEntries({
    helperMethods: config.helperMethods,
    helperArgsSets,
    configPaths: config.configPaths,
    translationPrefix: config.translationPrefix,
    stringIsTranslation: true,
    fallback: []
  })

  const section = getActorSection(actor, config.actorPaths)

  if (entries.length > 0) {
    return { entries: dedupeEntries(entries), section }
  }

  if (!section) {
    return { entries: [], section: null }
  }

  const fallbackEntries = Object.keys(section).map((key) => {
    const actorKey = key
    const id = sanitizeId(actorKey)
    const translationKey = config.translationPrefix ? buildTranslationKey(config.translationPrefix, actorKey) : null
    return { id, actorKey, translationKey }
  })

  return { entries: dedupeEntries(fallbackEntries), section }
}

export function getActorSection(actor, paths = []) {
  if (!actor) return null
  const system = actor.system ?? {}
  for (const path of paths) {
    const value = foundry.utils.getProperty(system, path)
    if (value) return value
  }
  return null
}

function collectEntries({ helperMethods = [], helperArgsSets = [[]], configPaths = [], translationPrefix = null, stringIsTranslation = false, fallback = [] }) {
  const helperEntries = getEntriesFromHelpers(helperMethods, helperArgsSets, translationPrefix, stringIsTranslation)
  if (helperEntries.length > 0) {
    return helperEntries
  }

  const configEntries = getEntriesFromConfig(configPaths, translationPrefix, stringIsTranslation)
  if (configEntries.length > 0) {
    return configEntries
  }

  return fallback
}

function getEntriesFromHelpers(methodNames, helperArgsSets, translationPrefix, stringIsTranslation) {
  const helper = getHelpers()
  if (!helper) return []

  for (const methodName of methodNames) {
    const method = helper?.[methodName]
    if (typeof method !== 'function') continue

    for (const args of helperArgsSets) {
      try {
        const result = Array.isArray(args) ? method.apply(helper, args) : method.call(helper, args)
        const entries = normalizeEntries(result, { translationPrefix, stringIsTranslation })
        if (entries.length > 0) return entries
      } catch (error) {
        console.debug(`Token Action HUD L5R5e | Helper ${methodName} failed`, error)
      }
    }
  }

  return []
}

function getEntriesFromConfig(paths, translationPrefix, stringIsTranslation) {
  const config = CONFIG?.l5r5e
  if (!config) return []

  for (const path of paths) {
    const value = foundry.utils.getProperty(config, path)
    const entries = normalizeEntries(value, { translationPrefix, stringIsTranslation })
    if (entries.length > 0) return entries
  }

  return []
}

function normalizeEntries(value, options = {}) {
  if (!value) return []

  if (value instanceof Map) {
    return [...value.entries()].map(([key, entry]) => normalizeEntry(entry, key, options)).filter(Boolean)
  }

  if (Array.isArray(value)) {
    return value
      .map((entry, index) => normalizeEntry(entry, entry?.id ?? entry?.key ?? entry?.type ?? entry?.slug ?? entry ?? index, options))
      .filter(Boolean)
  }

  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([key, entry]) => normalizeEntry(entry, key, options))
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    const entry = normalizeEntry(value, value, options)
    return entry ? [entry] : []
  }

  return []
}

function normalizeEntry(entry, key, { translationPrefix, stringIsTranslation } = {}) {
  if (entry === null || entry === undefined) return null

  let rawId
  let translationKey
  let label
  let path

  if (typeof entry === 'object' && !Array.isArray(entry)) {
    rawId = entry.id ?? entry.key ?? entry.type ?? entry.slug ?? entry.value ?? entry.name ?? key
    translationKey = entry.translationKey ?? entry.labelKey ?? entry.i18n ?? null
    label = entry.label ?? entry.name ?? entry.title ?? entry.display ?? entry.text ?? null
    path = entry.path ?? entry.dataPath ?? null
  } else if (typeof entry === 'string') {
    rawId = key ?? entry
    if (stringIsTranslation && entry.includes('.')) {
      translationKey = entry
    } else if (!key) {
      rawId = entry
    }
    if (!translationKey && !label && stringIsTranslation && entry.includes('.')) {
      translationKey = entry
    }
    if (!label && !stringIsTranslation) {
      label = entry
    }
  } else {
    rawId = key
  }

  if (!rawId && rawId !== 0) return null

  const actorKey = typeof rawId === 'string' ? rawId : String(rawId)
  const id = sanitizeId(actorKey)

  if (!translationKey && translationPrefix) {
    translationKey = buildTranslationKey(translationPrefix, actorKey)
  }

  return { id, actorKey, translationKey, label, path }
}

function buildTranslationKey(prefix, key) {
  if (!prefix || key === null || key === undefined) return null
  const normalizedKey = String(key).replace(/\s+/g, '_').replace(/-/g, '_').toLowerCase()
  return `${prefix}.${normalizedKey}`
}

function dedupeEntries(entries) {
  const map = new Map()
  for (const entry of entries) {
    if (!entry?.id) continue
    if (!map.has(entry.id)) {
      map.set(entry.id, entry)
    }
  }
  return [...map.values()]
}

function invokeAndNormalizeRingEntries(method, context, argSets, actor) {
  if (typeof method !== 'function') return []

  for (const args of argSets) {
    try {
      const result = Array.isArray(args) ? method.apply(context, args) : method.call(context, args)
      const entries = normalizeRingEntries(result, actor)
      if (entries.length > 0) return entries
    } catch (error) {
      console.debug(`Token Action HUD L5R5e | Ring helper failed`, error)
    }
  }

  return []
}

function normalizeRingEntries(value, actor) {
  const entries = []

  const pushEntry = (entry, fallbackId) => {
    if (!entry && fallbackId === undefined) return
    const idSource = entry?.id ?? entry?.key ?? entry?.slug ?? entry?.value ?? entry?.name ?? fallbackId
    const id = sanitizeId(idSource)
    if (!id) return

    const label = entry?.label ?? entry?.name ?? entry?.title ?? entry?.translationKey ?? null
    const translationKey = entry?.translationKey ?? buildTranslationKey('l5r5e.rings', id)
    const ringValue = resolveRingValue(entry, id, actor)

    entries.push({ id, label, translationKey, value: ringValue })
  }

  if (!value) return entries

  if (value instanceof Map) {
    value.forEach((entry, key) => {
      if (typeof entry === 'object') {
        pushEntry(entry, key)
      } else {
        pushEntry({ value: entry }, key)
      }
    })
    return entries
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      if (typeof entry === 'object') {
        pushEntry(entry, entry?.id ?? entry?.key ?? entry?.slug ?? index)
      } else {
        pushEntry({ id: entry }, entry)
      }
    })
    return entries
  }

  if (typeof value === 'object') {
    Object.entries(value).forEach(([key, entry]) => {
      if (typeof entry === 'object') {
        pushEntry({ id: entry.id ?? key, ...entry }, key)
      } else {
        pushEntry({ id: key, value: entry }, key)
      }
    })
    return entries
  }

  if (typeof value === 'string') {
    pushEntry({ id: value }, value)
  }

  return entries
}

function resolveRingValue(entry, id, actor) {
  const ringValue = extractRingValue(entry)
  if (ringValue !== '' && ringValue !== undefined && ringValue !== null) return ringValue

  const actorRing = actor?.system?.rings?.[id] ?? actor?.system?.rings?.[unsanitizeId(id)]
  const actorValue = extractRingValue(actorRing)
  if (actorValue !== '' && actorValue !== undefined && actorValue !== null) return actorValue

  return ''
}

function extractRingValue(data) {
  if (data === null || data === undefined) return ''
  if (typeof data === 'number' || typeof data === 'string') return data
  if (typeof data !== 'object') return ''

  for (const key of ['value', 'rank', 'rating', 'level', 'dice', 'current', 'score']) {
    if (data[key] !== undefined) return data[key]
  }

  const numericValues = Object.values(data).filter((value) => typeof value === 'number')
  if (numericValues.length === 1) return numericValues[0]
  if (numericValues.length > 1) return numericValues.join('/')

  return ''
}

function getHelpers() {
  const system = game?.l5r5e ?? {}
  return system.HelpersL5r5e
    ?? system.helpers
    ?? system?.apps?.helpers
    ?? system?.applications?.helpers
    ?? system?.api?.helpers
    ?? system?.Helpers
    ?? null
}

