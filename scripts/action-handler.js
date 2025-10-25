import { ACTION_TYPE } from './constants.js'
import { Utils } from './utils.js'

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
      }

      if (this.actorType === 'character' || this.actorType === 'npc') {
        this.inventorygroupIds = [
          'armor',
          'equipment',
          'weapons'
        ]

        this.techniqueGroupIds = [
          'kata',
          'kiho',
          'inversion',
          'invocation',
          'ritual',
          'shuji',
          'maho',
          'ninjutsu',
          'mantra',
          'school-ability',
          'mastery-ability',
          'title-ability'
        ]

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
      this.#buildSkills()
    }

    /**
     * Build multiple token actions
     * @private
     * @returns {object}
     */
    #buildMultipleTokenActions() {
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

      // Create group name mappings
      const groupNameMappings = {
        equipment: api.Utils.i18n('l5r5e.items.title'),
        armor: api.Utils.i18n('l5r5e.armors.title'),
        weapons: api.Utils.i18n('l5r5e.weapons.title')
      }

      // Loop through inventory subcateogry ids
      for (const groupId of this.inventorygroupIds) {
        if (!inventoryMap.has(groupId)) continue

        // Create group data
        const groupData = {
          id: groupId,
          name: groupNameMappings[groupId],
          type: 'system'
        }

        const inventory = inventoryMap.get(groupId)

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
      const rings = game.l5r5e.HelpersL5r5e.getRingsList(this.actor)

      // Exit if there are no rings
      if (rings.length === 0) return

      // Get Stance
      const stance = this.actor.system.stance

      // Create group data
      const groupData = {
        id: 'rings',
        name: `${api.Utils.i18n(`l5r5e.rings.title`)}` ?? 'rings',
        type: 'system'
      }

      // Get actions
      const actions = Object.values(rings)
        .map((ring) => {
          try {
            const id = ring.id
            const encodedValue = [actionType, id].join(this.delimiter)
            const name = `${api.Utils.i18n(`l5r5e.rings.${id}`)}: ${ring.value}` ?? ''
            const actionTypeName = `${ring.label}:` ?? ''
            const listName = `${actionTypeName}${name}`
            const img = api.Utils.getImage(`systems/l5r5e/assets/icons/rings/${id}.svg`)

            const tooltip = `${api.Utils.i18n(`l5r5e.conflict.stances.${id}tip`)}`

            let cssClass = ''
            if (id === stance) {
              cssClass = `toggle active`
            }

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
            const localizedSkill = this.#getSkillLabel(catId, skillId)
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
        ? helpers.getNpcSkillsList?.(this.actor)
          ?? helpers.getNpcSkillsList?.()
          ?? helpers.getCategoriesSkillsList?.(this.actor)
          ?? helpers.getCategoriesSkillsList?.()
          ?? this.actor?.system?.skills
          ?? this.actor?.system?.npcSkills
        : helpers.getCategoriesSkillsList?.(this.actor)
          ?? helpers.getCategoriesSkillsList?.()
          ?? this.actor?.system?.skills

      const entries = this.#normalizeCategoryEntries(baseSource)

      return entries.map(([categoryId, skills]) => {
        const skillIds = this.#normalizeSkillIds(skills)
        return {
          id: categoryId,
          label: this.#getSkillCategoryLabel(categoryId),
          skills: skillIds
        }
      }).filter((category) => category.skills.length > 0)
    }

    #normalizeCategoryEntries(source) {
      if (!source) return []
      if (source instanceof Map) return [...source.entries()]
      if (Array.isArray(source)) {
        return source.map((entry, index) => Array.isArray(entry) ? entry : [index, entry])
      }
      if (typeof source === 'object') return Object.entries(source)
      return []
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
        return this.#dedupeIds(Object.values(skills).flatMap((entry) => this.#normalizeSkillIds(entry)))
      }
      return []
    }

    #dedupeIds(list) {
      return [...new Set(list.filter((value) => typeof value === 'string' && value))]
    }

    #getSkillCategoryLabel(categoryId) {
      const keys = [
        `l5r5e.npc.skills.${categoryId}.title`,
        `l5r5e.skills.${categoryId}.title`,
        `l5r5e.skills.${categoryId}`,
        categoryId
      ]
      return this.#localizeFirst(keys)
    }

    #getSkillLabel(categoryId, skillId) {
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
          const technique_type = String(value.system.technique_type).replace('_', '-')

          if (!techniqueMap.has(technique_type)) techniqueMap.set(technique_type, new Map())
          techniqueMap.get(technique_type).set(key, value)
        }
      }

      // Loop through inventory subcateogry ids
      for (const groupId of this.techniqueGroupIds) {
        if (!techniqueMap.has(groupId)) continue

        // Create group data
        const groupData = {
          id: groupId,
          type: 'system'
        }

        const techniques = techniqueMap.get(groupId)

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

      const techniqueTypes = ['kata', 'kiho', 'inversion', 'invocation', 'ritual', 'shuji', 'maho', 'ninjutsu', 'mantra', 'school_ability', 'mastery_ability', 'title_ability']
      if (!techniqueTypes.includes(item.system.technique_type)) return false

      return true
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
      const id = entity.id ?? entity._id
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

      const description = (typeof entity?.system?.description === 'string') ? entity?.system?.description : entity?.system?.description?.value ?? ''
      const modifiers = entity?.modifiers ?? null
      const properties = [
        ...entity.system?.chatProperties ?? [],
        ...entity.system?.equippableItemCardProperties ?? [],
        ...entity.system?.activatedEffectCardProperties ?? []
      ].filter(p => p)
      const type = entity?.type
      const rarity = entity?.system?.rarity ?? null
      const traits = this.#getItemQualities(entity?.system?.properties)
      const range = (entity?.type === 'weapon') ? entity?.system?.range : null
      const damage = (entity?.type === 'weapon') ? entity?.system?.damage : null
      const deadliness = (entity?.type === 'weapon') ? entity?.system?.deadliness : null
      const grip1 = (entity?.type === 'weapon') ? entity?.system?.grip_1 : null
      const grip2 = (entity?.type === 'weapon') ? entity?.system?.grip_2 : null
      const physical = (entity?.type === 'armor') ? entity?.system?.armor?.physical : null
      const supernatural = (entity?.type === 'armor') ? entity?.system?.armor?.supernatural : null
      return { name, type, description, modifiers, properties, rarity, traits, range, damage, deadliness, grip1, grip2, physical, supernatural }
    }

    #getItemQualities(itemProperties) {
      if (!itemProperties) return null
      return Object.entries(itemProperties)
        .map(([_id, quality]) => {
          return quality.name
        })
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

      const rarityHtml = tooltipData?.rarity
        ? `<div class="tah-tags-wrapper"><span class="tah-tag ${this.#getItemRarity(tooltipData.rarity)}">Rarity: ${tooltipData.rarity}</span></div>`
        : ''

      const propertiesHtml = tooltipData?.traits
        ? `<div class="tah-properties">${tooltipData.traits.map(trait => `<span class="tah-property">${trait}</span>`).join('')}</div>`
        : ''

      const weaponStatsHtml = tooltipData.type === "weapon" ? this.#getWeaponStats(tooltipData) : ''
      const gripModHtml = tooltipData.type === "weapon" ? this.#getGripMod(tooltipData) : ''
      const armorStatsHtml = tooltipData.type === "armor" ? this.#getArmorStats(tooltipData) : ''

      const modifiersHtml = ''

      const tagsJoined = [rarityHtml, weaponStatsHtml, gripModHtml, armorStatsHtml].join('')

      const tagsHtml = (tagsJoined) ? `<div class="tah-tags">${tagsJoined}</div>` : ''

      const headerTags = (tagsHtml || modifiersHtml) ? `<div class="tah-tags-wrapper">${tagsHtml}${modifiersHtml}</div>` : ''

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
      const range = `<span class="tah-tag">${api.Utils.i18n(`l5r5e.weapons.range`)}: ${tooltipData.range}</span>`
      const damage = `<span class="tah-tag">${api.Utils.i18n(`l5r5e.weapons.damage`)}: ${tooltipData.damage}</span>`
      const deadliness = `<span class="tah-tag">${api.Utils.i18n(`l5r5e.weapons.deadliness`)}: ${tooltipData.deadliness}</span>`
      return [range, damage, deadliness].join('')
    }

    #getGripMod(tooltipData) {
      const grip1 = tooltipData.grip1 && tooltipData.grip1 !== 'N/A' ? `<span class="tah-tag">${api.Utils.i18n(`l5r5e.weapons.1hand`)}: ${tooltipData.grip1}</span>` : ''
      const grip2 = tooltipData.grip2 && tooltipData.grip2 !== 'N/A' ? `<span class="tah-tag">${api.Utils.i18n(`l5r5e.weapons.2hand`)}: ${tooltipData.grip2}</span>` : ''
      return [grip1, grip2].join('')
    }

    #getArmorStats(tooltipData) {
      const physical = tooltipData?.physical && tooltipData?.physical > 0 ? `<span class="tah-tag">${api.Utils.i18n(`l5r5e.armors.physical`)}: ${tooltipData?.physical}</span>` : ''
      const supernatural = tooltipData?.supernatural && tooltipData?.supernatural > 0 ? `<span class="tah-tag">${api.Utils.i18n(`l5r5e.armors.supernatural`)}: ${tooltipData?.supernatural}</span>` : ''
      return [physical, supernatural].join('')
    }
  
  }
}
