// System Module Imports
import { ACTION_TYPE } from './constants.js'
import { Utils } from './utils.js'

export let ActionHandler = null

Hooks.once('tokenActionHudCoreApiReady', async (coreModule) => {
  /**
   * Extends Token Action HUD Core's ActionHandler class and builds system-defined actions for the HUD
   */
  ActionHandler = class ActionHandler extends coreModule.api.ActionHandler {
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

      this.actorType = this.actor?.type

      // Settings
      this.displayUnequipped = Utils.getSetting('displayUnequipped')

      // Set items variable
      if (this.actor) {
        let items = this.actor.items
        items = coreModule.api.Utils.sortItemsByName(items)
        this.items = items
      }

      if (this.actorType === 'character' || this.actorType === 'npc') {
        this.inventorygroupIds = [
          'armor',
          'equipment',
          'weapons'
        ]

        this.skillGroupIds = [
          'artisan',
          'martial',
          'scholar',
          'social',
          'trade'
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
        const isReadiedItem = this.#isReadiedItem(value)
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
        equipment: coreModule.api.Utils.i18n('l5r5e.items.title'),
        armor: coreModule.api.Utils.i18n('l5r5e.armors.title'),
        weapons: coreModule.api.Utils.i18n('l5r5e.weapons.title')
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
      const rings = this.actor.system.rings

      // Exit if there are no rings
      if (rings.length === 0) return

      // Create group data
      const groupData = {
        id: 'rings',
        name: `${coreModule.api.Utils.i18n(`l5r5e.rings.title`)}` ?? 'rings',
        type: 'system'
      }

      // Get actions
      const actions = Object.entries(rings)
        .map((ring) => {
          try {
            const id = ring[0]
            const encodedValue = [actionType, id].join(this.delimiter)
            const name = `${coreModule.api.Utils.i18n(`l5r5e.rings.${id}`)}: ${ring[1]}` ?? ''
            const value = ring[1]
            const actionTypeName = `${coreModule.api.Utils.i18n('l5r5e.rings.label')}:` ?? ''
            const listName = `${actionTypeName}${name}`
            const info1 = (this.actor) ? { text: (value || value === 0) ? `${value}` : '' } : ''
            const img = coreModule.api.Utils.getImage(`systems/l5r5e/assets/icons/rings/${id}.svg`)

            // BUGS
            const info2 = 'info2'
            const tooltip = 'tooltip info'

            return {
              id,
              name,
              img,
              encodedValue,
              info2,
              tooltip,
              listName
            }
          } catch (error) {
            coreModule.api.Logger.error(ring)
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
      if (this.actorType !== 'character') return

      const actionType = 'skill'

      for (const groupId of this.skillGroupIds) {
        // Get skills
        const skills = this.actor.system.skills[groupId]

        // Exit if there are no skills
        if (skills.length === 0) return

        // Create group data
        const groupData = {
          id: groupId,
          name: `${coreModule.api.Utils.i18n(`l5r5e.skills.${groupId}.title`)}` ?? groupId,
          type: 'system'
        }

        // Get actions
        const actions = Object.entries(skills)
          .map((skill) => {
            try {
              const id = skill[0]
              const encodedValue = [actionType, id].join(this.delimiter)
              const name = `${coreModule.api.Utils.i18n(`l5r5e.skills.${groupId}.${id}`)}: ` ?? ''
              const actionTypeName = `${coreModule.api.Utils.i18n('l5r5e.skills.label')}: ` ?? ''
              const listName = `${actionTypeName}${name}`
              const value = skill[1]
              const info1 = (this.actor) ? { text: (value || value === 0) ? `${value}` : '' } : ''

              return {
                id,
                name,
                encodedValue,
                info1,
                listName
              }
            } catch (error) {
              coreModule.api.Logger.error(skill)
              return null
            }
          })
          .filter((skill) => !!skill)

        // Add actions to HUD
        this.addActions(actions, groupData)
      }
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
        await this.#buildActions(techniques, groupData)
      }
    }

    /**
    * Get actors
    * @private
    * @returns {object}
    */
    #getActors() {
      const allowedTypes = ['character', 'npc']
      const tokens = coreModule.api.Utils.getControlledTokens()
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
      const tokens = coreModule.api.Utils.getControlledTokens()
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
      if (this.showUnequippedItems && !excludedTypes.includes(type)) return true
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
    #isReadiedItem(item) {
      const type = item.type
      const excludedTypes = ['armor', 'item', 'technique', 'peculiarity']
      if (excludedTypes.includes(type)) return false
      const readied = item.system.readied
      if (readied) return true
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

      const actionTypeName = `${coreModule.api.Utils.i18n(ACTION_TYPE[actionType])}: ` ?? ''
      const listName = `${actionTypeName}${name}`

      let cssClass = ''

      if (Object.hasOwn(entity.system, 'readied')) {
        const active = (entity.system.readied) ? ' active' : ''
        cssClass = `toggle${active}`
      }

      const encodedValue = [actionType, id].join(this.delimiter)
      const img = coreModule.api.Utils.getImage(entity)
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
      const rarity = entity?.system?.rarity ?? null
      const traits = (entity?.type === 'weapon') ? this.#getItemQualities(entity?.system?.properties) : null
      return { name, description, modifiers, properties, rarity, traits }
    }

    #getItemQualities(weaponProperties) {
      if (!weaponProperties) return null
      return Object.entries(weaponProperties)
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

      const name = coreModule.api.Utils.i18n(tooltipData.name)

      if (this.tooltipsSetting === 'nameOnly') return name

      const nameHtml = `<h3>${name}</h3>`

      const description = tooltipData?.descriptionLocalised ??
        await TextEditor.enrichHTML(coreModule.api.Utils.i18n(tooltipData?.description ?? ''), { async: true })

      const rarityHtml = tooltipData?.rarity
        ? `<span class="tah-tag legendary">${tooltipData.rarity}</span>`
        : ''

      // const propertiesHtml = tooltipData?.properties
      //     ? `<div class="tah-properties">${tooltipData.properties.map(property => `<span class="tah-property">${coreModule.api.Utils.i18n(property)}</span>`).join('')}</div>`
      //     : ''

      const propertiesHtml = tooltipData?.traits
        ? `<div class="tah-properties">${tooltipData.traits.map(trait => `<span class="tah-property">${trait}</span>`).join('')}</div>`
        : ''

      // const traitsHtml = tooltipData?.traits
      //     ? tooltipData.traits.map(trait => `<span class="tah-tag">${trait}</span>`).join('')
      //     : ''

      // const traitsHtml = tooltipData?.traits
      //     ? tooltipData.traits.map(trait => `<span class="tah-tag">${coreModule.api.Utils.i18n(trait.label ?? trait)}</span>`).join('')
      //     : ''

      // const traits2Html = tooltipData?.traits2
      //     ? tooltipData.traits2.map(trait => `<span class="tah-tag tah-tag-secondary">${coreModule.api.Utils.i18n(trait.label ?? trait)}</span>`).join('')
      //     : ''

      // const traits2Html = tooltipData?.traits
      //     ? tooltipData.traits.map(trait => `<span class="tah-tag tah-tag-secondary">${trait}</span>`).join('')
      //     : ''                

      // const traitsAltHtml = tooltipData?.traitsAlt
      //     ? tooltipData.traitsAlt.map(trait => `<span class="tah-tag tah-tag-alt">${coreModule.api.Utils.i18n(trait.label)}</span>`).join('')
      //     : ''

      // const traitsAltHtml = tooltipData?.traits
      //     ? tooltipData.traits.map(trait => `<span class="tah-tag tah-tag-alt">${trait}</span>`).join('')
      //     : ''                

      // const modifiersHtml = tooltipData?.modifiers
      //     ? `<div class="tah-tags">${tooltipData.modifiers.filter(modifier => modifier.enabled).map(modifier => {
      //         const label = coreModule.api.Utils.i18n(modifier.label)
      //         const sign = modifier.modifier >= 0 ? '+' : ''
      //         const mod = `${sign}${modifier.modifier ?? ''}`
      //         return `<span class="tah-tag tah-tag-transparent">${label} ${mod}</span>`
      //     }).join('')}</div>`
      //     : ''

      const traitsHtml = `<span class="tah-tag">traitsHtml</span>`
      const traits2Html = `<span class="tah-tag tah-tag-secondary">traits2Html</span>`
      const traitsAltHtml = `<span class="tah-tag tah-tag-alt">traitsAltHtml</span>`
      const modifiersHtml = `<div class="tah-tags"><span class="tah-tag tah-tag-transparent">modifiersHtml</span></div>`

      const tagsJoined = [rarityHtml, traitsHtml, traits2Html, traitsAltHtml].join('')

      const tagsHtml = (tagsJoined) ? `<div class="tah-tags">${tagsJoined}</div>` : ''

      const headerTags = (tagsHtml || modifiersHtml) ? `<div class="tah-tags-wrapper">${tagsHtml}${modifiersHtml}</div>` : ''

      if (!description && !tagsHtml && !modifiersHtml) return name

      return `<div>${nameHtml}${headerTags}${description}${propertiesHtml}</div>`
    }
  }
})
