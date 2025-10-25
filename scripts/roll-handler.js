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

      const isRenderItem = typeof this.isRenderItem === 'function'
        ? this.isRenderItem(event)
        : false

      const isRightClick = isRenderItem
        || event?.type === 'contextmenu'
        || event?.button === 2
        || event?.data?.button === 2
        || event?.data?.isRightClick === true

      if (renderable.includes(actionTypeId) && isRenderItem) {
        return this.doRenderItem(this.actor, actionId)
      }

      if (rightClickAction.includes(actionTypeId) && isRightClick) {
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
          this.#handleWeaponAction(event, actor, token, actionId)
          break
        case 'ring':
          this.#handleRingAction(event, actor, token, actionId)
          break
        case 'skill':
          this.#handleSkillAction(event, actor, token, actionId)
          break
        case 'technique':
          this.#handleTechniqueAction(event, actor, token, actionId)
          break
        case 'armor':
          await this.#handleItemAction(event, actor, actionId, token)
          break
        case 'equipment':
          await this.#handleItemAction(event, actor, actionId, token)
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
    async #handleItemAction(event, actor, actionId, token) {
      const item = actor.items.get(actionId)
      if (!item) return

      const l5r5e = game.l5r5e ?? {}
      const helpers = l5r5e.HelpersL5r5e ?? {}
      const chat = l5r5e.Chat ?? l5r5e.chat ?? {}
      const chatApps = l5r5e.applications?.chat ?? l5r5e.apps?.chat ?? {}
      const chatMessageApi = l5r5e.ChatMessage ?? {}

      const speaker = typeof ChatMessage?.getSpeaker === 'function'
        ? ChatMessage.getSpeaker({ actor, token })
        : { actor: actor?.id, token: token?.id }

      const chatContext = {
        actor,
        token,
        speaker,
        item,
        source: 'token-action-hud'
      }

      const handlerEntries = [
        { fn: helpers.sendItemToChat, context: helpers },
        { fn: helpers.sendToChat, context: helpers },
        { fn: helpers.displayItem, context: helpers },
        { fn: chat.sendItemToChat, context: chat },
        { fn: chat.displayItem, context: chat },
        { fn: chat.createItemMessage, context: chat },
        { fn: chat.showItemCard, context: chat },
        { fn: chat.renderItemCard, context: chat },
        { fn: chatApps.sendItemToChat, context: chatApps },
        { fn: chatApps.displayItem, context: chatApps },
        { fn: chatApps.renderItemCard, context: chatApps },
        { fn: chatMessageApi.createItemMessage, context: chatMessageApi },
        { fn: chatMessageApi.sendItemToChat, context: chatMessageApi },
        { fn: l5r5e.ChatV2?.createItemMessage, context: l5r5e.ChatV2 },
        { fn: item?.sendToChat, context: item },
        { fn: item?.displayCard, context: item },
        { fn: item?.showItemCard, context: item },
        { fn: item?.toMessage, context: item }
      ].filter((entry) => typeof entry?.fn === 'function')

      for (const entry of handlerEntries) {
        try {
          const { fn, context } = entry
          const argCount = typeof fn.length === 'number' ? fn.length : 1
          let result

          if (context === item && fn === item?.toMessage) {
            const messageData = { speaker }
            result = await fn.call(context, messageData, { create: true })
          } else if (context === item) {
            if (argCount <= 0) {
              result = await fn.call(context)
            } else if (argCount === 1) {
              result = await fn.call(context, chatContext)
            } else {
              result = await fn.call(context, chatContext, { create: true })
            }
          } else {
            if (argCount <= 1) {
              result = await fn.call(context, item)
            } else if (argCount === 2) {
              result = await fn.call(context, item, chatContext)
            } else {
              result = await fn.call(context, item, chatContext, { actor, token })
            }
          }

          if (result !== false) {
            return
          }
        } catch (error) {
          continue
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
      const allowedTypes = ['character', 'npc']

      const availableStances = Object.keys(CONFIG.l5r5e?.conflict?.stances ?? {})
      if (availableStances.length > 0 && !availableStances.includes(actionId)) return

      const actors = actor
        ? [actor]
        : canvas.tokens.controlled
          .map((token) => token.actor)
          .filter((tokenActor) => tokenActor && allowedTypes.includes(tokenActor.type))

      if (!actors || actors.length === 0) return

      for (const targetActor of actors) {
        if (!allowedTypes.includes(targetActor.type)) continue

        if (targetActor.system?.stance === actionId) continue

        if (!targetActor.canUserModify?.(game.user, 'update')) continue

        try {
          await targetActor.update({ 'system.stance': actionId })
        } catch (error) {
          console.error(error)
        }
      }
    }

    /**
     * Handle weapon action
     * @private
     * @param {object} event    The event
     * @param {object} actor    The actor
     * @param {string} actionId The action id
     */
    #handleWeaponAction(_event, actor, token, actionId) {
      const weapon = actor.items.get(actionId)
      if (!weapon) return

      const skillIds = this.#extractSkillIds(weapon?.system?.skill)
      const ringId = this.#extractRingId(weapon?.system?.ring)

      const options = {
        item: weapon,
        itemId: weapon.id,
        sourceId: weapon.id,
        type: weapon.type,
        itemType: weapon.type,
        title: weapon.name,
        difficulty: weapon?.system?.tn ?? weapon?.system?.difficulty ?? null,
        context: 'token-action-hud'
      }

      if (options.difficulty !== null && options.difficulty !== undefined) {
        options.tn = options.tn ?? options.difficulty
        options.targetNumber = options.targetNumber ?? options.difficulty
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

      this.#openDicePicker(actor, options, token)
    }

    /**
     * Handle ring action
     * @private
     * @param {object} event    The event
     * @param {object} actor    The actor
     * @param {string} actionId The action id
     */
    #handleRingAction(_event, actor, token, actionId) {
      const options = {
        ring: actionId,
        ringId: actionId,
        context: 'token-action-hud'
      }

      this.#openDicePicker(actor, options, token)
    }

    /**
     * Handle skill action
     * @private
     * @param {object} event    The event
     * @param {object} actor    The actor
     * @param {string} actionId The action id
     */
    #handleSkillAction(_event, actor, token, actionId) {
      const options = {
        skill: actionId,
        skillId: actionId,
        context: 'token-action-hud'
      }

      this.#openDicePicker(actor, options, token)
    }

    /**
     * Handle technique action
     * @private
     * @param {object} event    The event
     * @param {object} actor    The actor
     * @param {string} actionId The action id
     */
    #handleTechniqueAction(_event, actor, token, actionId) {
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
        itemType: technique.type,
        title: technique.name,
        difficulty,
        context: 'token-action-hud'
      }

      if (difficulty !== null && difficulty !== undefined) {
        options.tn = options.tn ?? difficulty
        options.targetNumber = options.targetNumber ?? difficulty
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

      this.#openDicePicker(actor, options, token)
    }

    #openDicePicker(actor, payload = {}, token) {
      const Dialog = game?.l5r5e?.DicePickerDialog
      if (!Dialog) return

      const options = { ...payload }

      if (actor && !options.actor) options.actor = actor
      if (actor?.id && !options.actorId) options.actorId = actor.id
      if (actor?.uuid && !options.actorUuid) options.actorUuid = actor.uuid
      if (actor?.type && !options.actorType) options.actorType = actor.type

      if (token && !options.token) options.token = token
      const tokenDocument = token?.document ?? token
      if (tokenDocument?.id && !options.tokenId) options.tokenId = tokenDocument.id
      if (tokenDocument?.uuid && !options.tokenUuid) options.tokenUuid = tokenDocument.uuid
      if (tokenDocument?.scene?.id && !options.sceneId) options.sceneId = tokenDocument.scene.id
      if (tokenDocument?.scene?.uuid && !options.sceneUuid) options.sceneUuid = tokenDocument.scene.uuid

      if (options.item && !options.itemId) options.itemId = options.item.id
      if (options.item && !options.sourceId) options.sourceId = options.sourceId ?? options.item.id
      if (options.item && !options.itemType) options.itemType = options.item.type
      if (options.item?.uuid && !options.itemUuid) options.itemUuid = options.item.uuid
      if (options.item && !options.title) options.title = options.item.name

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

      if (options.difficulty !== null && options.difficulty !== undefined) {
        options.tn = options.tn ?? options.difficulty
        options.targetNumber = options.targetNumber ?? options.difficulty
      }
      if (options.tn !== null && options.tn !== undefined) {
        options.difficulty = options.difficulty ?? options.tn
        options.targetNumber = options.targetNumber ?? options.tn
      }
      if (options.targetNumber !== null && options.targetNumber !== undefined) {
        options.difficulty = options.difficulty ?? options.targetNumber
        options.tn = options.tn ?? options.targetNumber
      }

      const skill = normalizedSkills[0]
      const targetNumber = options.targetNumber ?? options.tn ?? options.difficulty ?? null
      const diceContext = {}
      if (skill) {
        diceContext.skill = skill
        diceContext.skillId = skill
        diceContext.skillKey = skill
      }
      if (ring) {
        diceContext.ring = ring
        diceContext.ringId = ring
        diceContext.ringKey = ring
      }
      if (targetNumber !== null && targetNumber !== undefined) {
        diceContext.tn = targetNumber
        diceContext.difficulty = targetNumber
        diceContext.targetNumber = targetNumber
      }

      options.action = options.action ? { ...diceContext, ...options.action } : { ...diceContext }
      options.check = options.check ? { ...diceContext, ...options.check } : { ...diceContext }
      options.dicePool = options.dicePool ? { ...diceContext, ...options.dicePool } : { ...diceContext }
      options.pool = options.pool ? { ...diceContext, ...options.pool } : { ...diceContext }

      const staticMethods = [
        ['show', [[options], [actor, options], [options, actor]]],
        ['open', [[options], [actor, options], [options, actor]]],
        ['create', [[options], [actor, options], [options, actor]]],
        ['launch', [[options], [actor, options], [options, actor]]],
        ['render', [[options]]]
      ]

      for (const [methodName, argSets] of staticMethods) {
        const method = Dialog?.[methodName]
        if (typeof method !== 'function') continue
        for (const args of argSets) {
          try {
            const result = method.apply(Dialog, args)
            if (result !== undefined) return result
          } catch (error) {
            continue
          }
        }
      }

      const argumentCandidates = []
      argumentCandidates.push([options])
      argumentCandidates.push([actor, options])
      argumentCandidates.push([options, actor])
      argumentCandidates.push([options, { actor }])
      argumentCandidates.push([{ actor, options }])
      if (options.context) {
        argumentCandidates.push([actor, options, options.context])
        argumentCandidates.push([options, actor, options.context])
      }

      const expectedArgs = typeof Dialog.length === 'number' ? Dialog.length : null
      const filteredCandidates = expectedArgs && expectedArgs > 0
        ? argumentCandidates.filter((args) => args.length === expectedArgs)
        : argumentCandidates

      for (const args of filteredCandidates) {
        try {
          const dialog = new Dialog(...args)
          if (typeof dialog?.render === 'function') {
            dialog.render(true)
          } else if (typeof dialog?.open === 'function') {
            dialog.open(options)
          }
          return dialog
        } catch (error) {
          continue
        }
      }

      const localizedPrimary = game.i18n?.localize?.('tokenActionHud.l5r5e.dicePickerError')
      const localizedSecondary = game.i18n?.localize?.('tokenActionHud.notifications.dicePickerError')
      const errorMessage = (localizedPrimary && localizedPrimary !== 'tokenActionHud.l5r5e.dicePickerError')
        ? localizedPrimary
        : (localizedSecondary && localizedSecondary !== 'tokenActionHud.notifications.dicePickerError')
          ? localizedSecondary
          : 'Token Action HUD L5R5e: Unable to open Dice Picker Dialog'
      ui.notifications?.warn?.(errorMessage)
    }

    #extractRingId(data) {
      if (!data) return undefined
      if (data instanceof Set) {
        for (const value of data) {
          const ring = this.#extractRingId(value)
          if (ring) return ring
        }
        return undefined
      }
      if (data instanceof Map) {
        for (const value of data.values()) {
          const ring = this.#extractRingId(value)
          if (ring) return ring
        }
        return undefined
      }
      if (typeof data === 'string') return data
      if (typeof data === 'number') return String(data)
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
      if (data instanceof Set) {
        return this.#dedupeList([...data].flatMap((value) => this.#extractSkillIds(value)))
      }
      if (data instanceof Map) {
        return this.#dedupeList([...data.values()].flatMap((value) => this.#extractSkillIds(value)))
      }
      if (Array.isArray(data)) {
        return this.#dedupeList(data.flatMap((value) => this.#extractSkillIds(value)))
      }
      if (typeof data === 'string') return [data]
      if (typeof data === 'number') return [String(data)]
      if (typeof data === 'object') {
        const keys = ['id', 'ids', 'skill', 'skills', 'skillId', 'skillIds', 'skill_ids', 'skillList', 'skillsList', 'value', 'values', 'default', 'primary', 'entry', 'entries', 'list', 'items']
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
      return [...new Set(list
        .map((value) => {
          if (value === null || value === undefined) return ''
          return String(value)
        })
        .filter((value) => value))]
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
