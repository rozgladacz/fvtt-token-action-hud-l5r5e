// System Module Imports
import { ACTION_TYPE, ITEM_QUALITIES, ITEM_TYPE } from './constants.js'
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
                    'equipped',
                    'consumables',
                    'containers',
                    'equipment',
                    'loot',
                    'tools',
                    'weapons',
                    'unequipped'
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
                this.#buildInventory()
            ])
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

            const actionTypeId = 'item'
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
                        if (type === 'container') {
                            if (!inventoryMap.has('containers')) inventoryMap.set('containers', new Map())
                            inventoryMap.get('containers').set(key, value)
                        }
                        if (type === 'equipment') {
                            if (!inventoryMap.has('equipment')) inventoryMap.set('equipment', new Map())
                            inventoryMap.get('equipment').set(key, value)
                        }
                        if (type === 'loot') {
                            if (!inventoryMap.has('loot')) inventoryMap.set('loot', new Map())
                            inventoryMap.get('loot').set(key, value)
                        }
                        if (type === 'tool') {
                            if (!inventoryMap.has('tools')) inventoryMap.set('tools', new Map())
                            inventoryMap.get('tools').set(key, value)
                        }
                        if (type === 'weapon') {
                            if (!inventoryMap.has('weapons')) inventoryMap.set('weapons', new Map())
                            inventoryMap.get('weapons').set(key, value)
                        }
                    }
                }
            }

            // Create group name mappings
            const groupNameMappings = {
                equipped: 'Equipped',
                unequipped: 'Unequipped',
                consumables: 'Consumables',
                containers: 'Containers',
                equipment: 'Equipment',
                loot: 'Loot',
                tools: 'Tools',
                weapons: 'Weapons'
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
                await this.#buildActions(inventory, groupData)

                // Build activations
                if (this.activationgroupIds) {
                    //await this.#buildActivations(inventory, groupData)
                }
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
            const excludedTypes = ['consumable', 'spell', 'feat']
            if (this.showUnequippedItems && !excludedTypes.includes(type)) return true
            const equipped = item.system.equipped
            if (equipped && type !== 'consumable') return true
            return false
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
            if (
                entity?.system?.recharge &&
                !entity?.system?.recharge?.charged &&
                entity?.system?.recharge?.value
            ) {
                name += ' Recharge'
            }
            const actionTypeName = `${coreModule.api.Utils.i18n(ACTION_TYPE[actionType])}: ` ?? ''
            const listName = `${actionTypeName}${name}`
            let cssClass = ''
            if (Object.hasOwn(entity, 'disabled')) {
                const active = (!entity.disabled) ? ' active' : ''
                cssClass = `toggle${active}`
            }
            const encodedValue = [actionType, id].join(this.delimiter)
            const img = coreModule.api.Utils.getImage(entity)
            const icon1 = this.#getActivationTypeIcon(entity?.system?.activation?.type)
            let icon2 = null
            let info = null
            if (entity.type === 'spell') {
                // icon2 = this.#getPreparedIcon(entity)
                // if (this.displaySpellInfo) info = this.#getSpellInfo(entity)
            } else {
                info = this.#getItemInfo(entity)
            }
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
            console.log(entity)
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

            console.log(propertiesHtml)

            return `<div>${nameHtml}${headerTags}${description}${propertiesHtml}</div>`
        }
    }
})
