import * as ecs from '@8thwall/ecs'

const ANIMAL_DETECTED_EVENT = 'zoo:animalDetected'
const ANIMAL_LOST_EVENT = 'zoo:animalLost'
const MODEL_PLACED_EVENT = 'zoo:modelPlaced'

ecs.registerComponent({
  name: 'zoo-surface-model-placer',

  schema: {
    osoModel: ecs.eid,
    ocelotModel: ecs.eid,
    guacamayaModel: ecs.eid,
    monoModel: ecs.eid,

    floorSurface: ecs.eid,

    maxRaycastDistance: ecs.f32,
  },

  schemaDefaults: {
    maxRaycastDistance: 8,
  },

  data: {
    pendingAnimal: ecs.string,
    placedModel: ecs.eid,
    trackingReady: ecs.boolean,
  },

  add: (world, component) => {
    const s = component.schemaAttribute.get(component.eid)

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

  stateMachine: ({
    world,
    eid,
    schemaAttribute,
    dataAttribute,
  }) => {
    const animalRequested = ecs.defineTrigger()
    const floorFound = ecs.defineTrigger()
    const cancelled = ecs.defineTrigger()

    const getModelForAnimal = (animal: string): bigint => {
      const s = schemaAttribute.get(eid)

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

    const hideModel = (modelEid: bigint) => {
      if (modelEid) {
        ecs.Hidden.set(world, modelEid)
      }
    }

    // -----------------------------------------
    // Estado del tracking de la cámara
    // -----------------------------------------

    world.events.addListener(
      world.events.globalId,
      ecs.events.REALITY_TRACKING_STATUS,
      (event: {data: unknown}) => {
        const {status} = event.data as {
          status: string
        }

        dataAttribute.cursor(eid).trackingReady =
          status === 'NORMAL'
      }
    )

    // -----------------------------------------
    // ESPERANDO TARGET
    // -----------------------------------------

    ecs.defineState('idle')
      .initial()

      .listen(
        world.events.globalId,
        ANIMAL_DETECTED_EVENT,
        (event: {data: unknown}) => {
          const {animal} = event.data as {
            animal: string
          }

          const current = dataAttribute.get(eid)

          // Ocultar modelo anterior
          if (current.placedModel) {
            hideModel(current.placedModel)
          }

          const cursor = dataAttribute.cursor(eid)

          cursor.pendingAnimal = animal
          cursor.placedModel = 0n

          animalRequested.trigger()
        }
      )

      .onTrigger(animalRequested, 'waitingForFloor')

    // -----------------------------------------
    // ESPERANDO SUPERFICIE
    // -----------------------------------------

    ecs.defineState('waitingForFloor')

      // Si se detecta otro target mientras
      // estamos buscando el piso, cambiar animal.
      .listen(
        world.events.globalId,
        ANIMAL_DETECTED_EVENT,
        (event: {data: unknown}) => {
          const {animal} = event.data as {
            animal: string
          }

          dataAttribute.cursor(eid).pendingAnimal =
            animal
        }
      )

      // Si se pierde el target
      .listen(
        world.events.globalId,
        ANIMAL_LOST_EVENT,
        () => {
          dataAttribute.cursor(eid).pendingAnimal = ''
          cancelled.trigger()
        }
      )

      // Buscar superficie constantemente
      .onTick(() => {
        const {trackingReady} = dataAttribute.get(eid)

        if (!trackingReady) {
          return
        }

        const s = schemaAttribute.get(eid)

        const cameraEid = world.camera.getActiveEid()

        if (!cameraEid) {
          return
        }

        if (!s.floorSurface) {
          return
        }

        const hits = world.raycastFrom(
          cameraEid,
          0,
          s.maxRaycastDistance || 8
        )

        const floorHit = hits.find(
          (hit) => hit.eid === s.floorSurface
        )

        if (!floorHit) {
          return
        }

        const {pendingAnimal} = dataAttribute.get(eid)

        const modelEid =
          getModelForAnimal(pendingAnimal)

        if (!modelEid) {
          return
        }

        // -----------------------------------------
        // COLOCAR MODELO
        // -----------------------------------------

        world.setPosition(
          modelEid,
          floorHit.point.x,
          floorHit.point.y,
          floorHit.point.z
        )

        ecs.Hidden.remove(world, modelEid)

        const cursor = dataAttribute.cursor(eid)

        cursor.placedModel = modelEid

        // Avisar al detector que el modelo
        // ya fue colocado.
        world.events.dispatch(
          world.events.globalId,
          MODEL_PLACED_EVENT,
          {
            animal: pendingAnimal,
          }
        )

        floorFound.trigger()
      })

      .onTrigger(floorFound, 'idle')
      .onTrigger(cancelled, 'idle')
  },
})