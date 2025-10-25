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
    const value = getProperty(system, path)
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
  const helper = game?.l5r5e?.HelpersL5r5e
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
    const value = getProperty(config, path)
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

function getProperty(object, path) {
  if (!object || !path) return undefined
  const keys = path.split('.')
  let result = object
  for (const key of keys) {
    if (result === null || result === undefined) return undefined
    result = result[key]
  }
  return result
}

