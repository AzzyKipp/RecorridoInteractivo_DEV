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

    // ─────────────────────────────
    // OCULTAR ECOSISTEMA AL INICIAR
    // ─────────────────────────────
    ecs.defineState('default')
      .initial()

      .onEnter(() => {
        const ecosistemaEid = schemaAttribute.get(eid).ecosistema

        ecs.Hidden.set(world, ecosistemaEid)
      })

      // ─────────────────────────────
      // DETECTAR ANIMALES
      // ─────────────────────────────
      .listen(
        world.events.globalId,
        ecs.events.REALITY_IMAGE_FOUND,
        (event: any) => {

          const targetName = event.data.name

          if (!requiredTargets.has(targetName)) {
            return
          }

          // Si ya fue encontrado, no hacer nada
          if (discoveredTargets.has(targetName)) {
            return
          }

          // Registrar descubrimiento
          discoveredTargets.add(targetName)

          // Sonido
          playFeedbackSound()

          // ─────────────────────────────
          // LOS 4 FUERON ENCONTRADOS
          // ─────────────────────────────
          if (discoveredTargets.size === 4) {

            const ecosistemaEid =
              schemaAttribute.get(eid).ecosistema

            // Mostrar Ecosistema
            ecs.Hidden.remove(world, ecosistemaEid)
          }
        }
      )

    // ─────────────────────────────
    // SONIDO
    // ─────────────────────────────
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