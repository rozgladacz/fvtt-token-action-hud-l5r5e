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
    async #handleWeaponAction(event, actor, token, actionId) {
      const weapon = actor?.items?.get(actionId)
        ?? actor?.items?.find?.((item) => item?.uuid === actionId)
      if (!weapon) return

      const skillIds = this.#extractSkillIds(weapon?.system?.skill)
      const ringId = this.#extractRingId(weapon?.system?.ring)
      const difficulty = weapon?.system?.tn ?? weapon?.system?.difficulty ?? null

      const baseOptions = {
        event,
        item: weapon,
        itemId: weapon.id,
        sourceId: weapon.id,
        type: weapon.type,
        itemType: weapon.type,
        title: weapon.name,
        difficulty,
        context: 'token-action-hud'
      }

      if (skillIds.length > 0) {
        baseOptions.skill = baseOptions.skill ?? skillIds[0]
        baseOptions.skillId = baseOptions.skillId ?? skillIds[0]
        baseOptions.skills = baseOptions.skills ?? skillIds
        baseOptions.skillsList = baseOptions.skillsList ?? skillIds
      }

      if (ringId) {
        baseOptions.ring = baseOptions.ring ?? ringId
        baseOptions.ringId = baseOptions.ringId ?? ringId
      }

      const options = this.#prepareRollOptions(actor, token, baseOptions)

      if (await this.#tryItemRoll(actor, weapon, options)) return

      await this.#openDicePicker(actor, options, token, { prepared: true })
    }

    /**
     * Handle ring action
     * @private
     * @param {object} event    The event
     * @param {object} actor    The actor
     * @param {string} actionId The action id
     */
    async #handleRingAction(event, actor, token, actionId) {
      const baseOptions = {
        event,
        ring: actionId,
        ringId: actionId,
        context: 'token-action-hud'
      }

      const options = this.#prepareRollOptions(actor, token, baseOptions)

      if (await this.#tryRingRoll(actor, actionId, options)) return

      await this.#openDicePicker(actor, options, token, { prepared: true })
    }

    /**
     * Handle skill action
     * @private
     * @param {object} event    The event
     * @param {object} actor    The actor
     * @param {string} actionId The action id
     */
    async #handleSkillAction(event, actor, token, actionId) {
      const baseOptions = {
        event,
        skill: actionId,
        skillId: actionId,
        context: 'token-action-hud'
      }

      const options = this.#prepareRollOptions(actor, token, baseOptions)

      if (await this.#trySkillRoll(actor, actionId, options)) return

      await this.#openDicePicker(actor, options, token, { prepared: true })
    }

    /**
     * Handle technique action
     * @private
     * @param {object} event    The event
     * @param {object} actor    The actor
     * @param {string} actionId The action id
     */
    async #handleTechniqueAction(event, actor, token, actionId) {
      const technique = actor?.items?.get(actionId)
        ?? actor?.items?.find?.((item) => item?.uuid === actionId)
      if (!technique) return

      const skillIds = this.#extractSkillIds(technique?.system?.skill)
      const ringId = this.#extractRingId(technique?.system?.ring)
      const difficulty = technique?.system?.difficulty ?? technique?.system?.tn ?? null

      const baseOptions = {
        event,
        item: technique,
        itemId: technique.id,
        sourceId: technique.id,
        type: technique.type,
        itemType: technique.type,
        title: technique.name,
        difficulty,
        context: 'token-action-hud'
      }

      if (skillIds.length > 0) {
        baseOptions.skill = baseOptions.skill ?? skillIds[0]
        baseOptions.skillId = baseOptions.skillId ?? skillIds[0]
        baseOptions.skills = baseOptions.skills ?? skillIds
        baseOptions.skillsList = baseOptions.skillsList ?? skillIds
      }

      if (ringId) {
        baseOptions.ring = baseOptions.ring ?? ringId
        baseOptions.ringId = baseOptions.ringId ?? ringId
      }

      const options = this.#prepareRollOptions(actor, token, baseOptions)

      if (await this.#tryItemRoll(actor, technique, options)) return

      await this.#openDicePicker(actor, options, token, { prepared: true })
    }

    async #openDicePicker(actor, payload = {}, token, { prepared = false } = {}) {
      const options = prepared ? this.#duplicateOptions(payload) : this.#prepareRollOptions(actor, token, payload)
      const Dialog = this.#resolveDiceDialog()
      if (!Dialog) {
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
      return null
    }

    #prepareRollOptions(actor, token, payload = {}) {
      const options = this.#duplicateOptions(payload)

      if (!options.context) options.context = 'token-action-hud'

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
        options.skillKey = options.skillKey ?? normalizedSkills[0]
        options.skills = normalizedSkills
        options.skillsList = normalizedSkills
      }

      const ring = this.#extractRingId(options.ring ?? options.ringId ?? options.ringKey)
      if (ring) {
        options.ring = ring
        options.ringId = ring
        options.ringKey = ring
      }

      const resolvedTN = this.#coerceNumber(options.targetNumber)
        ?? this.#coerceNumber(options.tn)
        ?? this.#coerceNumber(options.difficulty)

      if (resolvedTN !== null) {
        options.difficulty = resolvedTN
        options.tn = resolvedTN
        options.targetNumber = resolvedTN
      }

      const diceContext = {}
      if (normalizedSkills.length > 0) {
        diceContext.skill = normalizedSkills[0]
        diceContext.skillId = normalizedSkills[0]
        diceContext.skillKey = normalizedSkills[0]
      }
      if (ring) {
        diceContext.ring = ring
        diceContext.ringId = ring
        diceContext.ringKey = ring
      }
      if (resolvedTN !== null) {
        diceContext.tn = resolvedTN
        diceContext.difficulty = resolvedTN
        diceContext.targetNumber = resolvedTN
      }

      options.action = options.action ? { ...diceContext, ...options.action } : { ...diceContext }
      options.check = options.check ? { ...diceContext, ...options.check } : { ...diceContext }
      options.dicePool = options.dicePool ? { ...diceContext, ...options.dicePool } : { ...diceContext }
      options.pool = options.pool ? { ...diceContext, ...options.pool } : { ...diceContext }

      return options
    }

    async #trySkillRoll(actor, skillId, options) {
      if (!actor || !skillId) return false

      const argSets = this.#buildSkillArgSets(skillId, actor, options)

      const handlers = [
        { fn: actor?.rollSkill, context: actor, argsList: argSets },
        { fn: actor?.rollSkillCheck, context: actor, argsList: argSets },
        { fn: actor?.rollSkillTest, context: actor, argsList: argSets },
        { fn: actor?.rollSkillDicePool, context: actor, argsList: argSets },
        { fn: actor?.rollCheck, context: actor, argsList: argSets }
      ]

      if (await this.#executeRollHandlers(handlers)) return true

      const l5r5e = game?.l5r5e ?? {}
      const helper = l5r5e?.HelpersL5r5e
      const skillOptions = this.#duplicateOptions(options, { skill: skillId, skillId })

      const globalHandlers = []

      const helperArgSets = [
        [actor, skillId, this.#duplicateOptions(skillOptions)],
        [actor, this.#duplicateOptions(skillOptions)],
        [this.#duplicateOptions(skillOptions)],
        [{ actor, skill: skillId, options: this.#duplicateOptions(skillOptions) }]
      ]
      if (helper) {
        globalHandlers.push({ fn: helper.rollSkill, context: helper, argsList: helperArgSets })
      }

      const rollApis = [l5r5e?.Rolls, l5r5e?.Roller, l5r5e?.Dice, l5r5e?.dice, l5r5e?.checks]
      const methodNames = ['rollSkill', 'skill', 'skillCheck', 'rollCheck', 'rollSkillCheck']
      for (const api of rollApis) {
        if (!api) continue
        for (const methodName of methodNames) {
          const fn = api?.[methodName]
          if (typeof fn !== 'function') continue
          globalHandlers.push({
            fn,
            context: api,
            argsList: [
              [actor, skillId, this.#duplicateOptions(skillOptions)],
              [actor, this.#duplicateOptions(skillOptions)],
              [this.#duplicateOptions(skillOptions)],
              [{ actor, skill: skillId, options: this.#duplicateOptions(skillOptions) }]
            ]
          })
        }
      }

      return this.#executeRollHandlers(globalHandlers)
    }

    async #tryRingRoll(actor, ringId, options) {
      if (!actor || !ringId) return false

      const argSets = this.#buildRingArgSets(ringId, actor, options)

      const handlers = [
        { fn: actor?.rollRing, context: actor, argsList: argSets },
        { fn: actor?.rollRingCheck, context: actor, argsList: argSets },
        { fn: actor?.rollRingTest, context: actor, argsList: argSets },
        { fn: actor?.rollRingDicePool, context: actor, argsList: argSets },
        { fn: actor?.rollCheck, context: actor, argsList: argSets }
      ]

      if (await this.#executeRollHandlers(handlers)) return true

      const l5r5e = game?.l5r5e ?? {}
      const helper = l5r5e?.HelpersL5r5e
      const ringOptions = this.#duplicateOptions(options, { ring: ringId, ringId })

      const helperArgSets = [
        [actor, ringId, this.#duplicateOptions(ringOptions)],
        [actor, ringId],
        [this.#duplicateOptions(ringOptions)],
        [{ actor, ring: ringId, options: this.#duplicateOptions(ringOptions) }]
      ]
      const globalHandlers = []
      if (helper) {
        globalHandlers.push({ fn: helper.rollRing, context: helper, argsList: helperArgSets })
      }

      const rollApis = [l5r5e?.Rolls, l5r5e?.Roller, l5r5e?.Dice, l5r5e?.dice, l5r5e?.checks]
      const methodNames = ['rollRing', 'ring', 'ringCheck', 'rollRingCheck', 'rollStance', 'stance']
      for (const api of rollApis) {
        if (!api) continue
        for (const methodName of methodNames) {
          const fn = api?.[methodName]
          if (typeof fn !== 'function') continue
          globalHandlers.push({
            fn,
            context: api,
            argsList: [
              [actor, ringId, this.#duplicateOptions(ringOptions)],
              [actor, this.#duplicateOptions(ringOptions)],
              [this.#duplicateOptions(ringOptions)],
              [{ actor, ring: ringId, options: this.#duplicateOptions(ringOptions) }]
            ]
          })
        }
      }

      return this.#executeRollHandlers(globalHandlers)
    }

    async #tryItemRoll(actor, item, options) {
      if (!item) return false

      const itemArgSets = this.#buildItemArgSets(actor, item, options)

      const itemHandlers = [
        { fn: item?.roll, context: item, argsList: itemArgSets },
        { fn: item?.use, context: item, argsList: itemArgSets },
        { fn: item?.attack, context: item, argsList: itemArgSets },
        { fn: item?.execute, context: item, argsList: itemArgSets },
        { fn: item?.activate, context: item, argsList: itemArgSets },
        { fn: item?.perform, context: item, argsList: itemArgSets },
        { fn: item?.trigger, context: item, argsList: itemArgSets },
        { fn: item?.cast, context: item, argsList: itemArgSets },
        { fn: item?.useItem, context: item, argsList: itemArgSets }
      ]

      if (await this.#executeRollHandlers(itemHandlers)) return true

      const actorArgSets = [
        [item, this.#duplicateOptions(options, { item })],
        [item, this.#duplicateOptions(options, { item, actor })],
        [this.#duplicateOptions(options, { item })],
        [{ actor, item, options: this.#duplicateOptions(options, { item }) }],
        [item]
      ]

      const actorHandlers = [
        { fn: actor?.rollItem, context: actor, argsList: actorArgSets },
        { fn: actor?.useItem, context: actor, argsList: actorArgSets },
        { fn: actor?.performTechnique, context: actor, argsList: actorArgSets },
        { fn: actor?.executeTechnique, context: actor, argsList: actorArgSets },
        { fn: actor?.activateItem, context: actor, argsList: actorArgSets },
        { fn: actor?.rollWeapon, context: actor, argsList: actorArgSets },
        { fn: actor?.rollAttack, context: actor, argsList: actorArgSets },
        { fn: actor?.rollTechnique, context: actor, argsList: actorArgSets },
        { fn: actor?.useTechnique, context: actor, argsList: actorArgSets }
      ]

      if (await this.#executeRollHandlers(actorHandlers)) return true

      const l5r5e = game?.l5r5e ?? {}
      const helper = l5r5e?.HelpersL5r5e
      const optionsWithItem = this.#duplicateOptions(options, { item })
      const globalHandlers = []

      const helperArgSets = [
        [actor, item, this.#duplicateOptions(optionsWithItem)],
        [item, this.#duplicateOptions(optionsWithItem)],
        [this.#duplicateOptions(optionsWithItem)],
        [{ actor, item, options: this.#duplicateOptions(optionsWithItem) }]
      ]
      if (helper) {
        globalHandlers.push({ fn: helper.rollItem, context: helper, argsList: helperArgSets })
        globalHandlers.push({ fn: helper.rollTechnique, context: helper, argsList: helperArgSets })
        globalHandlers.push({ fn: helper.rollWeapon, context: helper, argsList: helperArgSets })
      }

      const rollApis = [l5r5e?.Rolls, l5r5e?.Roller, l5r5e?.Dice, l5r5e?.dice, l5r5e?.checks]
      const methodNames = ['item', 'rollItem', 'useItem', 'technique', 'rollTechnique', 'weapon', 'rollWeapon', 'attack', 'rollAttack']
      for (const api of rollApis) {
        if (!api) continue
        for (const methodName of methodNames) {
          const fn = api?.[methodName]
          if (typeof fn !== 'function') continue
          globalHandlers.push({
            fn,
            context: api,
            argsList: [
              [actor, item, this.#duplicateOptions(optionsWithItem)],
              [item, this.#duplicateOptions(optionsWithItem)],
              [this.#duplicateOptions(optionsWithItem)],
              [{ actor, item, options: this.#duplicateOptions(optionsWithItem) }]
            ]
          })
        }
      }

      return this.#executeRollHandlers(globalHandlers)
    }

    #buildSkillArgSets(skillId, actor, options) {
      const base = this.#duplicateOptions(options, { skill: options.skill ?? skillId, skillId: options.skillId ?? skillId, skillKey: options.skillKey ?? skillId })
      const withActor = this.#duplicateOptions(base, { actor: base.actor ?? actor })
      return [
        [skillId, this.#duplicateOptions(base)],
        [skillId, this.#duplicateOptions(withActor)],
        [this.#duplicateOptions(base)],
        [this.#duplicateOptions(withActor)],
        [{ actor, skill: skillId, options: this.#duplicateOptions(base) }],
        [skillId],
        []
      ]
    }

    #buildRingArgSets(ringId, actor, options) {
      const base = this.#duplicateOptions(options, { ring: options.ring ?? ringId, ringId: options.ringId ?? ringId, ringKey: options.ringKey ?? ringId })
      const withActor = this.#duplicateOptions(base, { actor: base.actor ?? actor })
      return [
        [ringId, this.#duplicateOptions(base)],
        [ringId, this.#duplicateOptions(withActor)],
        [this.#duplicateOptions(base)],
        [this.#duplicateOptions(withActor)],
        [{ actor, ring: ringId, options: this.#duplicateOptions(base) }],
        [ringId],
        []
      ]
    }

    #buildItemArgSets(actor, item, options) {
      const base = this.#duplicateOptions(options, { item: options.item ?? item, itemId: options.itemId ?? item?.id, sourceId: options.sourceId ?? item?.id, itemType: options.itemType ?? item?.type })
      const withActor = this.#duplicateOptions(base, { actor: base.actor ?? actor })
      return [
        [this.#duplicateOptions(base)],
        [this.#duplicateOptions(withActor)],
        [item, this.#duplicateOptions(base)],
        [item, this.#duplicateOptions(withActor)],
        [actor, item, this.#duplicateOptions(base)],
        [item],
        []
      ]
    }

    async #executeRollHandlers(handlers = []) {
      for (const handler of handlers) {
        if (!handler) continue
        const fn = handler.fn
        if (typeof fn !== 'function') continue
        const context = handler.context ?? null
        const argsList = Array.isArray(handler.argsList) && handler.argsList.length > 0 ? handler.argsList : [[]]
        for (const args of argsList) {
          const preparedArgs = Array.isArray(args) ? args : [args]
          try {
            const result = await fn.apply(context, preparedArgs)
            if (handler.validateResult) {
              if (handler.validateResult(result)) return true
            } else if (result !== false) {
              return true
            }
          } catch (error) {
            continue
          }
        }
      }
      return false
    }

    #duplicateOptions(options, extra = {}) {
      return { ...(options ?? {}), ...(extra ?? {}) }
    }

    #coerceNumber(value) {
      if (value === null || value === undefined) return null
      if (typeof value === 'number') return Number.isNaN(value) ? null : value
      if (typeof value === 'string') {
        const parsed = Number(value)
        return Number.isNaN(parsed) ? null : parsed
      }
      if (typeof value === 'object') {
        const keys = ['value', 'current', 'count', 'amount', 'number', 'total']
        for (const key of keys) {
          if (!Object.hasOwn(value, key)) continue
          const result = this.#coerceNumber(value[key])
          if (result !== null) return result
        }
      }
      return null
    }

    #resolveDiceDialog() {
      const candidates = [
        game?.l5r5e?.DicePickerDialog,
        game?.l5r5e?.DicePicker,
        game?.l5r5e?.DicePoolDialog,
        game?.l5r5e?.Dice?.DicePickerDialog,
        game?.l5r5e?.Dice?.DicePoolDialog,
        game?.l5r5e?.apps?.DicePickerDialog,
        game?.l5r5e?.apps?.DicePoolDialog,
        game?.l5r5e?.apps?.dice?.DicePickerDialog,
        game?.l5r5e?.apps?.dice?.DicePoolDialog,
        game?.l5r5e?.applications?.DicePickerDialog,
        game?.l5r5e?.applications?.DicePoolDialog,
        CONFIG?.l5r5e?.DicePickerDialog,
        CONFIG?.l5r5e?.DicePoolDialog,
        CONFIG?.l5r5e?.applications?.DicePickerDialog,
        CONFIG?.l5r5e?.applications?.DicePoolDialog,
        CONFIG?.l5r5e?.applications?.dice?.DicePickerDialog,
        CONFIG?.l5r5e?.applications?.dice?.DicePoolDialog
      ]

      for (const candidate of candidates) {
        const resolved = this.#resolveConstructor(candidate)
        if (resolved) return resolved
      }

      return null
    }

    #resolveConstructor(candidate) {
      if (!candidate) return null
      if (typeof candidate === 'function') return candidate
      if (typeof candidate === 'object') {
        const keys = ['DicePickerDialog', 'DicePoolDialog', 'default', 'Dialog', 'Application']
        for (const key of keys) {
          if (typeof candidate[key] === 'function') return candidate[key]
        }
      }
      return null
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
