import * as ecs from '@8thwall/ecs'

const EcosistemaUnlockController = ecs.registerComponent({
  name: 'Ecosistema Unlock Controller',

  stateMachine: ({world, eid}) => {

    // ─────────────────────────────
    // TARGETS NECESARIOS
    // ─────────────────────────────

    const requiredTargets = new Set([
      'O_Lamina',
      'OA_Lamina',
      'MA_Lamina',
      'G_Lamina',
    ])

    // Targets que ya fueron encontrados
    const discoveredTargets = new Set<string>()

    // ─────────────────────────────
    // CONFIGURACIÓN DEL SONIDO
    // ─────────────────────────────

    const feedbackSound = './assets/twinkle.mp3'

    // ─────────────────────────────
    // DETECCIÓN DE IMAGE TARGETS
    // ─────────────────────────────

    ecs.defineState('default')
      .initial()
      .listen(
        world.events.globalId,
        ecs.events.REALITY_IMAGE_FOUND,
        (event: any) => {

          const targetName = event.data.name

          console.log('🎯 TARGET ENCONTRADO:', targetName)

          // Ignorar targets que no necesitamos
          if (!requiredTargets.has(targetName)) {
            return
          }

          // Si ya fue encontrado anteriormente,
          // no volver a contarlo
          if (discoveredTargets.has(targetName)) {
            return
          }

          // Guardar el target
          discoveredTargets.add(targetName)

          console.log(
            `🌿 PROGRESO: ${discoveredTargets.size}/4`
          )

          // ─────────────────────────
          // SONIDO DE FEEDBACK
          // ─────────────────────────

          playFeedbackSound()

          // ─────────────────────────
          // COMPLETAR LOS 4 TARGETS
          // ─────────────────────────

          if (discoveredTargets.size === 4) {

            console.log(
              '🎉🎉🎉 ¡LOS 4 TARGETS FUERON ENCONTRADOS!'
            )

            // Por ahora solo hacemos
            // un segundo sonido especial
            // en el siguiente paso podemos
            // activar Ecosistema aquí.
          }
        }
      )

    // ─────────────────────────────
    // REPRODUCIR SONIDO
    // ─────────────────────────────

    function playFeedbackSound() {

      console.log('🔊 REPRODUCIENDO FEEDBACK')

      // Creamos/configuramos el audio
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