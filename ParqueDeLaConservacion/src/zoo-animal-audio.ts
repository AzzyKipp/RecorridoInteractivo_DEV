import * as ecs from '@8thwall/ecs'

const ANIMAL_DETECTED_EVENT = 'zoo:animalDetected'
const MODEL_PLACED_EVENT = 'zoo:modelPlaced'

ecs.registerComponent({
  name: 'zoo-animal-audio',

  schema: {
    osoAudio: ecs.eid,
    oceloteAudio: ecs.eid,
    guacamayaAudio: ecs.eid,
    monoAudio: ecs.eid,
  },

  add: (world, component) => {
    const s = component.schemaAttribute.get(component.eid)

    // Pausar todos los audios al comenzar
    const audios = [
      s.osoAudio,
      s.oceloteAudio,
      s.guacamayaAudio,
      s.monoAudio,
    ]

    audios.forEach((audioEid) => {
      if (!audioEid) return
      if (!ecs.Audio.has(world, audioEid)) return

      ecs.Audio.mutate(world, audioEid, (audio) => {
        audio.paused = true
        return false
      })
    })
  },

  stateMachine: ({world, eid, schemaAttribute}) => {

    // Animal que acaba de ser detectado
    let currentAnimal = ''

    // --------------------------------------------------
    // GUARDAR ANIMAL DETECTADO
    // --------------------------------------------------

    world.events.addListener(
      world.events.globalId,
      ANIMAL_DETECTED_EVENT,
      (event: {data: unknown}) => {

        const {animal} = event.data as {
          animal: string
        }

        currentAnimal = animal
      }
    )

    // --------------------------------------------------
    // CUANDO EL MODELO APARECE
    // --------------------------------------------------

    world.events.addListener(
      world.events.globalId,
      MODEL_PLACED_EVENT,
      () => {

        const s = schemaAttribute.get(eid)

        let audioEid: bigint = 0n

        if (currentAnimal === 'oso') {
          audioEid = s.osoAudio
        }

        if (currentAnimal === 'ocelote') {
          audioEid = s.oceloteAudio
        }

        if (currentAnimal === 'guacamaya') {
          audioEid = s.guacamayaAudio
        }

        if (currentAnimal === 'mono') {
          audioEid = s.monoAudio
        }

        if (!audioEid) {
          return
        }

        if (!ecs.Audio.has(world, audioEid)) {
          return
        }

        // Pausar los otros audios
        const audios = [
          s.osoAudio,
          s.oceloteAudio,
          s.guacamayaAudio,
          s.monoAudio,
        ]

        audios.forEach((otherAudioEid) => {
          if (!otherAudioEid) return
          if (!ecs.Audio.has(world, otherAudioEid)) return

          ecs.Audio.mutate(world, otherAudioEid, (audio) => {
            audio.paused = true
            return false
          })
        })

        // Reproducir el audio del animal actual
        ecs.Audio.mutate(world, audioEid, (audio) => {
          audio.paused = false
          audio.loop = true
          return false
        })
      }
    )

    // --------------------------------------------------
    // ESTADO INICIAL
    // --------------------------------------------------

    ecs.defineState('idle')
      .initial()
  },
})

