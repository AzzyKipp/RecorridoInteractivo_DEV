import * as ecs from '@8thwall/ecs'

const EcosistemaUnlockController = ecs.registerComponent({
  name: 'Ecosistema Unlock Controller',

  schema: {
    ecosistema: ecs.eid,
  },

  stateMachine: ({world, eid, schemaAttribute}) => {

    const requiredTargets = new Set([
      'O_Lamina',
      'OA_Lamina',
      'MA_Lamina',
      'G_Lamina',
    ])

    const discoveredTargets = new Set<string>()

    const feedbackSound = './assets/twinkle.mp3'

    ecs.defineState('default')
      .initial()

      .onEnter(() => {
        const ecosistemaEid =
          schemaAttribute.get(eid).ecosistema

        if (ecosistemaEid) {
          ecs.Disabled.set(world, ecosistemaEid)
        }
      })

      .listen(
        world.events.globalId,
        ecs.events.REALITY_IMAGE_FOUND,
        (event: any) => {

          const targetName = event.data.name

          if (!requiredTargets.has(targetName)) {
            return
          }

          if (discoveredTargets.has(targetName)) {
            return
          }

          discoveredTargets.add(targetName)

          // 🔊 Sonido
          playFeedbackSound()

          // 🌿 Desbloquear al encontrar los 4
          if (discoveredTargets.size === 4) {

            const ecosistemaEid =
              schemaAttribute.get(eid).ecosistema

            if (ecosistemaEid) {
              ecs.Disabled.remove(world, ecosistemaEid)
            }
          }
        }
      )

    function playFeedbackSound() {
      ecs.Audio.set(world, eid, {
        url: feedbackSound,
        volume: 1,
        loop: false,
        paused: false,
        pitch: 1,
        positional: false,
        refDistance: 1,
        distanceModel: 'inverse',
        rolloffFactor: 1,
        maxDistance: 10000,
      })
    }
  },
})

export {EcosistemaUnlockController}