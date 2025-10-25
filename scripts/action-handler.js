
import { ACTION_TYPE, GROUP, ITEM_BONUS, ITEM_PATTERN, ITEM_QUALITIES, ITEM_TAGS } from './constants.js'
import { getAttributeEntries, getInventoryGroupEntries, getRingEntries, getTechniqueTypeEntries, sanitizeId, unsanitizeId } from './system-data.js'

export function createActionHandlerClass(api) {
  return class ActionHandler extends api.ActionHandler {
    /**
     * Build system actions
     * Called by Token Action HUD Core
     * @override
     * @param {array} groupIds
     */
    async buildSystemActions(groupIds) {
      // Set actor and token variables
      this.actors = (!this.actor) ? this.#getActors() : [this.actor]
      this.tokens = (!this.token) ? this.#getTokens() : [this.token]


      // BUGS
      //console.log(game.l5r5e)
      // // Combat Skill
      // console.log(CONFIG.l5r5e.initiativeSkills[game.settings.get(CONFIG.l5r5e.namespace, "initiative-encounter")])

      this.actorType = this.actor?.type

      // Settings
      this.displayUnequipped = Utils.getSetting('displayUnequipped')

      // Set items variable
      if (this.actor) {
        let items = this.actor.items
        items = api.Utils.sortItemsByName(items)
        this.items = items

        this.inventoryGroups = this.#createEntryMap(getInventoryGroupEntries())

        const techniqueEntries = getTechniqueTypeEntries()
        this.techniqueGroups = this.#createEntryMap(techniqueEntries)
        this.techniqueTypeKeys = new Set(techniqueEntries.flatMap((entry) => [entry.actorKey ?? entry.id, entry.id]))
      }

      if (this.actorType === 'character' || this.actorType === 'npc') {
        await this.#buildCharacterActions()
      } else if (!this.actor) {
        this.#buildMultipleTokenActions()
      }
    }

    /**
     * Build character actions
     * @private
     */
    async #buildCharacterActions() {
      await Promise.all([
        this.#buildInventory(),
        this.#buildTechniques()
      ])
      this.#buildRings()
      this.#buildDerivedAttributes()
      this.#buildStandingAttributes()
      this.#buildSkills()
    }

    /**
     * Build multiple token actions
     * @private
     * @returns {object}
     */
    #buildMultipleTokenActions() {
      const tokens = Array.isArray(this.tokens) ? this.tokens : []
      if (tokens.length === 0) return

      const actors = Array.isArray(this.actors) ? this.actors.filter((actor) => !!actor) : []

      const utilityActions = []
      const utilityGroupName = api.Utils.i18n?.('tokenActionHud.utility')
        ?? game.i18n.localize?.('tokenActionHud.utility')
        ?? 'Utility'

      const endTurnLabel = api.Utils.i18n?.('tokenActionHud.utility.endTurn')
        ?? game.i18n.localize?.('tokenActionHud.utility.endTurn')
        ?? 'End Turn'

      utilityActions.push({
        id: 'endTurn',
        name: endTurnLabel,
        encodedValue: ['utility', 'endTurn'].join(this.delimiter),
        listName: `${utilityGroupName}: ${endTurnLabel}`
      })

      if (utilityActions.length > 0) {
        const groupData = {
          id: 'utility',
          name: utilityGroupName,
          type: 'system'
        }

        this.addActions(utilityActions, groupData)
      }

      if (actors.length === 0) return

      const primaryActor = actors[0]
      if (!primaryActor) return

      const ringEntries = getRingEntries(primaryActor)
      if (ringEntries.length === 0) return

      const stanceSet = new Set(actors
        .map((actor) => actor?.system?.stance)
        .filter((stance) => typeof stance === 'string'))

      const ringActions = ringEntries
        .map((ring) => {
          try {
            const id = ring.id
            if (!id) return null

            const encodedValue = ['ring', id].join(this.delimiter)
            const translationKey = ring.translationKey ?? `l5r5e.rings.${id}`
            const localizedTranslation = translationKey ? api.Utils.i18n?.(translationKey) : null
            const ringLabel = localizedTranslation && localizedTranslation !== translationKey
              ? localizedTranslation
              : api.Utils.i18n?.(`l5r5e.rings.${id}`) ?? ring.label ?? id

            const actorValues = actors
              .map((actor) => this.#getActorRingValue(actor, id))
              .filter((value) => value !== undefined && value !== null && value !== '')

            let name = ringLabel
            if (actorValues.length === actors.length && actorValues.length > 0) {
              const uniqueValues = [...new Set(actorValues)]
              name = uniqueValues.length === 1
                ? `${ringLabel}: ${uniqueValues[0]}`
                : `${ringLabel}: ${uniqueValues.join('/')}`
            } else if (ring?.value !== undefined && ring?.value !== null && ring?.value !== '') {
              name = `${ringLabel}: ${ring.value}`
            }

            let cssClass = ''
            if (stanceSet.size === 1 && stanceSet.has(id)) {
              cssClass = 'toggle active'
            }

            const tooltipKey = `l5r5e.conflict.stances.${id}tip`
            const tooltipTranslation = api.Utils.i18n?.(tooltipKey)
            const tooltip = tooltipTranslation && tooltipTranslation !== tooltipKey ? tooltipTranslation : ''
            const img = api.Utils.getImage?.(`systems/l5r5e/assets/icons/rings/${id}.svg`)

            const valuesLabel = actorValues.length ? actorValues.join('/') : ''
            const listName = valuesLabel ? `${ringLabel}: ${valuesLabel}` : ringLabel

            return {
              id,
              name,
              img,
              encodedValue,
              cssClass,
              tooltip,
              listName
            }
          } catch (error) {
            api.Logger?.error?.(error)
            return null
          }
        })
        .filter((ring) => !!ring)

      if (ringActions.length === 0) return

      const ringGroupData = {
        id: 'rings',
        name: api.Utils.i18n?.('l5r5e.rings.title') ?? 'rings',
        type: 'system'
      }

      this.addActions(ringActions, ringGroupData)
    }

    /**
     * Build inventory
     * @private
     */
    async #buildInventory() {
      if (this.items.size === 0) return

      const inventoryMap = new Map()

      for (const [key, value] of this.items) {
        const equipped = value.system.equipped
        const hasQuantity = value.system?.quantity > 0
        const isEquippedItem = this.#isEquippedItem(value)
        const type = value.type

        // Set items into maps
        if (hasQuantity) {
          if (equipped) {
            if (!inventoryMap.has('equipped')) inventoryMap.set('equipped', new Map())
            inventoryMap.get('equipped').set(key, value)
          }
          if (!equipped) {
            if (!inventoryMap.has('unequipped')) inventoryMap.set('unequipped', new Map())
            inventoryMap.get('unequipped').set(key, value)
          }
          if (isEquippedItem) {
            // armor item weapon technique peculiarity
            if (type === 'item') {
              if (!inventoryMap.has('equipment')) inventoryMap.set('equipment', new Map())
              inventoryMap.get('equipment').set(key, value)
            }
            if (type === 'weapon') {
              if (!inventoryMap.has('weapons')) inventoryMap.set('weapons', new Map())
              inventoryMap.get('weapons').set(key, value)
            }
            if (type === 'armor') {
              if (!inventoryMap.has('armor')) inventoryMap.set('armor', new Map())
              inventoryMap.get('armor').set(key, value)
            }
          }
        }
      }

      // Loop through inventory subcateogry ids
      const knownGroupIds = this.inventoryGroups ? [...this.inventoryGroups.keys()] : []
      const inventoryGroupIds = [...inventoryMap.keys()]
      const groupIds = [...new Set([...knownGroupIds, ...inventoryGroupIds])]

      for (const groupId of groupIds) {
        const inventory = inventoryMap.get(groupId)
        if (!inventory || inventory.size === 0) continue

        const groupData = this.#getGroupData(groupId, this.inventoryGroups)

        // Build actions
        await this.#buildActions(inventory, groupData, groupId)
      }
    }

    /**
     * Build skills
     * @private
     */
    #buildRings() {
      const actionType = 'ring'

      // Get rings
      const rings = getRingEntries(this.actor)

      // Exit if there are no rings
      if (!rings || rings.length === 0) return

      // Get Stance
      const stance = this.actor?.system?.stance

      // Create group data
      const groupData = {
        id: 'rings',
        name: `${api.Utils.i18n('l5r5e.rings.title')}` ?? 'rings',
        type: 'system'
      }

      // Get actions
      const actions = rings
        .map((ring) => {
          try {
            const id = ring.id
            if (!id) return null

            const encodedValue = [actionType, id].join(this.delimiter)
            const translationKey = ring.translationKey ?? `l5r5e.rings.${id}`
            const localizedTranslation = translationKey ? api.Utils.i18n?.(translationKey) : null
            const ringLabel = localizedTranslation && localizedTranslation !== translationKey
              ? localizedTranslation
              : api.Utils.i18n?.(`l5r5e.rings.${id}`) ?? ring.label ?? id

            const value = ring?.value ?? this.#getActorRingValue(this.actor, id)
            const hasValue = value !== undefined && value !== null && value !== ''
            const name = hasValue ? `${ringLabel}: ${value}` : ringLabel
            const actionTypeName = api.Utils.i18n?.('l5r5e.rings.title')
            const listName = actionTypeName && actionTypeName !== 'l5r5e.rings.title'
              ? `${actionTypeName}: ${name}`
              : name
            const img = api.Utils.getImage(`systems/l5r5e/assets/icons/rings/${id}.svg`)

            const tooltipKey = `l5r5e.conflict.stances.${id}tip`
            const tooltipTranslation = api.Utils.i18n?.(tooltipKey)
            const tooltip = tooltipTranslation && tooltipTranslation !== tooltipKey ? tooltipTranslation : ''

            let cssClass = ''
            if (id === stance) {
              cssClass = 'toggle active'
            }

            const action = {
              id,
              name,
              img,
              encodedValue,
              cssClass,
              tooltip,
              listName
            }

            if (hasValue) {
              action.info1 = { text: value }
            }

            return action
          } catch (error) {
            api.Logger.error(ring)
            return null
          }
        })
        .filter((ring) => !!ring)

      // Add actions to HUD
      this.addActions(actions, groupData)
    }

    /**
     * Build skills
     * @private
     */
    #buildSkills() {
      if (!['character', 'npc'].includes(this.actorType)) return

      const actionType = 'skill'
      const categories = this.#getActorSkillCategories()

      for (const category of categories) {
        const catId = category.id
        try {
          const groupData = {
            id: catId,
            name: category.label,
            type: 'system'
          }

          const actions = category.skills.map((skillId) => {
            const encodedValue = [actionType, skillId].join(this.delimiter)
            const value = this.#getActorSkillValue(catId, skillId)
            const fallbackSkillLabel = category.skillLabels instanceof Map
              ? category.skillLabels.get(skillId) ?? category.skillLabels.get(String(skillId))
              : category.skillLabels?.[skillId] ?? category.skillLabels?.[String(skillId)]
            const localizedSkill = this.#getSkillLabel(catId, skillId, fallbackSkillLabel)
            const hasValue = value !== '' && value !== null && value !== undefined
            const name = hasValue ? `${localizedSkill}: ${value}` : localizedSkill
            const actionTypeName = `${api.Utils.i18n('l5r5e.skills.label')}: ` ?? ''
            const listName = `${actionTypeName}${name}`

            return {
              id: skillId,
              name,
              encodedValue,
              listName
            }
          })

          this.addActions(actions, groupData)
        } catch (error) {
          api.Logger.error(catId)
          return null
        }
      }
    }

    #getActorSkillCategories() {
      const helpers = game.l5r5e?.HelpersL5r5e ?? {}
      const baseSource = this.actorType === 'npc'
        ? this.#resolveSkillSource(helpers, true)
        : this.#resolveSkillSource(helpers, false)

      const entries = this.#normalizeCategoryEntries(baseSource)

      return entries
        .map((entry) => {
          if (!entry || !entry.id || !entry.skills || entry.skills.length === 0) return null
          const label = this.#getSkillCategoryLabel(entry.id, entry.label)
          return {
            id: entry.id,
            label,
            skills: entry.skills,
            skillLabels: entry.skillLabels
          }
        })
        .filter((category) => category && category.skills.length > 0)
    }

    #normalizeCategoryEntries(source) {
      if (!source) return []

      const entries = []

      const addEntry = (value, key) => {
        const entry = this.#normalizeCategoryEntry(value, key)
        if (entry && entry.id) entries.push(entry)
      }

      if (source instanceof Map) {
        for (const [key, value] of source.entries()) addEntry(value, key)
        return entries
      }

      if (Array.isArray(source)) {
        source.forEach((value, index) => addEntry(value, index))
        return entries
      }

      if (typeof source === 'object') {
        Object.entries(source).forEach(([key, value]) => addEntry(value, key))
        return entries
      }

      return []
    }

    #normalizeCategoryEntry(entry, key) {
      if (entry === null || entry === undefined) return null

      const normalizedKey = typeof key === 'string' || typeof key === 'number' ? String(key) : undefined

      if (Array.isArray(entry) && entry.length > 0) {
        if (entry.length >= 2) {
          const [idValue, skillsValue, labelValue] = entry
          const { ids, labels } = this.#extractSkillIdsAndLabels(skillsValue)
          const id = typeof idValue === 'string' || typeof idValue === 'number' ? String(idValue) : normalizedKey
          const label = typeof labelValue === 'string' ? labelValue : entry.label ?? entry.name ?? null
          return { id, label, skills: ids, skillLabels: labels }
        }
        const { ids, labels } = this.#extractSkillIdsAndLabels(entry)
        return { id: normalizedKey, label: entry.label ?? entry.name ?? null, skills: ids, skillLabels: labels }
      }

      if (entry instanceof Set || entry instanceof Map) {
        const { ids, labels } = this.#extractSkillIdsAndLabels(entry)
        const label = entry.label ?? entry.name ?? entry.title ?? null
        return { id: normalizedKey, label, skills: ids, skillLabels: labels }
      }

      if (typeof entry === 'object') {
        const id = typeof entry.id === 'string' || typeof entry.id === 'number'
          ? String(entry.id)
          : typeof entry.key === 'string' || typeof entry.key === 'number'
            ? String(entry.key)
            : typeof entry.category === 'string' || typeof entry.category === 'number'
              ? String(entry.category)
              : typeof entry.type === 'string' || typeof entry.type === 'number'
                ? String(entry.type)
                : normalizedKey

        const label = entry.label ?? entry.name ?? entry.title ?? entry.categoryLabel ?? entry.categoryName ?? null

        const skillsSource = entry.skills
          ?? entry.skillIds
          ?? entry.skill_ids
          ?? entry.skillList
          ?? entry.skill_list
          ?? entry.skillGroups
          ?? entry.skill_groups
          ?? entry.values
          ?? entry.entries
          ?? entry.list
          ?? entry.items
          ?? entry.data
          ?? entry.set
          ?? entry.group

        const { ids, labels } = this.#extractSkillIdsAndLabels(skillsSource ?? entry)

        return { id, label, skills: ids, skillLabels: labels }
      }

      if (typeof entry === 'string' || typeof entry === 'number') {
        const { ids, labels } = this.#extractSkillIdsAndLabels([entry])
        const id = normalizedKey ?? (ids.length === 1 ? ids[0] : String(entry))
        return { id, label: null, skills: ids, skillLabels: labels }
      }

      return null
    }

    #extractSkillIdsAndLabels(data) {
      const ids = []
      const labels = new Map()

      const addSkill = (value, label) => {
        if (value === null || value === undefined) return
        const id = String(value)
        if (!id) return
        ids.push(id)
        if (label && !labels.has(id)) labels.set(id, String(label))
      }

      const visit = (value, fallbackId) => {
        if (value === null || value === undefined) return

        if (value instanceof Set) {
          value.forEach((entry) => visit(entry))
          return
        }

        if (value instanceof Map) {
          for (const [mapKey, mapValue] of value.entries()) {
            if (typeof mapValue === 'object' && mapValue !== null) {
              const id = mapValue.id ?? mapValue.key ?? mapValue.skill ?? mapValue.slug ?? mapValue.value ?? mapKey
              const label = mapValue.label ?? mapValue.name ?? mapValue.title ?? null
              if (id !== undefined) addSkill(id, label)
              visit(mapValue.skills ?? mapValue.skill ?? mapValue.values ?? mapValue.entries ?? mapValue.list ?? mapValue.items, null)
            } else {
              visit(mapValue, mapKey)
            }
          }
          return
        }

        if (Array.isArray(value)) {
          value.forEach((entry) => {
            if (Array.isArray(entry)) {
              visit(entry)
            } else if (typeof entry === 'object' && entry !== null) {
              const id = entry.id ?? entry.key ?? entry.skill ?? entry.slug ?? entry.value ?? entry.default ?? entry.primary ?? fallbackId
              const label = entry.label ?? entry.name ?? entry.title ?? entry.displayName ?? null
              if (id !== undefined) addSkill(id, label)
              const nested = entry.skills ?? entry.skill ?? entry.values ?? entry.entries ?? entry.list ?? entry.items
              if (nested) visit(nested)
            } else {
              visit(entry)
            }
          })
          return
        }

        if (typeof value === 'object') {
          const id = value.id ?? value.key ?? value.skill ?? value.slug ?? value.value ?? value.default ?? value.primary ?? fallbackId
          const label = value.label ?? value.name ?? value.title ?? value.displayName ?? null
          if (id !== undefined) addSkill(id, label)
          const nestedKeys = ['skill', 'skills', 'ids', 'id', 'keys', 'key', 'values', 'value', 'default', 'primary', 'entries', 'list', 'items', 'options', 'choices']
          for (const nestedKey of nestedKeys) {
            if (value[nestedKey] !== undefined) visit(value[nestedKey])
          }
          return
        }

        if (typeof value === 'string' || typeof value === 'number') {
          addSkill(value)
        }
      }

      visit(data)

      return { ids: this.#dedupeIds(ids), labels }
    }

    #normalizeSkillIds(skills) {
      if (!skills) return []
      if (skills instanceof Map) {
        return this.#dedupeIds([...skills.values()])
      }
      if (Array.isArray(skills)) {
        return this.#dedupeIds(skills.flatMap((entry) => this.#normalizeSkillIds(entry)))
      }
      if (typeof skills === 'string') return this.#dedupeIds([skills])
      if (typeof skills === 'object') {
        if (skills.id) return this.#normalizeSkillIds(skills.id)
        if (skills.key) return this.#normalizeSkillIds(skills.key)
        if (skills.value) return this.#normalizeSkillIds(skills.value)
        if (skills.default) return this.#normalizeSkillIds(skills.default)
        if (skills.skills) return this.#normalizeSkillIds(skills.skills)
        if (skills.entries) return this.#normalizeSkillIds(skills.entries)
        if (skills.list) return this.#normalizeSkillIds(skills.list)
        if (skills.items) return this.#normalizeSkillIds(skills.items)
        return this.#dedupeIds(Object.values(skills).flatMap((entry) => this.#normalizeSkillIds(entry)))
      }
      return []
    }

    #dedupeIds(list) {
      return [...new Set(list
        .map((value) => {
          if (value === null || value === undefined) return ''
          return String(value)
        })
        .filter((value) => value))]
    }

    #getSkillCategoryLabel(categoryId, fallbackLabel) {
      if (fallbackLabel) return fallbackLabel

      const helper = game.l5r5e?.HelpersL5r5e
      const helperMethods = ['getSkillCategoryLabel', 'getNpcSkillCategoryLabel']
      for (const methodName of helperMethods) {
        const method = helper?.[methodName]
        if (typeof method !== 'function') continue
        try {
          const result = method.call(helper, categoryId, this.actor)
          if (result) return result
        } catch (error) {
          continue
        }
      }

      const config = CONFIG?.l5r5e ?? {}
      const configCategory = config?.npc?.skills?.[categoryId] ?? config?.skills?.[categoryId]
      if (configCategory) {
        const configLabel = configCategory.label ?? configCategory.name ?? configCategory.title
        if (configLabel) return configLabel
      }

      const keys = [
        `l5r5e.npc.skills.${categoryId}.title`,
        `l5r5e.skills.${categoryId}.title`,
        `l5r5e.skills.${categoryId}`,
        categoryId
      ]
      return this.#localizeFirst(keys)
    }

    #getSkillLabel(categoryId, skillId, fallbackLabel) {
      if (fallbackLabel) return fallbackLabel

      const helper = game.l5r5e?.HelpersL5r5e
      const helperMethods = [
        ['getNpcSkillLabel', [categoryId, skillId]],
        ['getNpcSkillLabel', [skillId]],
        ['getSkillLabel', [categoryId, skillId]],
        ['getSkillLabel', [skillId]],
        ['getSkillName', [skillId]],
        ['getSkillNameFromId', [skillId]]
      ]

      for (const [methodName, args] of helperMethods) {
        const method = helper?.[methodName]
        if (typeof method !== 'function') continue
        try {
          const result = method.apply(helper, args)
          if (result) return result
        } catch (error) {
          continue
        }
      }

      const config = CONFIG?.l5r5e ?? {}
      const configSkill = config?.npc?.skills?.[categoryId]?.[skillId]
        ?? config?.skills?.[categoryId]?.[skillId]
        ?? config?.skills?.[skillId]
      if (configSkill) {
        const configLabel = configSkill.label ?? configSkill.name ?? configSkill.title
        if (configLabel) return configLabel
      }

      const keys = [
        `l5r5e.npc.skills.${categoryId}.${skillId}`,
        `l5r5e.skills.${categoryId}.${skillId}`,
        `l5r5e.skills.${skillId}`,
        `l5r5e.skill.${skillId}`,
        skillId
      ]
      return this.#localizeFirst(keys)
    }

    #getActorSkillValue(categoryId, skillId) {
      const sources = [
        this.actor?.system?.skills,
        this.actor?.system?.npcSkills,
        this.actor?.system?.npc?.skills,
        this.actor?.system?.npc?.skillCategories,
        this.actor?.system?.npc?.skill_categories,
        this.actor?.system?.npc?.skillGroups,
        this.actor?.system?.npc?.skill_groups,
        this.actor?.system?.skillRanks,
        this.actor?.system?.skillGroups,
        this.actor?.system?.skill_groups
      ]

      for (const source of sources) {
        const category = source?.[categoryId]
        if (!category) continue
        const skill = category?.[skillId]
        const value = this.#resolveSkillValue(skill)
        if (value !== null && value !== undefined) return value
      }

      const directSkill = this.actor?.system?.skills?.[skillId]
      const directValue = this.#resolveSkillValue(directSkill)
      if (directValue !== null && directValue !== undefined) return directValue

      return ''
    }

    #resolveSkillSource(helpers, npc = false) {
      const actor = this.actor
      const methodNames = npc
        ? [
            'getNpcSkillCategoriesList',
            'getNpcSkillCategories',
            'getNpcSkillsCategoriesList',
            'getNpcSkillsCategories',
            'getNpcSkillsList',
            'getNpcSkills',
            'getNpcSkillGroupsList',
            'getNpcSkillGroups'
          ]
        : [
            'getCategoriesSkillsList',
            'getSkillCategoriesList',
            'getSkillsCategoriesList',
            'getSkillsList',
            'getSkillCategories'
          ]

      const dynamicMethods = Object.keys(helpers ?? {})
        .filter((key) => {
          const lowered = key.toLowerCase()
          if (!lowered.includes('skill')) return false
          if (npc && !lowered.includes('npc')) return false
          if (!npc && lowered.includes('npc')) return false
          return lowered.includes('list') || lowered.includes('categor') || lowered.includes('group')
        })

      const tried = new Set()
      const tryMethods = [...methodNames, ...dynamicMethods]
      for (const methodName of tryMethods) {
        if (tried.has(methodName)) continue
        tried.add(methodName)
        const method = helpers?.[methodName]
        const result = this.#invokeHelperMethod(method, helpers, actor)
        if (result) return result
      }

      const fallbackPaths = npc
        ? [
            'system.npc.skills',
            'system.npcSkills',
            'system.skills',
            'system.npc.skillCategories',
            'system.npc.skill_categories',
            'system.npc.skillGroups',
            'system.npc.skill_groups'
          ]
        : [
            'system.skills',
            'system.skillCategories',
            'system.skill_categories',
            'system.skillGroups',
            'system.skill_groups'
          ]

      for (const path of fallbackPaths) {
        const value = foundry.utils.getProperty(actor, path)
        if (value) return value
      }

      return npc
        ? actor?.system?.npcSkills ?? actor?.system?.skills
        : actor?.system?.skills
    }

    #invokeHelperMethod(method, context, actor) {
      if (typeof method !== 'function') return null
      const argSets = [
        [actor],
        [actor, { actor }],
        []
      ]

      for (const args of argSets) {
        try {
          const result = method.apply(context, args)
          if (result) return result
        } catch (error) {
          continue
        }
      }

      return null
    }

    #resolveSkillValue(skill) {
      if (skill === null || skill === undefined) return null
      if (typeof skill === 'number' || typeof skill === 'string') return skill
      if (typeof skill === 'object') {
        for (const key of ['value', 'rank', 'dice', 'level', 'rating']) {
          if (skill[key] !== undefined) return skill[key]
        }
      }
      return null
    }

    #localizeFirst(keys) {
      for (const key of keys) {
        if (!key) continue
        const localized = api.Utils.i18n(key)
        if (localized && localized !== key) return localized
      }
      return keys[keys.length - 1] ?? ''
    }

    /**
     * Build skills
     * @private
     */
    async #buildTechniques(groupId) {
      if (this.items.size === 0) return

      const techniqueMap = new Map()

      for (const [key, value] of this.items) {
        const isTechnique = this.#isTechnique(value)

        if (isTechnique) {
          const technique_type = sanitizeId(value.system.technique_type)
          if (!technique_type) continue

          if (!techniqueMap.has(technique_type)) techniqueMap.set(technique_type, new Map())
          techniqueMap.get(technique_type).set(key, value)
        }
      }

      const knownGroupIds = this.techniqueGroups ? [...this.techniqueGroups.keys()] : []
      const techniqueGroupIds = [...techniqueMap.keys()]
      const groupIds = [...new Set([...knownGroupIds, ...techniqueGroupIds])]

      // Loop through technique group ids
      for (const groupId of groupIds) {
        const techniques = techniqueMap.get(groupId)
        if (!techniques || techniques.size === 0) continue

        // Create group data
        const groupData = this.#getGroupData(groupId, this.techniqueGroups, { fallbackPrefix: 'l5r5e.techniques' })

        // Build actions
        await this.#buildActions(techniques, groupData, 'technique')
      }
    }

    /**
    * Get actors
    * @private
    * @returns {object}
    */
    #getActors() {
      const allowedTypes = ['character', 'npc']
      const tokens = api.Utils.getControlledTokens()
      const actors = tokens?.filter(token => token.actor).map((token) => token.actor)
      if (actors.every((actor) => allowedTypes.includes(actor.type))) {
        return actors
      } else {
        return []
      }
    }

    /**
     * Get tokens
     * @private
     * @returns {object}
     */
    #getTokens() {
      const allowedTypes = ['character', 'npc']
      const tokens = api.Utils.getControlledTokens()
      const actors = tokens?.filter(token => token.actor).map((token) => token.actor)
      if (actors.every((actor) => allowedTypes.includes(actor.type))) {
        return tokens
      } else {
        return []
      }
    }

    /**
     * Is equipped item
     * @private
     * @param {object} item
     * @returns {boolean}
     */
    #isEquippedItem(item) {
      const type = item.type
      const excludedTypes = ['item', 'technique', 'peculiarity']
      if (this.displayUnequipped && !excludedTypes.includes(type)) return true
      const equipped = item.system.equipped
      if (equipped) return true
      return false
    }

    /**
     * Is readied item
     * @private
     * @param {object} item
     * @returns {boolean}
     */
    #isTechnique(item) {
      const type = item.type

      if (type !== 'technique') return false

      if (!this.techniqueTypeKeys || this.techniqueTypeKeys.size === 0) return true

      const techniqueType = item.system.technique_type
      if (!techniqueType) return false

      return this.techniqueTypeKeys.has(techniqueType) || this.techniqueTypeKeys.has(sanitizeId(techniqueType))
    }

    #buildDerivedAttributes() {
      this.#buildAttributeGroup('derived')
    }

    #buildStandingAttributes() {
      this.#buildAttributeGroup('standing')
    }

    #buildAttributeGroup(attributeType) {
      if (!this.actor) return

      const { entries, section } = getAttributeEntries(attributeType, this.actor)
      if (entries.length === 0) return

      const actions = entries
        .map((entry) => this.#createAttributeAction(entry, section, attributeType))
        .filter((action) => !!action)

      if (actions.length === 0) return

      const groupData = this.#getAttributeGroupData(attributeType)

      this.addActions(actions, groupData)
    }

    #createAttributeAction(entry, section, attributeType) {
      const data = this.#resolveAttributeData(section, entry, attributeType)
      if (data === undefined) return null

      const value = this.#formatAttributeValue(data)
      const hasValue = value !== ''
      const label = this.#localizeEntryName(entry, attributeType)

      const name = hasValue ? `${label}: ${value}` : label
      const prefix = api.Utils.i18n(ACTION_TYPE[attributeType] ?? GROUP?.[attributeType]?.name ?? '')
      const listName = prefix ? `${prefix}: ${name}` : name
      const encodedValue = [attributeType, entry.actorKey ?? entry.id].join(this.delimiter)

      const action = {
        id: entry.id,
        name,
        encodedValue,
        listName
      }

      if (hasValue) {
        action.info1 = { text: value }
      }

      return action
    }

    #resolveAttributeData(section, entry, attributeType) {
      const sections = this.#getAttributeSections(section, attributeType)
      const candidatePaths = []

      if (entry.path) candidatePaths.push(entry.path)

      const keys = [entry.actorKey, entry.id]
      keys.forEach((key) => {
        if (!key) return
        candidatePaths.push(key)
        candidatePaths.push(String(key).replace(/-/g, '_'))
      })

      for (const currentSection of sections) {
        for (const path of candidatePaths) {
          const value = foundry.utils.getProperty(currentSection, path)
          if (value !== undefined) return value
        }
      }

      return undefined
    }

    #getAttributeSections(section, attributeType) {
      const sections = []
      if (section && typeof section === 'object') sections.push(section)

      const system = this.actor?.system ?? {}
      const paths = attributeType === 'standing'
        ? ['standing', 'social', 'attributes.standing', 'attributes.social']
        : ['derived', 'derivedAttributes', 'attributes.derived', 'attributes.derivedAttributes']

      for (const path of paths) {
        const value = foundry.utils.getProperty(system, path)
        if (value && typeof value === 'object' && !sections.includes(value)) {
          sections.push(value)
        }
      }

      if (system && typeof system === 'object' && !sections.includes(system)) {
        sections.push(system)
      }

      return sections
    }

    #formatAttributeValue(data) {
      if (data === null || data === undefined) return ''

      if (typeof data === 'number' || typeof data === 'string') {
        return String(data)
      }

      const primary = this.#firstDefined(data.value, data.current, data.rank, data.score, data.points, data.amount, data.total)
      const maximum = this.#firstDefined(data.max, data.maximum, data.cap, data.limit, data.maxValue, data.maximumValue)

      if (primary !== undefined && maximum !== undefined) {
        return `${primary}/${maximum}`
      }

      if (primary !== undefined) {
        return String(primary)
      }

      if (data.current !== undefined && data.max !== undefined) {
        return `${data.current}/${data.max}`
      }

      if (data.current !== undefined) {
        return String(data.current)
      }

      if (data.rank !== undefined && data.cap !== undefined) {
        return `${data.rank}/${data.cap}`
      }

      if (data.rank !== undefined) {
        return String(data.rank)
      }

      const numericValues = Object.values(data).filter((value) => typeof value === 'number')
      if (numericValues.length === 1) {
        return String(numericValues[0])
      }

      if (numericValues.length > 1) {
        return numericValues.join('/')
      }

      return ''
    }

    #localizeEntryName(entry, attributeType) {
      const translation = entry.translationKey
      if (translation) return api.Utils.i18n(translation)

      if (entry.label) return api.Utils.i18n(entry.label)

      const prefix = (attributeType === 'standing') ? 'l5r5e.social' : 'l5r5e.attributes'
      const key = entry.actorKey ?? entry.id
      if (key) {
        const translationKey = `${prefix}.${String(key).replace(/-/g, '_').toLowerCase()}`
        return api.Utils.i18n(translationKey)
      }

      return entry.id
    }

    #getActorRingValue(actor, ringId) {
      if (!actor || !ringId) return ''
      const rings = actor?.system?.rings ?? {}
      const sanitizedId = sanitizeId(ringId)
      const unsanitizedId = unsanitizeId(ringId)

      const candidates = [
        rings?.[ringId],
        rings?.[sanitizedId],
        rings?.[unsanitizedId]
      ]

      for (const candidate of candidates) {
        const value = this.#extractRingValue(candidate)
        if (value !== '' && value !== undefined && value !== null) return value
      }

      if (rings && typeof rings === 'object') {
        for (const [key, value] of Object.entries(rings)) {
          if (sanitizeId(key) !== sanitizedId) continue
          const resolved = this.#extractRingValue(value)
          if (resolved !== '' && resolved !== undefined && resolved !== null) return resolved
        }
      }

      return ''
    }

    #extractRingValue(data) {
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

    #getGroupData(groupId, groupMap, { fallbackPrefix } = {}) {
      const entry = groupMap?.get(groupId)

      let nameKey = entry?.translationKey
      let labelKey = entry?.label

      if (!nameKey && fallbackPrefix) {
        const actorKey = entry?.actorKey ?? groupId
        nameKey = `${fallbackPrefix}.${String(actorKey).replace(/-/g, '_').toLowerCase()}`
      }

      const fallbackGroupName = GROUP?.[groupId]?.name
      const name = nameKey
        ? api.Utils.i18n(nameKey)
        : labelKey
          ? api.Utils.i18n(labelKey)
          : fallbackGroupName
            ? api.Utils.i18n(fallbackGroupName)
            : this.#humanize(groupId)

      return {
        id: groupId,
        name,
        type: 'system'
      }
    }

    #getAttributeGroupData(attributeType) {
      const groupId = attributeType
      const nameKey = GROUP?.[groupId]?.name
      return {
        id: groupId,
        name: nameKey ? api.Utils.i18n(nameKey) : groupId,
        type: 'system'
      }
    }

    #firstDefined(...values) {
      return values.find((value) => value !== undefined && value !== null)
    }

    #createEntryMap(entries) {
      return new Map(entries.map((entry) => [entry.id, entry]))
    }

    #humanize(value) {
      return String(value ?? '')
        .split(/[-_]/)
        .filter((part) => part.length > 0)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    }

    /**
     * Build actions
     * @private
     * @param {object} items
     * @param {object} groupData
     * @param {string} actionType
     */
    async #buildActions(items, groupData, actionType = 'item') {
      // Exit if there are no items
      if (items.size === 0) return

      // Exit if there is no groupId
      const groupId = (typeof groupData === 'string' ? groupData : groupData?.id)
      if (!groupId) return

      // Get actions
      const actions = await Promise.all([...items].map(async item => await this.#getAction(actionType, item[1])))

      // Add actions to action list
      this.addActions(actions, groupData)
    }

    /**
     * Get action
     * @private
     * @param {string} actionType
     * @param {object} entity
     * @returns {object}
     */
    async #getAction(actionType, entity) {
      const fallbackId = sanitizeId(entity.name ?? '') || foundry.utils.randomID()
      const id = String(entity.id ?? entity.uuid ?? fallbackId)
      let name = entity?.name ?? entity?.label

      const actionTypeName = `${api.Utils.i18n(ACTION_TYPE[actionType])}: ` ?? ''
      const listName = `${actionTypeName}${name}`

      let cssClass = ''

      if (Object.hasOwn(entity.system, 'readied')) {
        const active = (entity.system.readied) ? ' active' : ''
        cssClass = `toggle${active}`
      }

      const encodedValue = [actionType, id].join(this.delimiter)
      const img = api.Utils.getImage(entity)
      const icon1 = this.#getActivationTypeIcon(entity?.system?.activation?.type)
      let icon2 = null
      let info = this.#getItemInfo(entity)
      const info1 = info?.info1
      const info2 = info?.info2
      const info3 = info?.info3
      const tooltipData = await this.#getTooltipData(entity)
      const tooltip = await this.#getTooltip(tooltipData)
      return {
        id,
        name,
        encodedValue,
        cssClass,
        img,
        icon1,
        icon2,
        info1,
        info2,
        info3,
        listName,
        tooltip
      }
    }

    /**
     * Get icon for the activation type
     * @private
     * @param {object} activationType
     * @returns {string}
     */
    #getActivationTypeIcon(activationType) {
      const title = ''
      const icon = ''
      if (icon) return `<i class="${icon}" title="${title}"></i>`
    }

    /**
     * Get item info
     * @private
     * @param {object} item
     * @returns {object}
     */
    #getItemInfo(item) {
      const quantityData = this.#getQuantityData(item)
      const usesData = this.#getUsesData(item)
      const consumeData = this.#getConsumeData(item)

      return {
        info1: { text: quantityData },
        info2: { text: usesData },
        info3: { text: consumeData }
      }
    }

    /**
     * Get quantity
     * @private
     * @param {object} item
     * @returns {string}
     */
    #getQuantityData(item) {
      const quantity = item?.system?.quantity ?? 0
      return (quantity > 1) ? quantity : ''
    }

    /**
     * Get uses
     * @private
     * @param {object} item
     * @returns {string}
     */
    #getUsesData(item) {
      const uses = item?.system?.uses
      if (!uses) return ''
      return (uses.value > 0 || uses.max > 0) ? `${uses.value ?? '0'}${(uses.max > 0) ? `/${uses.max}` : ''}` : ''
    }

    /**
     * Get consume
     * @private
     * @param {object} item
     * @param {object} actor
     * @returns {string}
     */
    #getConsumeData(item) {
      // Get consume target and type
      const consumeId = item?.system?.consume?.target
      const consumeType = item?.system?.consume?.type

      if (consumeId === item.id) return ''

      // Return resources
      if (consumeType === 'attribute') {
        if (!consumeId) return ''
        const parentId = consumeId.substr(0, consumeId.lastIndexOf('.'))
        const target = this.actor.system[parentId]

        return (target) ? `${target.value ?? '0'}${(target.max) ? `/${target.max}` : ''}` : ''
      }

      const target = this.items.get(consumeId)

      // Return charges
      if (consumeType === 'charges') {
        const uses = target?.system.uses

        return (uses?.value) ? `${uses.value}${(uses.max) ? `/${uses.max}` : ''}` : ''
      }

      // Return quantity
      return target?.system?.quantity ?? ''
    }

    async #getTooltipData(entity) {
      if (this.tooltipsSetting === 'none') return ''

      const name = entity?.name ?? ''

      if (this.tooltipsSetting === 'nameOnly') return name

      const description = typeof entity?.system?.description === 'string'
        ? entity?.system?.description
        : entity?.system?.description?.value ?? ''

      const modifiers = entity?.modifiers ?? null
      const properties = [
        ...(entity?.system?.chatProperties ?? []),
        ...(entity?.system?.equippableItemCardProperties ?? []),
        ...(entity?.system?.activatedEffectCardProperties ?? [])
      ].filter(Boolean)

      const type = entity?.type
      const rarity = entity?.system?.rarity?.value ?? entity?.system?.rarity ?? null
      const traits = this.#getItemQualities(entity?.system?.properties)
      const patterns = this.#getItemPatterns(entity?.system?.patterns)
      const tags = this.#getItemTags(entity?.system?.tags)
      const bonuses = this.#getItemBonuses(entity?.system?.bonuses)
      const range = type === 'weapon' ? (entity?.system?.range?.value ?? entity?.system?.range) : null
      const damage = type === 'weapon' ? (entity?.system?.damage?.value ?? entity?.system?.damage) : null
      const deadliness = type === 'weapon' ? (entity?.system?.deadliness?.value ?? entity?.system?.deadliness) : null
      const grip1 = type === 'weapon' ? (entity?.system?.grip_1?.value ?? entity?.system?.grip_1) : null
      const grip2 = type === 'weapon' ? (entity?.system?.grip_2?.value ?? entity?.system?.grip_2) : null
      const physical = type === 'armor' ? (entity?.system?.armor?.physical?.value ?? entity?.system?.armor?.physical) : null
      const supernatural = type === 'armor' ? (entity?.system?.armor?.supernatural?.value ?? entity?.system?.armor?.supernatural) : null

      return {
        name,
        type,
        description,
        modifiers,
        properties,
        rarity,
        traits,
        patterns,
        tags,
        bonuses,
        range,
        damage,
        deadliness,
        grip1,
        grip2,
        physical,
        supernatural
      }
    }

    #getItemQualities(itemProperties) {
      const entries = this.#normalisePropertyEntries(itemProperties)
      if (!entries.length) return null

      const qualities = entries
        .map(entry => {
          if (!entry) return null

          const data = (typeof entry === 'object') ? entry : { id: entry }
          const id = this.#normaliseId(data?.id ?? data?.key ?? data?.slug ?? data?.name)
          if (!id) return null

          const isActive = (data?.active ?? data?.enabled ?? data?.value ?? true) !== false
          if (!isActive) return null

          const labelKey = ITEM_QUALITIES[id]
          const fallback = data?.label ?? data?.name ?? this.#formatLabel(id)

          if (!labelKey && !fallback) return null

          if (!labelKey) return fallback

          const localized = api.Utils.i18n(labelKey)
          if (localized && localized !== labelKey) return localized

          return fallback ?? labelKey
        })
        .filter(Boolean)

      return qualities.length ? qualities : null
    }

    /**
     * Get tooltip
     * @param {object} tooltipData The tooltip data
     * @returns {string}           The tooltip
     */
    async #getTooltip(tooltipData) {
      if (this.tooltipsSetting === 'none') return ''
      if (typeof tooltipData === 'string') return tooltipData

      const name = api.Utils.i18n(tooltipData.name)

      if (this.tooltipsSetting === 'nameOnly') return name

      const nameHtml = `<h3>${name}</h3>`

      const description = tooltipData?.descriptionLocalised ??
        await TextEditor.enrichHTML(api.Utils.i18n(tooltipData?.description ?? ''), { async: true })

      const propertiesHtml = tooltipData?.traits?.length
        ? `<div class="tah-properties">${tooltipData.traits.map(trait => `<span class="tah-property">${trait}</span>`).join('')}</div>`
        : ''

      const rarityTag = tooltipData?.rarity
        ? [{
          label: 'tokenActionHud.l5r5e.tooltip.rarity',
          value: tooltipData.rarity,
          class: this.#getItemRarity(tooltipData.rarity)
        }]
        : []

      const weaponStatsTags = tooltipData.type === 'weapon' ? this.#getWeaponStats(tooltipData) : []
      const gripModTags = tooltipData.type === 'weapon' ? this.#getGripMod(tooltipData) : []
      const armorStatsTags = tooltipData.type === 'armor' ? this.#getArmorStats(tooltipData) : []
      const patternTags = tooltipData.patterns ?? []
      const customTags = tooltipData.tags ?? []
      const bonusTags = tooltipData.bonuses ?? []

      const tagGroups = [
        rarityTag,
        weaponStatsTags,
        gripModTags,
        armorStatsTags,
        patternTags,
        customTags,
        bonusTags
      ].flat()

      const tagsHtml = this.#renderTagCollection(tagGroups)
      const modifiersHtml = ''
      const headerTags = (tagsHtml || modifiersHtml) ? `<div class="tah-tags-wrapper">${tagsHtml ?? ''}${modifiersHtml}</div>` : ''

      if (!description && !tagsHtml && !modifiersHtml) return name

      return `<div>${nameHtml}${headerTags}${description}${propertiesHtml}</div>`
    }

    #getItemRarity(rarity) {
      if (!rarity) return ''
      if (rarity < 3) return 'common'
      if (rarity < 5) return 'uncommon'
      if (rarity < 7) return 'rare'
      if (rarity < 9) return 'veryRare'
      if (rarity == 9) return 'legendary'
      if (rarity == 10) return 'artifact'
    }

    #getWeaponStats(tooltipData) {
      const range = tooltipData.range
        ? { label: 'l5r5e.weapons.range', value: tooltipData.range }
        : null
      const damage = tooltipData.damage
        ? { label: 'l5r5e.weapons.damage', value: tooltipData.damage }
        : null
      const deadliness = tooltipData.deadliness
        ? { label: 'l5r5e.weapons.deadliness', value: tooltipData.deadliness }
        : null

      return [range, damage, deadliness].filter(Boolean)
    }

    #getGripMod(tooltipData) {
      const grip1 = tooltipData.grip1 && tooltipData.grip1 !== 'N/A'
        ? { label: 'l5r5e.weapons.1hand', value: tooltipData.grip1 }
        : null
      const grip2 = tooltipData.grip2 && tooltipData.grip2 !== 'N/A'
        ? { label: 'l5r5e.weapons.2hand', value: tooltipData.grip2 }
        : null
      return [grip1, grip2].filter(Boolean)
    }

    #getArmorStats(tooltipData) {
      const physical = tooltipData?.physical && tooltipData?.physical > 0
        ? { label: 'l5r5e.armors.physical', value: tooltipData?.physical }
        : null
      const supernatural = tooltipData?.supernatural && tooltipData?.supernatural > 0
        ? { label: 'l5r5e.armors.supernatural', value: tooltipData?.supernatural }
        : null
      return [physical, supernatural].filter(Boolean)
    }

    #getItemPatterns(patterns) {
      const entries = this.#normalisePropertyEntries(patterns)
      if (!entries.length) return null

      const definition = ITEM_TAGS.pattern ?? ITEM_TAGS.default
      const icon = definition?.icon ?? ITEM_TAGS.default?.icon
      const cssClass = definition?.class ?? ITEM_TAGS.default?.class

      const tags = entries
        .map(entry => {
          if (!entry) return null
          const data = (typeof entry === 'object') ? entry : { id: entry }
          const id = this.#normaliseId(data?.id ?? data?.key ?? data?.slug ?? data?.name)
          if (!id) return null

          const isActive = (data?.active ?? data?.enabled ?? data?.value ?? true) !== false
          if (!isActive) return null

          const labelKey = ITEM_PATTERN[id]
          const fallback = data?.label ?? data?.name ?? this.#formatLabel(id)

          if (!labelKey && !fallback) return null

          return {
            label: labelKey ?? fallback,
            localized: !labelKey && Boolean(fallback),
            fallback,
            icon,
            class: cssClass
          }
        })
        .filter(Boolean)

      return tags.length ? tags : null
    }

    #getItemTags(tags) {
      const entries = this.#normalisePropertyEntries(tags)
      if (!entries.length) return null

      const tagEntries = entries
        .map(entry => {
          if (!entry) return null
          const data = (typeof entry === 'object') ? entry : { id: entry }
          const id = this.#normaliseId(data?.id ?? data?.key ?? data?.slug ?? data?.type ?? data?.name)
          if (!id) return null

          const isActive = (data?.active ?? data?.enabled ?? data?.value ?? true) !== false
          if (!isActive) return null

          const definition = ITEM_TAGS[id] ?? ITEM_TAGS.default
          const labelKey = definition?.label ?? (id ? `tokenActionHud.l5r5e.tags.${id}` : null)
          const fallback = data?.label ?? data?.name ?? this.#formatLabel(id)
          const rawValue = (data?.amount ?? data?.rating ?? data?.value)
          const value = (typeof rawValue === 'number' || typeof rawValue === 'string') ? rawValue : undefined

          if (!labelKey && !fallback) return null

          return {
            label: labelKey ?? fallback,
            localized: !labelKey && Boolean(fallback),
            fallback,
            value,
            icon: definition?.icon ?? ITEM_TAGS.default?.icon,
            class: definition?.class ?? ITEM_TAGS.default?.class
          }
        })
        .filter(Boolean)

      return tagEntries.length ? tagEntries : null
    }

    #getItemBonuses(bonuses) {
      const entries = this.#normalisePropertyEntries(bonuses)
      if (!entries.length) return null

      const defaultDefinition = ITEM_TAGS.bonus ?? ITEM_TAGS.default

      const tags = entries
        .map(entry => {
          if (!entry) return null
          const data = (typeof entry === 'object') ? entry : { id: entry }
          const id = this.#normaliseId(data?.id ?? data?.key ?? data?.slug ?? data?.type ?? data?.name)
          if (!id) return null

          const isActive = (data?.active ?? data?.enabled ?? true) !== false
          if (!isActive) return null

          const definition = ITEM_BONUS[id] ?? defaultDefinition
          const labelKey = definition?.label ?? (id ? `tokenActionHud.l5r5e.bonuses.${id}` : null)
          const fallback = data?.label ?? data?.name ?? this.#formatLabel(id)
          const rawValue = data?.value ?? data?.amount ?? data?.bonus ?? data?.rating
          const value = (typeof rawValue === 'number' || typeof rawValue === 'string') ? rawValue : undefined

          if (!labelKey && !fallback && value === undefined) return null

          return {
            label: labelKey ?? fallback,
            localized: !labelKey && Boolean(fallback),
            fallback,
            value,
            icon: definition?.icon ?? defaultDefinition?.icon,
            class: definition?.class ?? defaultDefinition?.class
          }
        })
        .filter(Boolean)

      return tags.length ? tags : null
    }

    #renderTagCollection(tags) {
      if (!tags || tags.length === 0) return ''

      const html = tags
        .map(tag => this.#renderTag(tag))
        .filter(Boolean)
        .join('')

      if (!html) return ''

      return `<div class="tah-tags">${html}</div>`
    }

    #renderTag(tag) {
      if (!tag) return ''

      const classList = ['tah-tag']
      if (tag.class) classList.push(tag.class)
      const className = classList.filter(Boolean).join(' ')

      const icon = tag.icon ? `<i class="${tag.icon}" aria-hidden="true"></i>` : ''

      if (tag.text) {
        return `<span class="${className}">${icon}${icon ? `<span class="tah-tag-text">${tag.text}</span>` : tag.text}</span>`
      }

      const labelKey = tag.label ?? ''
      let label = ''
      if (tag.localized) {
        label = labelKey
      } else if (labelKey) {
        label = api.Utils.i18n(labelKey)
        if (tag.fallback && label === labelKey) {
          label = tag.fallback
        }
      }

      if (!label) label = tag.fallback ?? ''
      if (!label) return ''

      const hasValue = tag.value !== undefined && tag.value !== null && tag.value !== ''
      const text = hasValue ? `${label}: ${tag.value}` : label
      const title = tag.title ? ` title="${tag.title}"` : ''
      const content = icon ? `${icon}<span class="tah-tag-text">${text}</span>` : text

      return `<span class="${className}"${title}>${content}</span>`
    }

    #normalisePropertyEntries(property) {
      if (!property) return []
      if (Array.isArray(property)) return property.filter(p => p !== null && p !== undefined)
      if (property instanceof Map) {
        return Array.from(property.entries()).map(([id, value]) => {
          if (typeof value === 'object' && value !== null) {
            return { id, ...value }
          }
          return { id, value }
        })
      }
      if (property instanceof Set) return [...property]
      if (typeof property === 'object') {
        return Object.entries(property).map(([id, value]) => {
          if (typeof value === 'object' && value !== null) {
            return { id, ...value }
          }
          return { id, value }
        })
      }
      return [property]
    }

    #normaliseId(id) {
      if (id === null || id === undefined) return ''
      const value = (typeof id === 'string') ? id : String(id)
      return value
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[A-Z]/g, match => `_${match.toLowerCase()}`)
        .replace(/[-]+/g, '_')
        .replace(/__+/g, '_')
        .replace(/^_+|_+$/g, '')
    }

    #formatLabel(label) {
      if (!label || typeof label !== 'string') return ''
      return label
        .replace(/[-_]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, match => match.toUpperCase())
    }
  
  }
}
