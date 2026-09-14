/**
 * zoo-image-target-detector.ts
 *
 * DEBUG VISUAL
 *
 * Este componente:
 *
 * 1. Detecta Image Targets.
 * 2. Identifica el animal.
 * 3. Muestra la instrucción al usuario.
 * 4. Envía zoo:animalDetected.
 * 5. Muestra visualmente hasta dónde llegó el código.
 * 6. Escucha zoo:modelPlaced.
 *
 * IMPORTANTE:
 * Este componente NO hace raycast.
 */

import * as ecs from '@8thwall/ecs'


// ============================================================
// 1. TIPOS
// ============================================================

type AnimalKey =
  | 'oso'
  | 'ocelote'
  | 'guacamaya'
  | 'mono'


// ============================================================
// 2. IMAGE TARGET → ANIMAL
// ============================================================

const ANIMAL_BY_IMAGE_NAME: Record<string, AnimalKey> = {
  Anteojos_Target: 'oso',
  Ocelote_Target: 'ocelote',
  Guacamaya_Target: 'guacamaya',
  Aullador_Target: 'mono',
}


// ============================================================
// 3. MENSAJE PRINCIPAL
// ============================================================

const INSTRUCTION_MESSAGE =
  'Alejate un poco del infograma y apunta la camara hacia el piso para descubrir al animal en su habitat libre'


// ============================================================
// 4. EVENTOS
// ============================================================

export const ANIMAL_DETECTED_EVENT = 'zoo:animalDetected'

export const ANIMAL_LOST_EVENT = 'zoo:animalLost'

export const MODEL_PLACED_EVENT = 'zoo:modelPlaced'


// ============================================================
// 5. REGISTRO
// ============================================================

