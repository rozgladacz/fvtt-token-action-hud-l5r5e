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
      const tokens = this.tokens ?? []
      if (tokens.length === 0) return

      const actors = this.actors ?? []

      // Utility actions available for all controlled tokens
      const utilityActions = []

      const endTurnLabel = api.Utils.i18n?.('tokenActionHud.utility.endTurn')
        ?? game.i18n.localize?.('tokenActionHud.utility.endTurn')
        ?? 'End Turn'

      utilityActions.push({
        id: 'endTurn',
        name: endTurnLabel,
        encodedValue: ['utility', 'endTurn'].join(this.delimiter),
        listName: `${api.Utils.i18n('tokenActionHud.utility') ?? 'Utility'}: ${endTurnLabel}`
      })

      if (utilityActions.length > 0) {
        const groupData = {
          id: 'utility',
          name: api.Utils.i18n('tokenActionHud.utility') ?? 'Utility',
          type: 'system'
        }

        this.addActions(utilityActions, groupData)
      }

      if (actors.length === 0) return

      const primaryActor = actors.find((actor) => !!actor)
      if (!primaryActor) return

      const rings = game.l5r5e?.HelpersL5r5e?.getRingsList(primaryActor) ?? []
      if (rings.length === 0) return

      const stanceSet = new Set(actors
        .map((actor) => actor?.system?.stance)
        .filter((stance) => typeof stance === 'string'))

      const ringActions = rings
        .map((ring) => {
          try {
            const id = ring.id
            const encodedValue = ['ring', id].join(this.delimiter)
            const ringLabel = api.Utils.i18n(`l5r5e.rings.${id}`) ?? ring.label ?? id

            const actorValues = actors
              .map((actor) => actor?.system?.rings?.[id]?.value)
              .filter((value) => value !== undefined && value !== null)

            let name = ringLabel
            if (actorValues.length === actors.length && actorValues.length > 0) {
              const uniqueValues = [...new Set(actorValues)]
              if (uniqueValues.length === 1) {
                name = `${ringLabel}: ${uniqueValues[0]}`
              } else {
                name = `${ringLabel}: ${uniqueValues.join('/')}`
              }
            } else if (ring?.value !== undefined) {
              name = `${ringLabel}: ${ring.value}`
            }

            let cssClass = ''
            if (stanceSet.size === 1 && stanceSet.has(id)) {
              cssClass = 'toggle active'
            }

            const tooltip = api.Utils.i18n(`l5r5e.conflict.stances.${id}tip`) ?? ''

            const img = api.Utils.getImage(`systems/l5r5e/assets/icons/rings/${id}.svg`)

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
        name: `${api.Utils.i18n('l5r5e.rings.title')}` ?? 'rings',
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
      if (this.actorType !== 'character') return

      const actionType = 'skill'
      const categoriesSkillsList = game.l5r5e.HelpersL5r5e.getCategoriesSkillsList()

      for (const [catId, skills] of categoriesSkillsList) {
        try {
          // Create group data
          const groupData = {
            id: catId,
            name: `${api.Utils.i18n(`l5r5e.skills.${catId}.title`)}` ?? catId,
            type: 'system'
          }

          // Create actions list
          const actions = Object.entries(skills).map((skill) => {
            const id = skill[1]
            const encodedValue = [actionType, id].join(this.delimiter)
            const value = this.actor.system.skills[catId][id]
            const name = `${api.Utils.i18n(`l5r5e.skills.${catId}.${id}`)}: ${value}` ?? ''
            const actionTypeName = `${api.Utils.i18n('l5r5e.skills.label')}: ` ?? ''
            const listName = `${actionTypeName}${name}`

            return {
              id,
              name,
              encodedValue,
              listName
            }
          })

          // Add actions to HUD
          this.addActions(actions, groupData)

        } catch (error) {
          api.Logger.error(catId)
          return null
        }

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
