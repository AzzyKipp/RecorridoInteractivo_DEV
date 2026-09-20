import * as ecs from '@8thwall/ecs'

const ANIMAL_DETECTED_EVENT = 'zoo:animalDetected'
const MODEL_PLACED_EVENT = 'zoo:modelPlaced'
const FLOOR_STATUS_EVENT = 'zoo:floorStatus'

ecs.registerComponent({
  name: 'zoo-surface-model-placer',

  schema: {

    // --------------------------------------------------
    // MODELOS
    // --------------------------------------------------

    osoModel: ecs.eid,
    ocelotModel: ecs.eid,
    guacamayaModel: ecs.eid,
    monoModel: ecs.eid,

    // --------------------------------------------------
    // SUPERFICIE
    // --------------------------------------------------

    floorSurface: ecs.eid,

    // Distancia máxima del raycast
    maxRaycastDistance: ecs.f32,
  },

  schemaDefaults: {
    maxRaycastDistance: 8,
  },

  data: {

    // Animal elegido por el Image Target
    pendingAnimal: ecs.string,

    // Modelo actualmente colocado
    placedModel: ecs.eid,

    // Estado del World Tracking
    trackingReady: ecs.boolean,

    // ¿Tenemos superficie disponible?
    floorReady: ecs.boolean,
  },

  // --------------------------------------------------
  // ADD
  // --------------------------------------------------

  add: (world, component) => {

    const s =
      component.schemaAttribute.get(component.eid)

    // Ocultar todos los modelos
    ;[
      s.osoModel,
      s.ocelotModel,
      s.guacamayaModel,
      s.monoModel,
    ].forEach((modelEid) => {

      if (modelEid) {
        ecs.Hidden.set(world, modelEid)
      }
    })
  },

  // --------------------------------------------------
  // STATE MACHINE
  // --------------------------------------------------

  stateMachine: ({
    world,
    eid,
    schemaAttribute,
    dataAttribute,
  }) => {

    // --------------------------------------------------
    // OBTENER MODELO
    // --------------------------------------------------

    const getModelForAnimal =
      (animal: string): bigint => {

        const s =
          schemaAttribute.get(eid)

        if (animal === 'oso') {
          return s.osoModel
        }

        if (animal === 'ocelote') {
          return s.ocelotModel
        }

        if (animal === 'guacamaya') {
          return s.guacamayaModel
        }

        if (animal === 'mono') {
          return s.monoModel
        }

        return 0n
      }

    // --------------------------------------------------
    // OCULTAR MODELO
    // --------------------------------------------------

    const hideModel = (modelEid: bigint) => {

      if (modelEid) {
        ecs.Hidden.set(world, modelEid)
      }
    }

    // --------------------------------------------------
    // WORLD TRACKING
    // --------------------------------------------------

    world.events.addListener(
      world.events.globalId,
      ecs.events.REALITY_TRACKING_STATUS,
      (event: {data: unknown}) => {

        const data = event.data as {
          status?: string
        }

        const ready =
          data.status === 'NORMAL'

        dataAttribute.cursor(eid).trackingReady =
          ready

        console.log(
          '[surface] World Tracking:',
          data.status
        )
      }
    )

    // --------------------------------------------------
    // IMAGE TARGET ENCONTRADO
    // --------------------------------------------------

    world.events.addListener(
      world.events.globalId,
      ANIMAL_DETECTED_EVENT,
      (event: {data: unknown}) => {

        const data = event.data as {
          animal?: string
        }

        const animal = data.animal ?? ''

        if (!animal) {
          return
        }

        const current =
          dataAttribute.get(eid)

        // Si había un modelo anterior,
        // lo ocultamos.
        if (current.placedModel) {

          hideModel(
            current.placedModel
          )
        }

        const cursor =
          dataAttribute.cursor(eid)

        cursor.pendingAnimal =
          animal

        cursor.placedModel =
          0n

        console.log(
          '[surface] Animal seleccionado:',
          animal
        )
      }
    )

    // --------------------------------------------------
    // BÚSQUEDA CONTINUA DE SUPERFICIE
    // --------------------------------------------------

    ecs.defineState('trackingFloor')
      .initial()

      .onTick(() => {

        const current =
          dataAttribute.get(eid)

        const s =
          schemaAttribute.get(eid)

        // ----------------------------------------------
        // Todavía no tenemos World Tracking estable
        // ----------------------------------------------

        if (!current.trackingReady) {

          if (current.floorReady) {

            dataAttribute.cursor(eid).floorReady =
              false

            world.events.dispatch(
              world.events.globalId,
              FLOOR_STATUS_EVENT,
              {
                ready: false,
                tracking: 'LIMITED',
              }
            )
          }

          return
        }

        // ----------------------------------------------
        // Cámara
        // ----------------------------------------------

        const cameraEid =
          world.camera.getActiveEid()

        if (!cameraEid) {
          return
        }

        // ----------------------------------------------
        // Floor Surface
        // ----------------------------------------------

        if (!s.floorSurface) {
          return
        }

        // ----------------------------------------------
        // RAYCAST HACIA ADELANTE
        // ----------------------------------------------

        const hits =
          world.raycastFrom(
            cameraEid,
            0,
            s.maxRaycastDistance || 8
          )

        // Buscar específicamente nuestro Floor Surface
        const floorHit =
          hits.find(
            (hit) =>
              hit.eid === s.floorSurface
          )

        const found =
          !!floorHit

        // ----------------------------------------------
        // CAMBIO DE ESTADO DEL PISO
        // ----------------------------------------------

        if (
          found !==
          current.floorReady
        ) {

          dataAttribute.cursor(eid).floorReady =
            found

          world.events.dispatch(
            world.events.globalId,
            FLOOR_STATUS_EVENT,
            {
              ready: found,
              tracking: 'NORMAL',
            }
          )

          console.log(
            '[surface] Floor:',
            found ? 'READY ✓' : 'NOT FOUND'
          )
        }
      })

      // ------------------------------------------------
      // TAP PARA COLOCAR
      // ------------------------------------------------

      .listen(
        world.events.globalId,
        ecs.input.SCREEN_TOUCH_START,
        (event: {data: unknown}) => {

          const current =
            dataAttribute.get(eid)

          // --------------------------------------------
          // Necesitamos las dos cosas
          // --------------------------------------------

          if (!current.pendingAnimal) {
            return
          }

          if (!current.floorReady) {
            return
          }

          if (current.placedModel) {
            return
          }

          // --------------------------------------------
          // DATOS DEL TAP
          // --------------------------------------------

          const data = event.data as {

            worldPosition?: {
              x: number
              y: number
              z: number
            }

            target?: bigint
          }

          const tapPosition =
            data.worldPosition

          // --------------------------------------------
          // Si Studio no nos dio worldPosition
          // --------------------------------------------

          if (!tapPosition) {

            console.warn(
              '[surface] ⚠️ El tap no tiene worldPosition.'
            )

            return
          }

          console.log(
            '[surface] TAP:',
            tapPosition
          )

          // --------------------------------------------
          // OBTENER MODELO
          // --------------------------------------------

          const modelEid =
            getModelForAnimal(
              current.pendingAnimal
            )

          if (!modelEid) {

            console.warn(
              '[surface] ⚠️ No existe modelo para:',
              current.pendingAnimal
            )

            return
          }

          // --------------------------------------------
          // COLOCAR EXACTAMENTE DONDE TOCÓ
          // --------------------------------------------

          world.setPosition(
            modelEid,
            tapPosition.x,
            tapPosition.y,
            tapPosition.z
          )

          // --------------------------------------------
          // MOSTRAR MODELO
          // --------------------------------------------

          ecs.Hidden.remove(
            world,
            modelEid
          )

          // --------------------------------------------
          // GUARDAR MODELO
          // --------------------------------------------

          dataAttribute.cursor(eid).placedModel =
            modelEid

          // --------------------------------------------
          // YA NO ESTÁ ESPERANDO COLOCACIÓN
          // --------------------------------------------

          dataAttribute.cursor(eid).floorReady =
            true

          // --------------------------------------------
          // AVISAR AL DETECTOR
          // --------------------------------------------

          world.events.dispatch(
            world.events.globalId,
            MODEL_PLACED_EVENT,
            {
              animal: current.pendingAnimal,
              position: tapPosition,
            }
          )

          console.log(
            '[surface] ✓ MODELO COLOCADO:',
            current.pendingAnimal
          )
        }
      )
  },
})