export function createRollHandlerClass(api) {
  return class RollHandler extends api.RollHandler {
    /**
     * Handle action click
     * Called by Token Action HUD Core when an action is left or right-clicked
     * @override
     * @param {object} event        The event
     * @param {string} encodedValue The encoded value
     */
    async handleActionClick(event, encodedValue) {
      const [actionTypeId, actionId] = encodedValue.split('|')

      const renderable = ['item', 'weapons', 'technique', 'armor']

      const rightClickAction = ['ring']

      if (renderable.includes(actionTypeId) && this.isRenderItem()) {
        return this.doRenderItem(this.actor, actionId)
      }

      if (rightClickAction.includes(actionTypeId) && this.isRenderItem()) {
        if (actionTypeId === 'ring') {
          await this.#handleStanceChangeAction(event, this.actor, actionId)
          return
        }
      }

      const knownCharacters = ['character']

      // If single actor is selected
      if (this.actor) {
        await this.#handleAction(event, this.actor, this.token, actionTypeId, actionId)
        return
      }

      const controlledTokens = canvas.tokens.controlled
        .filter((token) => knownCharacters.includes(token.actor?.type))

      // If multiple actors are selected
      for (const token of controlledTokens) {
        const actor = token.actor
        await this.#handleAction(event, actor, token, actionTypeId, actionId)
      }
    }

    /**
     * Handle action hover
     * Called by Token Action HUD Core when an action is hovered on or off
     * @override
     * @param {object} event        The event
     * @param {string} encodedValue The encoded value
     */
    async handleActionHover(event, encodedValue) { }

    /**
     * Handle group click
     * Called by Token Action HUD Core when a group is right-clicked while the HUD is locked
     * @override
     * @param {object} event The event
     * @param {object} group The group
     */
    async handleGroupClick(event, group) { }

    /**
     * Handle action
     * @private
     * @param {object} event        The event
     * @param {object} actor        The actor
     * @param {object} token        The token
     * @param {string} actionTypeId The action type id
     * @param {string} actionId     The actionId
     */
    async #handleAction(event, actor, token, actionTypeId, actionId) {
      switch (actionTypeId) {
        case 'weapons':
          this.#handleWeaponAction(event, actor, actionId)
          break
        case 'ring':
          this.#handleRingAction(event, actor, actionId)
          break
        case 'skill':
          this.#handleSkillAction(event, actor, actionId)
          break
        case 'technique':
          this.#handleTechniqueAction(event, actor, actionId)
          break
        case 'armor':
          await this.#handleItemAction(event, actor, actionId)
          break
        case 'equipment':
          await this.#handleItemAction(event, actor, actionId)
          break
        case 'utility':
          this.#handleUtilityAction(token, actionId)
          break
      }
    }

    /**
     * Handle item action
     * @private
     * @param {object} event    The event
     * @param {object} actor    The actor
     * @param {string} actionId The action id
     */
    async #handleItemAction(event, actor, actionId) {
      const item = actor.items.get(actionId)
      if (!item) return

      const l5r5e = game.l5r5e ?? {}
      const helpers = l5r5e.HelpersL5r5e ?? {}
      const chat = l5r5e.Chat ?? l5r5e.chat ?? {}

      const chatHandlers = [
        helpers.sendItemToChat,
        helpers.sendToChat,
        chat.sendItemToChat,
        chat.displayItem,
        item?.sendToChat?.bind(item),
        item?.displayCard?.bind(item),
        item?.toMessage?.bind(item)
      ].filter((handler) => typeof handler === 'function')

      if (chatHandlers.length > 0) {
        for (const handler of chatHandlers) {
          try {
            await handler(item)
            return
          } catch (error) {
            continue
          }
        }
      }

      if (typeof ChatMessage?.create === 'function') {
        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor }),
          content: game.i18n.format('tokenActionHud.l5r5e.itemChatFallback', { item: item.name })
        })
      } else {
        ui.notifications?.warn(game.i18n.format('tokenActionHud.l5r5e.itemChatFallback', { item: item.name }))
      }
    }

    /**
     * Handle stance change action
     * @private
     * @param {object} event    The event
     * @param {object} actor    The actor
     * @param {string} actionId The action id
     */
    async #handleStanceChangeAction(_event, actor, actionId) {
      //console.log(game.l5r5e)
      // if (actor.system.stance !== actionId) {
      //   await new game.l5r5e.ActorL5r5e(actor).update({
      //     stance: actionId
      //   })
      // }
    }

    /**
     * Handle weapon action
     * @private
     * @param {object} event    The event
     * @param {object} actor    The actor
     * @param {string} actionId The action id
     */
    #handleWeaponAction(_event, actor, actionId) {
      const weapon = actor.items.get(actionId)
      if (!weapon) return

      const skillIds = this.#extractSkillIds(weapon?.system?.skill)
      const ringId = this.#extractRingId(weapon?.system?.ring)

      const options = {
        item: weapon,
        itemId: weapon.id,
        sourceId: weapon.id,
        type: weapon.type,
        title: weapon.name,
        difficulty: weapon?.system?.tn ?? weapon?.system?.difficulty ?? null,
        context: 'token-action-hud'
      }

      if (skillIds.length > 0) {
        options.skill = skillIds[0]
        options.skillId = skillIds[0]
        options.skills = skillIds
        options.skillsList = skillIds
      }

      if (ringId) {
        options.ring = ringId
        options.ringId = ringId
      }

      this.#openDicePicker(actor, options)
    }

    /**
     * Handle ring action
     * @private
     * @param {object} event    The event
     * @param {object} actor    The actor
     * @param {string} actionId The action id
     */
    #handleRingAction(_event, actor, actionId) {
      const options = {
        ring: actionId,
        ringId: actionId,
        context: 'token-action-hud'
      }

      this.#openDicePicker(actor, options)
    }

    /**
     * Handle skill action
     * @private
     * @param {object} event    The event
     * @param {object} actor    The actor
     * @param {string} actionId The action id
     */
    #handleSkillAction(_event, actor, actionId) {
      const options = {
        skill: actionId,
        skillId: actionId,
        context: 'token-action-hud'
      }

      this.#openDicePicker(actor, options)
    }

    /**
     * Handle technique action
     * @private
     * @param {object} event    The event
     * @param {object} actor    The actor
     * @param {string} actionId The action id
     */
    #handleTechniqueAction(_event, actor, actionId) {
      const technique = actor.items.get(actionId)

      if (!technique || technique.type !== "technique" || !technique.system.skill) {
        return;
      }

      const skillIds = this.#extractSkillIds(technique?.system?.skill)
      const ringId = this.#extractRingId(technique?.system?.ring)
      const difficulty = technique?.system?.difficulty ?? technique?.system?.tn ?? null

      const options = {
        item: technique,
        itemId: technique.id,
        sourceId: technique.id,
        type: technique.type,
        title: technique.name,
        difficulty,
        context: 'token-action-hud'
      }

      if (skillIds.length > 0) {
        options.skill = skillIds[0]
        options.skillId = skillIds[0]
        options.skills = skillIds
        options.skillsList = skillIds
      }

      if (ringId) {
        options.ring = ringId
        options.ringId = ringId
      }

      this.#openDicePicker(actor, options)
    }

    #openDicePicker(actor, payload = {}) {
      const Dialog = game?.l5r5e?.DicePickerDialog
      if (!Dialog) return

      const options = { ...payload }

      if (actor && !options.actor) options.actor = actor
      if (actor?.id && !options.actorId) options.actorId = actor.id

      const normalizedSkills = this.#dedupeList([
        options.skill,
        options.skillId,
        ...(Array.isArray(options.skills) ? options.skills : []),
        ...(Array.isArray(options.skillsList) ? options.skillsList : [])
      ])

      if (normalizedSkills.length > 0) {
        options.skill = normalizedSkills[0]
        options.skillId = normalizedSkills[0]
        options.skills = normalizedSkills
        options.skillsList = normalizedSkills
      }

      const ring = this.#extractRingId(options.ring ?? options.ringId ?? options.ringKey)
      if (ring) {
        options.ring = ring
        options.ringId = ring
        options.ringKey = ring
      }

      if (!options.context) options.context = 'token-action-hud'

      const expectedArgs = typeof Dialog.length === 'number' ? Dialog.length : 1
      const args = []
      if (expectedArgs > 1) args.push(actor)
      args.push(options)

      const dialog = new Dialog(...args)
      if (typeof dialog.render === 'function') {
        dialog.render(true)
      }
    }

    #extractRingId(data) {
      if (!data) return undefined
      if (typeof data === 'string') return data
      if (Array.isArray(data)) {
        for (const value of data) {
          const ring = this.#extractRingId(value)
          if (ring) return ring
        }
        return undefined
      }
      if (typeof data === 'object') {
        const keys = ['ring', 'id', 'key', 'value', 'default', 'defaultRing']
        for (const key of keys) {
          if (data[key]) {
            const ring = this.#extractRingId(data[key])
            if (ring) return ring
          }
        }
      }
      return undefined
    }

    #extractSkillIds(data) {
      if (!data) return []
      if (Array.isArray(data)) {
        return this.#dedupeList(data.flatMap((value) => this.#extractSkillIds(value)))
      }
      if (typeof data === 'string') return [data]
      if (typeof data === 'object') {
        const keys = ['id', 'ids', 'skill', 'skills', 'value', 'values', 'default', 'primary']
        for (const key of keys) {
          if (data[key]) {
            return this.#extractSkillIds(data[key])
          }
        }
        return this.#dedupeList(Object.values(data).flatMap((value) => this.#extractSkillIds(value)))
      }
      return []
    }

    #dedupeList(list) {
      return [...new Set(list.filter((value) => typeof value === 'string' && value))]
    }

    /**
     * Handle utility action
     * @private
     * @param {object} token    The token
     * @param {string} actionId The action id
     */
    async #handleUtilityAction(token, actionId) {
      switch (actionId) {
        case 'endTurn':
          if (game.combat?.current?.tokenId === token.id) {
            await game.combat?.nextTurn()
          }
          break
      }
    }
  }
}