ecs.registerComponent({

  name: 'zoo-image-target-detector',

  schema: {

    /**
     * UI que verá el usuario.
     */
    instructionUi: ecs.eid,

    /**
     * UI temporal para diagnóstico.
     */
    debugUi: ecs.eid,

  },

  data: {

    pendingAnimal: ecs.string,

  },


  // ==========================================================
  // STATE MACHINE
  // ==========================================================

  stateMachine: ({
    world,
    eid,
    schemaAttribute,
    dataAttribute,
  }) => {


    // ========================================================
    // TRIGGERS
    // ========================================================

    const imageFound = ecs.defineTrigger()

    const hideText = ecs.defineTrigger()


    // ========================================================
    // FUNCIÓN DE DEBUG VISUAL
    // ========================================================
    //
    // Esta función escribe directamente en la pantalla.
    //
    // NO depende de console.log().
    //
    // ========================================================

    const updateDebug = (
      message: string,
      status: 'INFO' | 'OK' | 'WAIT' | 'ERROR' = 'INFO'
    ) => {

      const {debugUi} =
        schemaAttribute.get(eid)


      if (!debugUi) {
        return
      }


      let icon = '🔵'


      if (status === 'OK') {
        icon = '🟢'
      }

      if (status === 'WAIT') {
        icon = '🟡'
      }

      if (status === 'ERROR') {
        icon = '🔴'
      }


      const debugText =
        `DEBUG AR\n\n${icon} ${message}`


      ecs.Ui.mutate(
        world,
        debugUi,
        (cursor) => {

          cursor.text = debugText

          cursor.display = 'flex'

          return false
        }
      )
    }


    // ========================================================
    // FUNCIÓN PARA MOSTRAR / OCULTAR INSTRUCCIÓN
    // ========================================================

    const showInstruction = (
      visible: boolean
    ) => {

      const {instructionUi} =
        schemaAttribute.get(eid)


      updateDebug(
        visible
          ? 'Intentando mostrar instrucción...'
          : 'Ocultando instrucción.',
        visible
          ? 'WAIT'
          : 'INFO'
      )


      // ------------------------------------------------------
      // Verificar entidad
      // ------------------------------------------------------

      if (!instructionUi) {

        updateDebug(
          'ERROR: instructionUi no está enlazado.',
          'ERROR'
        )

        return
      }


      // ------------------------------------------------------
      // Modificar UI
      // ------------------------------------------------------

      ecs.Ui.mutate(
        world,
        instructionUi,
        (cursor) => {

          cursor.text =
            INSTRUCTION_MESSAGE

          cursor.display =
            visible
              ? 'flex'
              : 'none'

          return false
        }
      )


      // ------------------------------------------------------
      // Confirmación visual
      // ------------------------------------------------------

      if (visible) {

        updateDebug(
          'Instrucción visible correctamente.',
          'OK'
        )

      } else {

        updateDebug(
          'Instrucción oculta.',
          'INFO'
        )

      }

    }


    // ========================================================
    // ESTADO 1
    //
    // ESPERANDO IMAGE TARGET
    // ========================================================

    ecs.defineState('waitingForTarget')

      .initial()


      // ------------------------------------------------------
      // ENTRADA AL ESTADO
      // ------------------------------------------------------

      .onEnter(() => {

        updateDebug(
          'Detector iniciado. Esperando Image Target...',
          'WAIT'
        )


        showInstruction(false)

      })


      // ======================================================
      // IMAGE TARGET FOUND
      // ======================================================

      .listen(
        world.events.globalId,
        ecs.events.REALITY_IMAGE_FOUND,
        (event: {data: unknown}) => {


          // --------------------------------------------------
          // PASO 1
          // --------------------------------------------------

          updateDebug(
            'Image Target detectado.',
            'OK'
          )


          const data =
            event.data as {
              name?: string
            }


          // --------------------------------------------------
          // PASO 2
          // --------------------------------------------------

          if (!data.name) {

            updateDebug(
              'ERROR: Image Target sin nombre.',
              'ERROR'
            )

            return
          }


          updateDebug(
            `Target detectado: ${data.name}`,
            'OK'
          )


          // --------------------------------------------------
          // PASO 3
          // --------------------------------------------------

          const animal =
            ANIMAL_BY_IMAGE_NAME[data.name]


          if (!animal) {

            updateDebug(
              `ERROR: target "${data.name}" no está en el mapeo.`,
              'ERROR'
            )

            return
          }


          // --------------------------------------------------
          // PASO 4
          // --------------------------------------------------

          updateDebug(
            `Animal reconocido: ${animal}`,
            'OK'
          )


          // --------------------------------------------------
          // PASO 5
          // --------------------------------------------------

          dataAttribute.cursor(eid).pendingAnimal =
            animal


          // --------------------------------------------------
          // PASO 6
          // --------------------------------------------------

          world.events.dispatch(
            world.events.globalId,
            ANIMAL_DETECTED_EVENT,
            {
              animal,
            }
          )


          updateDebug(
            'Evento zoo:animalDetected enviado.',
            'OK'
          )


          // --------------------------------------------------
          // PASO 7
          // --------------------------------------------------

          imageFound.trigger()

        }
      )


      // ------------------------------------------------------
      // TRANSICIÓN
      // ------------------------------------------------------

      .onTrigger(
        imageFound,
        'showingInstruction'
      )


    // ========================================================
    // ESTADO 2
    //
    // IMAGE TARGET DETECTADO
    // ========================================================

    ecs.defineState('showingInstruction')


      // ------------------------------------------------------
      // ENTRADA
      // ------------------------------------------------------

      .onEnter(() => {

        updateDebug(
          'Entró a showingInstruction.',
          'OK'
        )


        showInstruction(true)


        updateDebug(
          'Esperando detección de superficie...',
          'WAIT'
        )

      })


      // ======================================================
      // OTRO IMAGE TARGET
      // ======================================================

      .listen(
        world.events.globalId,
        ecs.events.REALITY_IMAGE_FOUND,
        (event: {data: unknown}) => {

          const data =
            event.data as {
              name?: string
            }


          if (!data.name) {
            return
          }


          const animal =
            ANIMAL_BY_IMAGE_NAME[data.name]


          if (!animal) {
            return
          }


          dataAttribute.cursor(eid).pendingAnimal =
            animal


          world.events.dispatch(
            world.events.globalId,
            ANIMAL_DETECTED_EVENT,
            {
              animal,
            }
          )


          updateDebug(
            `Nuevo animal detectado: ${animal}`,
            'OK'
          )

        }
      )


      // ======================================================
      // IMAGE TARGET LOST
      // ======================================================

      .listen(
        world.events.globalId,
        ecs.events.REALITY_IMAGE_LOST,
        (event: {data: unknown}) => {

          const data =
            event.data as {
              name?: string
            }


          if (!data.name) {
            return
          }


          const lostAnimal =
            ANIMAL_BY_IMAGE_NAME[data.name]


          const current =
            dataAttribute.get(eid)


          // --------------------------------------------------
          // Solo reaccionamos si es el animal pendiente.
          // --------------------------------------------------

          if (
            lostAnimal !==
            current.pendingAnimal
          ) {

            return
          }


          // --------------------------------------------------
          // DEBUG
          // --------------------------------------------------

          updateDebug(
            `Image Target perdido: ${data.name}`,
            'WAIT'
          )


          // --------------------------------------------------
          // AVISAR AL COMPONENTE DE SUPERFICIE
          // --------------------------------------------------

          world.events.dispatch(
            world.events.globalId,
            ANIMAL_LOST_EVENT,
            {}
          )


          // --------------------------------------------------
          // OCULTAR
          // --------------------------------------------------

          hideText.trigger()

        }
      )


      // ======================================================
      // MODELO COLOCADO
      // ======================================================

      .listen(
        world.events.globalId,
        MODEL_PLACED_EVENT,
        () => {

          updateDebug(
            'MODELO COLOCADO. Flujo completo.',
            'OK'
          )


          hideText.trigger()

        }
      )


      // ======================================================
      // VOLVER A ESPERAR
      // ======================================================

      .onTrigger(
        hideText,
        'waitingForTarget'
      )

  },

})