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
          await this.#handleWeaponAction(event, actor, token, actionId)
          break
        case 'ring':
          await this.#handleRingAction(event, actor, token, actionId)
          break
        case 'skill':
          await this.#handleSkillAction(event, actor, token, actionId)
          break
        case 'technique':
          await this.#handleTechniqueAction(event, actor, token, actionId)
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
    async #handleWeaponAction(_event, actor, token, actionId) {
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

      await this.#openDicePicker(actor, options, token)
    }

    /**
     * Handle ring action
     * @private
     * @param {object} event    The event
     * @param {object} actor    The actor
     * @param {string} actionId The action id
     */
    async #handleRingAction(_event, actor, token, actionId) {
      const options = {
        ring: actionId,
        ringId: actionId,
        context: 'token-action-hud'
      }

      await this.#openDicePicker(actor, options, token)
    }

    /**
     * Handle skill action
     * @private
     * @param {object} event    The event
     * @param {object} actor    The actor
     * @param {string} actionId The action id
     */
    async #handleSkillAction(_event, actor, token, actionId) {
      const options = {
        skill: actionId,
        skillId: actionId,
        context: 'token-action-hud'
      }

      await this.#openDicePicker(actor, options, token)
    }

    /**
     * Handle technique action
     * @private
     * @param {object} event    The event
     * @param {object} actor    The actor
     * @param {string} actionId The action id
     */
    async #handleTechniqueAction(_event, actor, token, actionId) {
      const technique = actor.items.get(actionId)

      if (!technique || technique.type !== 'technique') {
        return
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

      await this.#openDicePicker(actor, options, token)
    }

    async #openDicePicker(actor, payload = {}, token) {
      const options = this.#prepareDiceOptions(actor, payload, token)
      const Dialog = this.#resolveDiceDialog()

      if (Dialog) {
        const dialogResult = await this.#invokeDiceDialog(Dialog, actor, options)
        if (dialogResult !== undefined && dialogResult !== null && dialogResult !== false) {
          return dialogResult
        }
      }

      const fallbackResult = await this.#fallbackSystemRoll(actor, options)
      if (fallbackResult !== null && fallbackResult !== undefined && fallbackResult !== false) {
        return fallbackResult
      }

      const localizedPrimary = game.i18n?.localize?.('tokenActionHud.l5r5e.dicePickerError')
      const localizedSecondary = game.i18n?.localize?.('tokenActionHud.notifications.dicePickerError')
      const errorMessage = (localizedPrimary && localizedPrimary !== 'tokenActionHud.l5r5e.dicePickerError')
        ? localizedPrimary
        : (localizedSecondary && localizedSecondary !== 'tokenActionHud.notifications.dicePickerError')
          ? localizedSecondary
          : 'Token Action HUD L5R5e: Unable to open Dice Picker Dialog'
      ui.notifications?.warn?.(errorMessage)
      return null
    }

    #prepareDiceOptions(actor, payload = {}, token) {
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

      return options
    }

    #resolveDiceDialog() {
      const system = game?.l5r5e ?? {}
      const containers = [
        system,
        system?.Dice,
        system?.dice,
        system?.DiceRoller,
        system?.apps,
        system?.apps?.dice,
        system?.apps?.Dice,
        system?.apps?.dialogs,
        system?.applications,
        system?.applications?.dice,
        system?.applications?.Dice,
        system?.applications?.dialogs,
        system?.ui,
        system?.ui?.dice,
        system?.modules,
        CONFIG?.l5r5e,
        CONFIG?.l5r5e?.apps,
        CONFIG?.l5r5e?.dice
      ]

      const classNames = [
        'DicePickerDialog',
        'DicePoolDialog',
        'DiceDialog',
        'DiceRollDialog',
        'DiceCheckDialog',
        'CheckDialog',
        'RollDialog',
        'SkillCheckDialog',
        'SkillRollDialog'
      ]

      for (const container of containers) {
        if (!container) continue
        for (const name of classNames) {
          const candidate = container?.[name]
          const resolved = this.#resolveDialogCandidate(candidate)
          if (resolved) return resolved
        }
      }

      return null
    }

    #resolveDialogCandidate(candidate, depth = 0) {
      if (!candidate || depth > 3) return null

      if (typeof candidate === 'function') return candidate

      if (typeof candidate === 'object') {
        const methodCandidates = ['show', 'open', 'create', 'launch', 'render']
        const hasDirectMethod = methodCandidates.some((method) => typeof candidate?.[method] === 'function')
        if (hasDirectMethod) return candidate

        const nestedKeys = ['Dialog', 'dialog', 'default', 'DicePickerDialog', 'DicePoolDialog', 'DiceDialog']
        for (const key of nestedKeys) {
          const nested = candidate?.[key]
          const resolved = this.#resolveDialogCandidate(nested, depth + 1)
          if (resolved) return resolved
        }
      }

      return null
    }

    async #invokeDiceDialog(Dialog, actor, options) {
      if (!Dialog) return null

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
            const result = await method.apply(Dialog, args)
            if (result !== undefined) return result
          } catch (error) {
            continue
          }
        }
      }

      const argumentCandidates = this.#createDiceArgSets(actor, options)
      const expectedArgs = typeof Dialog === 'function' && typeof Dialog.length === 'number'
        ? Dialog.length
        : null
      const filteredCandidates = expectedArgs !== null && expectedArgs >= 0
        ? argumentCandidates.filter((args) => args.length === expectedArgs)
        : argumentCandidates

      if (typeof Dialog === 'function') {
        for (const args of filteredCandidates) {
          try {
            const result = await Dialog(...args)
            if (result !== undefined) return result
          } catch (error) {
            continue
          }
        }

        for (const args of filteredCandidates) {
          try {
            const dialog = new Dialog(...args)
            if (typeof dialog?.render === 'function') {
              dialog.render(true)
            } else if (typeof dialog?.open === 'function') {
              await dialog.open(options)
            }
            return dialog
          } catch (error) {
            continue
          }
        }
      }

      if (typeof Dialog === 'object') {
        for (const methodName of ['show', 'open', 'create', 'launch']) {
          const method = Dialog?.[methodName]
          if (typeof method !== 'function') continue
          for (const args of argumentCandidates) {
            try {
              const result = await method.apply(Dialog, args)
              if (result !== undefined) return result
            } catch (error) {
              continue
            }
          }
        }

        if (typeof Dialog?.render === 'function') {
          try {
            const result = await Dialog.render(options)
            if (result !== undefined) return result
          } catch (error) {
            // ignore
          }
        }
      }

      return null
    }

    async #fallbackSystemRoll(actor, options) {
      const l5r5e = game?.l5r5e ?? {}
      const diceApis = [
        { fn: actor?.rollSkill, context: actor },
        { fn: actor?.rollCheck, context: actor },
        { fn: actor?.rollDicePool, context: actor },
        { fn: actor?.rollAction, context: actor },
        { fn: actor?.roll, context: actor },
        { fn: l5r5e?.dice?.rollSkill, context: l5r5e?.dice },
        { fn: l5r5e?.dice?.rollCheck, context: l5r5e?.dice },
        { fn: l5r5e?.dice?.rollDicePool, context: l5r5e?.dice },
        { fn: l5r5e?.Dice?.roll, context: l5r5e?.Dice },
        { fn: l5r5e?.Roller?.roll, context: l5r5e?.Roller },
        { fn: l5r5e?.DiceRoller?.roll, context: l5r5e?.DiceRoller },
        { fn: l5r5e?.rollSkill, context: l5r5e },
        { fn: l5r5e?.rollCheck, context: l5r5e },
        { fn: l5r5e?.rollDicePool, context: l5r5e }
      ].filter((entry) => typeof entry.fn === 'function')

      const argSets = this.#createDiceArgSets(actor, options)

      for (const { fn, context } of diceApis) {
        for (const args of argSets) {
          try {
            const result = await fn.apply(context, args)
            if (result !== false) return result ?? true
          } catch (error) {
            continue
          }
        }
      }

      return null
    }

    #createDiceArgSets(actor, options) {
      const args = []
      args.push([])
      args.push([options])
      args.push([actor, options])
      args.push([options, actor])
      args.push([options, { actor }])
      args.push([{ actor, options }])

      if (options?.context) {
        args.push([actor, options, options.context])
        args.push([options, actor, options.context])
        args.push([{ actor, context: options.context, options }])
      }

      const token = options?.token
      if (token) {
        args.push([actor, options, token])
        args.push([options, token, actor])
        args.push([{ actor, token, options }])
      }

      const skill = options?.skill ?? options?.skillId
      const ring = options?.ring ?? options?.ringId

      if (skill) {
        args.push([skill])
        args.push([skill, options])
        args.push([skill, options, actor])
        args.push([{ skill, options }])
        if (ring) {
          args.push([skill, ring])
          args.push([skill, ring, options])
          args.push([{ skill, ring, actor, options }])
        }
      }

      if (ring && !skill) {
        args.push([ring])
        args.push([ring, options])
      }

      const seen = new Set()
      const uniqueArgs = []
      for (const candidate of args) {
        const filtered = candidate.filter((value) => value !== undefined)
        const key = JSON.stringify(filtered, (_key, value) => {
          if (value === actor) return '__ACTOR__'
          if (value === options) return '__OPTIONS__'
          if (value === token) return '__TOKEN__'
          if (typeof value === 'object' && value !== null) return '__OBJECT__'
          return value
        })
        if (seen.has(key)) continue
        seen.add(key)
        uniqueArgs.push(filtered)
      }

      return uniqueArgs
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
