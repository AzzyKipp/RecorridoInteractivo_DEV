import * as ecs from '@8thwall/ecs'

const EcosistemaUnlockController = ecs.registerComponent({
  name: 'Ecosistema Unlock Controller',

  schema: {
    ecosistema: ecs.eid,
  },

  stateMachine: ({world, eid, schemaAttribute}) => {

    // ─────────────────────────────
    // TARGETS NECESARIOS
    // ─────────────────────────────

    const requiredTargets = new Set([
      'O_Lamina',
      'OA_Lamina',
      'MA_Lamina',
      'G_Lamina',
    ])

    // Targets encontrados
    const discoveredTargets = new Set<string>()

    // ─────────────────────────────
    // SONIDO
    // ─────────────────────────────

    const feedbackSound = './assets/feedback.mp3'

    // ─────────────────────────────
    // IMAGE TARGETS
    // ─────────────────────────────

    ecs.defineState('default')
      .initial()
      .listen(
        world.events.globalId,
        ecs.events.REALITY_IMAGE_FOUND,
        (event: any) => {

          const targetName = event.data.name

          // Ignorar otros targets
          if (!requiredTargets.has(targetName)) {
            return
          }

          // No volver a contar un target ya descubierto
          if (discoveredTargets.has(targetName)) {
            return
          }

          // Registrar descubrimiento
          discoveredTargets.add(targetName)

          console.log(
            `🌿 PROGRESO: ${discoveredTargets.size}/4`
          )

          // Sonido individual
          playFeedbackSound()

          // ─────────────────────────
          // 4/4 COMPLETADO
          // ─────────────────────────

          if (discoveredTargets.size === 4) {

            console.log('🎉 ¡LOS 4 TARGETS ENCONTRADOS!')

            // Obtener la entidad Ecosistema
            const ecosistemaEid =
              schemaAttribute.get(eid).ecosistema

            // Mostrar Ecosistema
            ecs.Hidden.remove(world, ecosistemaEid)

            console.log('🌿 ¡ECOSISTEMA DESBLOQUEADO!')
          }
        }
      )

    // ─────────────────────────────
    // REPRODUCIR SONIDO
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