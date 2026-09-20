import * as ecs from '@8thwall/ecs'

type AnimalKey = 'oso' | 'ocelote' | 'guacamaya' | 'mono'

// --------------------------------------------------
// MAPEO DE IMAGE TARGETS
// --------------------------------------------------

const ANIMAL_BY_IMAGE_NAME: Record<string, AnimalKey> = {
  Anteojos_Target: 'oso',
  Ocelote_Target: 'ocelote',
  Guacamaya_Target: 'guacamaya',
  Aullador_Target: 'mono',
}

// --------------------------------------------------
// EVENTOS PERSONALIZADOS
// --------------------------------------------------

export const ANIMAL_DETECTED_EVENT = 'zoo:animalDetected'
export const MODEL_PLACED_EVENT = 'zoo:modelPlaced'
export const FLOOR_STATUS_EVENT = 'zoo:floorStatus'

// --------------------------------------------------
// COMPONENTE
// --------------------------------------------------

ecs.registerComponent({
  name: 'zoo-image-target-detector',

  schema: {
    // UI principal del usuario
    instructionUi: ecs.eid,

    // Panel temporal de debug
    debugUi: ecs.eid,
  },

  data: {
    // Animal seleccionado actualmente
    pendingAnimal: ecs.string,

    // ¿El sistema ya encontró una superficie válida?
    floorReady: ecs.boolean,

    // ¿Ya se colocó el modelo?
    modelPlaced: ecs.boolean,
  },

  stateMachine: ({
    world,
    eid,
    schemaAttribute,
    dataAttribute,
  }) => {

    // --------------------------------------------------
    // ACTUALIZAR TEXTO DEL USUARIO
    // --------------------------------------------------

    const updateInstruction = (text: string) => {
      const {instructionUi} = schemaAttribute.get(eid)

      if (!instructionUi) {
        return
      }

      ecs.Ui.mutate(world, instructionUi, (ui) => {
        ui.text = text
        ui.display = 'flex'
        return false
      })
    }

    // --------------------------------------------------
    // OCULTAR TEXTO
    // --------------------------------------------------

    const hideInstruction = () => {
      const {instructionUi} = schemaAttribute.get(eid)

      if (!instructionUi) {
        return
      }

      ecs.Ui.mutate(world, instructionUi, (ui) => {
        ui.display = 'none'
        return false
      })
    }

    // --------------------------------------------------
    // DEBUG
    // --------------------------------------------------

    const updateDebug = (text: string) => {
      const {debugUi} = schemaAttribute.get(eid)

      if (!debugUi) {
        return
      }

      ecs.Ui.mutate(world, debugUi, (ui) => {
        ui.text = text
        ui.display = 'flex'
        return false
      })
    }

    // --------------------------------------------------
    // ACTUALIZAR EL MENSAJE SEGÚN EL ESTADO
    // --------------------------------------------------

    const refreshInstruction = () => {
      const {
        pendingAnimal,
        floorReady,
        modelPlaced,
      } = dataAttribute.get(eid)

      // -------------------------------
      // MODELO YA COLOCADO
      // -------------------------------

      if (modelPlaced) {
        hideInstruction()
        return
      }

      // -------------------------------
      // NO HAY ANIMAL SELECCIONADO
      // -------------------------------

      if (!pendingAnimal) {

        if (floorReady) {

          updateInstruction(
            'Piso detectado ✓\n\nEscanea un infograma para descubrir un animal 🐾'
          )

        } else {

          updateInstruction(
            'Escanea un infograma y mueve la cámara para detectar el piso.'
          )
        }

        return
      }

      // -------------------------------
      // HAY ANIMAL PERO NO PISO
      // -------------------------------

      if (!floorReady) {

        updateInstruction(
          'Infograma detectado ✓\n\nApunta la cámara hacia el piso para detectar una superficie.'
        )

        return
      }

      // -------------------------------
      // TENEMOS ANIMAL + PISO
      // -------------------------------

      updateInstruction(
        '¡Todo listo! 👆\n\nTAP TO PLACE'
      )
    }

    // --------------------------------------------------
    // ESTADO INICIAL
    // --------------------------------------------------

    ecs.defineState('waiting')
      .initial()

      .onEnter(() => {

        dataAttribute.cursor(eid).pendingAnimal = ''
        dataAttribute.cursor(eid).floorReady = false
        dataAttribute.cursor(eid).modelPlaced = false

        updateDebug(
          'INICIANDO AR...\n\n' +
          'TARGET: esperando\n' +
          'ANIMAL: ninguno\n' +
          'FLOOR: buscando...'
        )

        refreshInstruction()
      })

      // ------------------------------------------------
      // IMAGE TARGET ENCONTRADO
      // ------------------------------------------------

      .listen(
        world.events.globalId,
        ecs.events.REALITY_IMAGE_FOUND,
        (event: {data: unknown}) => {

          const data = event.data as {
            name?: string
          }

          const targetName = data.name ?? ''

          console.log(
            '[detector] IMAGE FOUND:',
            targetName
          )

          const animal =
            ANIMAL_BY_IMAGE_NAME[targetName]

          // Target desconocido
          if (!animal) {

            updateDebug(
              'TARGET DETECTADO\n\n' +
              targetName +
              '\n\n⚠️ NO ESTÁ EN EL MAPEO'
            )

            return
          }

          // Guardar animal
          dataAttribute.cursor(eid).pendingAnimal =
            animal

          dataAttribute.cursor(eid).modelPlaced =
            false

          // Avisar al placer
          world.events.dispatch(
            world.events.globalId,
            ANIMAL_DETECTED_EVENT,
            {
              animal,
              targetName,
            }
          )

          updateDebug(
            'TARGET DETECTADO ✓\n\n' +
            'Target: ' +
            targetName +
            '\n' +
            'Animal: ' +
            animal +
            '\n\n' +
            'FLOOR: ' +
            (
              dataAttribute.get(eid).floorReady
                ? 'READY ✓'
                : 'BUSCANDO...'
            )
          )

          refreshInstruction()
        }
      )

      // ------------------------------------------------
      // IMPORTANTE:
      // IMAGE LOST NO CANCELA NADA
      // ------------------------------------------------

      .listen(
        world.events.globalId,
        ecs.events.REALITY_IMAGE_LOST,
        (event: {data: unknown}) => {

          const data = event.data as {
            name?: string
          }

          const targetName = data.name ?? ''

          const animal =
            ANIMAL_BY_IMAGE_NAME[targetName]

          if (!animal) {
            return
          }

          const currentAnimal =
            dataAttribute.get(eid).pendingAnimal

          // Si no es nuestro target actual,
          // simplemente ignoramos.
          if (animal !== currentAnimal) {
            return
          }

          console.log(
            '[detector] IMAGE LOST:',
            targetName,
            'pero el animal permanece seleccionado.'
          )

          updateDebug(
            'TARGET PERDIDO\n\n' +
            'Target: ' +
            targetName +
            '\n' +
            'Animal seleccionado: ' +
            animal +
            '\n\n' +
            'El World Tracking CONTINÚA.'
          )

          // 🚨 NO HACEMOS:
          // pendingAnimal = ''
          // floorReady = false
          // cancelled.trigger()
          //
          // El animal se conserva.
        }
      )

      // ------------------------------------------------
      // CAMBIO DEL ESTADO DEL PISO
      // ------------------------------------------------

      .listen(
        world.events.globalId,
        FLOOR_STATUS_EVENT,
        (event: {data: unknown}) => {

          const data = event.data as {
            ready?: boolean
            tracking?: string
          }

          const ready = data.ready === true

          dataAttribute.cursor(eid).floorReady =
            ready

          const animal =
            dataAttribute.get(eid).pendingAnimal

          updateDebug(
            'AR STATUS\n\n' +
            'Animal: ' +
            (animal || 'ninguno') +
            '\n' +
            'World Tracking: ' +
            (data.tracking || '---') +
            '\n' +
            'Floor: ' +
            (ready ? 'READY ✓' : 'BUSCANDO...')
          )

          refreshInstruction()
        }
      )

      // ------------------------------------------------
      // MODELO COLOCADO
      // ------------------------------------------------

      .listen(
        world.events.globalId,
        MODEL_PLACED_EVENT,
        (event: {data: unknown}) => {

          const data = event.data as {
            animal?: string
          }

          dataAttribute.cursor(eid).modelPlaced =
            true

          updateDebug(
            'MODELO COLOCADO ✓\n\n' +
            'Animal: ' +
            (data.animal || '---')
          )

          hideInstruction()
        }
      )
  },
})