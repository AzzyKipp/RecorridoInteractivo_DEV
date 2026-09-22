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

    // 🔒 Estado independiente del Image Target
    let ecosistemaDesbloqueado = false

    const feedbackSound = './assets/twinkle.mp3'
    const ecosistemaSound = './assets/pitched_twink.mp3'

    ecs.defineState('default')
      .initial()

      .onEnter(() => {

        // ⚠️ Ya NO deshabilitamos Ecosistema.
        // El Image Target debe permanecer activo
        // para poder detectar Target 5.

        ecosistemaDesbloqueado = false
      })

      .listen(
        world.events.globalId,
        ecs.events.REALITY_IMAGE_FOUND,
        (event: any) => {

          const targetName = event.data.name

          // 🌿 Ecosistema / Target 5
          if (targetName === 'Ecosistema') {

            // 🔊 Solo suena si las 4 láminas ya fueron encontradas
            if (ecosistemaDesbloqueado) {
              playEcosistemaSound()
            }

            return
          }

          // 🐆🐻🐒🦜 Animales
          if (!requiredTargets.has(targetName)) {
            return
          }

          // Evitar repetir una lámina
          if (discoveredTargets.has(targetName)) {
            return
          }

          discoveredTargets.add(targetName)

          // 🔊 Sonido de la lámina
          playFeedbackSound()

          // 🌿 Desbloquear al encontrar las 4
          if (discoveredTargets.size === 4) {

            ecosistemaDesbloqueado = true
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

    function playEcosistemaSound() {
      ecs.Audio.set(world, eid, {
        url: ecosistemaSound,
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