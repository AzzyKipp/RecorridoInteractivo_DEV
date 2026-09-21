import * as ecs from '@8thwall/ecs'

type AnimalKey = 'oso' | 'ocelote' | 'guacamaya' | 'mono'

const ANIMAL_BY_IMAGE_NAME: Record<string, AnimalKey> = {
  Anteojos_Target: 'oso',
  Ocelote_Target: 'ocelote',
  Guacamaya_Target: 'guacamaya',
  Aullador_Target: 'mono',
}

const ANIMAL_DETECTED_EVENT = 'zoo:animalDetected'
const ANIMAL_LOST_EVENT = 'zoo:animalLost'
const MODEL_PLACED_EVENT = 'zoo:modelPlaced'

ecs.registerComponent({
  name: 'zoo-image-target-detector',

  schema: {
    instructionUi: ecs.eid,
    debugUi: ecs.eid,
  },

  data: {
    pendingAnimal: ecs.string,
  },

  stateMachine: ({world, eid, schemaAttribute, dataAttribute}) => {
    const targetFound = ecs.defineTrigger()
    const targetLost = ecs.defineTrigger()

    const updateDebug = (text: string) => {
      const s = schemaAttribute.get(eid)

      if (!s.debugUi) return

      ecs.Ui.mutate(world, s.debugUi, (ui) => {
        ui.text = text
        ui.display = 'flex'
      })
    }

    const showInstruction = (text: string) => {
      const s = schemaAttribute.get(eid)

      if (!s.instructionUi) return

      ecs.Ui.mutate(world, s.instructionUi, (ui) => {
        ui.text = text
        ui.display = 'flex'
      })
    }

    const hideInstruction = () => {
      const s = schemaAttribute.get(eid)

      if (!s.instructionUi) return

      ecs.Ui.mutate(world, s.instructionUi, (ui) => {
        ui.display = 'none'
      })
    }

    ecs.defineState('waitingForTarget')
      .initial()

      .listen(
        world.events.globalId,
        ecs.events.REALITY_IMAGE_FOUND,
        (event: {data: unknown}) => {
          const data = event.data as {
            name?: string
          }

          const targetName = data.name ?? ''
          const animal = ANIMAL_BY_IMAGE_NAME[targetName]

          updateDebug(
            `TARGET DETECTADO\n\n${targetName}\n\nAnimal: ${
              animal ?? 'NO ENCONTRADO'
            }`
          )

          if (!animal) {
            return
          }

          dataAttribute.cursor(eid).pendingAnimal = animal

          world.events.dispatch(
            world.events.globalId,
            ANIMAL_DETECTED_EVENT,
            {
              animal,
              targetName,
            }
          )

          showInstruction(
            'Alejate un poco del infograma y apunta la camara hacia el piso para descubrir al animal'
          )

          targetFound.trigger()
        }
      )

      .listen(
        world.events.globalId,
        MODEL_PLACED_EVENT,
        () => {
          updateDebug('MODELO COLOCADO ✓')
          hideInstruction()
        }
      )

      .onTrigger(targetFound, 'trackingTarget')

    ecs.defineState('trackingTarget')

      .listen(
        world.events.globalId,
        ecs.events.REALITY_IMAGE_FOUND,
        (event: {data: unknown}) => {
          const data = event.data as {
            name?: string
          }

          const targetName = data.name ?? ''
          const animal = ANIMAL_BY_IMAGE_NAME[targetName]

          if (!animal) return

          dataAttribute.cursor(eid).pendingAnimal = animal

          world.events.dispatch(
            world.events.globalId,
            ANIMAL_DETECTED_EVENT,
            {
              animal,
              targetName,
            }
          )

          updateDebug(
            `TARGET DETECTADO\n\n${targetName}\n\nAnimal: ${animal}`
          )
        }
      )

      .listen(
        world.events.globalId,
        ecs.events.REALITY_IMAGE_LOST,
        (event: {data: unknown}) => {
          const data = event.data as {
            name?: string
          }

          const targetName = data.name ?? ''
          const animal = ANIMAL_BY_IMAGE_NAME[targetName]

          if (!animal) return

          const currentAnimal =
            dataAttribute.get(eid).pendingAnimal

          if (animal !== currentAnimal) return

          dataAttribute.cursor(eid).pendingAnimal = ''

          world.events.dispatch(
            world.events.globalId,
            ANIMAL_LOST_EVENT,
            {
              animal,
              targetName,
            }
          )

          updateDebug(
            `TARGET PERDIDO\n\n${targetName}`
          )

          targetLost.trigger()
        }
      )

      .listen(
        world.events.globalId,
        MODEL_PLACED_EVENT,
        () => {
          updateDebug('MODELO COLOCADO ✓')
          hideInstruction()
        }
      )

      .onTrigger(targetLost, 'waitingForTarget')
  },
})