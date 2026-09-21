/**
 * zoo-surface-model-placer.ts
 *
 * SEGUNDO componente: solo se encarga de:
 *  1. Escuchar el evento "zoo:animalDetected" (emitido por
 *     zoo-image-target-detector.ts) para saber qué animal está pendiente.
 *  2. Mientras el mensaje está en pantalla, hacer raycast contra el piso
 *     (detección de superficie) buscando dónde colocar el modelo.
 *  3. En cuanto detecta el piso: posiciona ahí el modelo GLB del animal
 *     correspondiente, lo hace visible, y avisa con "zoo:modelPlaced"
 *     para que el otro componente oculte el mensaje.
 *
 * Este componente NO sabe nada de Image Targets: solo reacciona a los
 * eventos que le manda el otro archivo. Así quedan totalmente separados.
 *
 * Documentación oficial:
 * - world.raycastFrom / world.camera.getActiveEid / world.setPosition:
 *   https://8thwall.org/docs/api/studio/world
 * - Collider (para la entidad-piso, shape: Plane, type: Static):
 *   https://8thwall.org/docs/api/studio/ecs/collider
 * - Hidden (mostrar/ocultar modelos):
 *   https://8thwall.org/docs/api/studio/ecs/hidden
 * - Eventos personalizados (world.events.dispatch / addListener):
 *   https://8thwall.com/docs/studio/api/world/events/dispatch
 */

import * as ecs from '@8thwall/ecs'

// Deben coincidir EXACTAMENTE con los exportados en zoo-image-target-detector.ts
const ANIMAL_DETECTED_EVENT = 'zoo:animalDetected'
const ANIMAL_LOST_EVENT = 'zoo:animalLost'
const MODEL_PLACED_EVENT = 'zoo:modelPlaced'

ecs.registerComponent({
  name: 'zoo-surface-model-placer',

  schema: {
    // Entidades raíz de cada modelo GLB (ya existentes en la escena).
    osoModel: ecs.eid,
    ocelotModel: ecs.eid,
    guacamayaModel: ecs.eid,
    monoModel: ecs.eid,

    // Entidad invisible que representa el piso: plano grande en Y=0 con
    // un componente Collider (shape: Plane, type: Static).
    floorSurface: ecs.eid,

    // Distancia máxima (m) del raycast al buscar el piso.
    maxRaycastDistance: ecs.f32,
  },

  schemaDefaults: {
    maxRaycastDistance: 8,
  },

  data: {
    // Animal detectado, pendiente de colocar en el piso ('' = ninguno).
    pendingAnimal: ecs.string,
    // eid del modelo actualmente visible (0n = ninguno).
    placedModel: ecs.eid,
    // true cuando el tracking del piso ya está estable (status === NORMAL).
    // En modo 'absolute' esto tarda más porque el motor necesita que muevas
    // el celular para reunir información espacial antes de confiar en Y=0.
    trackingReady: ecs.boolean,
  },

  // Se ejecuta una sola vez, apenas se agrega el componente: oculta los
  // 4 modelos desde el primer frame, sin depender de configurar "Hidden"
  // manualmente en el Inspector.
  add: (world, component) => {
    const s = component.schemaAttribute.get(component.eid)
    ;[s.osoModel, s.ocelotModel, s.guacamayaModel, s.monoModel].forEach((modelEid) => {
      if (modelEid) ecs.Hidden.set(world, modelEid)
    })
  },

  stateMachine: ({world, eid, schemaAttribute, dataAttribute}) => {
    const animalRequested = ecs.defineTrigger()
    const floorFound = ecs.defineTrigger()
    const cancelled = ecs.defineTrigger()

    const getModelForAnimal = (animal: string): bigint => {
      const s = schemaAttribute.get(eid)
      if (animal === 'oso') return s.osoModel
      if (animal === 'ocelote') return s.ocelotModel
      if (animal === 'guacamaya') return s.guacamayaModel
      if (animal === 'mono') return s.monoModel
      return 0n
    }

    const hideModel = (modelEid: bigint) => {
      if (modelEid) ecs.Hidden.set(world, modelEid)
    }

    // Escucha global (fuera de los estados, corre siempre): guarda si el
    // tracking del piso ya está listo. En modo 'responsive' esto pasa casi
    // de inmediato; en modo 'absolute' tarda hasta que mueves el celular.
    world.events.addListener(world.events.globalId, ecs.events.REALITY_TRACKING_STATUS, (event: {data: unknown}) => {
      const {status} = event.data as {status: string}
      dataAttribute.cursor(eid).trackingReady = status === 'NORMAL'
    })

    // --- Estado 1: sin ningún infograma pendiente ---------------------
    ecs.defineState('idle')
      .initial()
      .listen(world.events.globalId, ANIMAL_DETECTED_EVENT, (event: {data: unknown}) => {
        const {animal} = event.data as {animal: string}

        // Si ya había un modelo visible de una visita anterior, lo ocultamos.
        const current = dataAttribute.get(eid)
        if (current.placedModel) hideModel(current.placedModel)

        const cursor = dataAttribute.cursor(eid)
        cursor.pendingAnimal = animal
        cursor.placedModel = 0n

        animalRequested.trigger()
      })
      .onTrigger(animalRequested, 'waitingForFloor')

    // --- Estado 2: buscando el piso para colocar el modelo -------------
    ecs.defineState('waitingForFloor')
      // Si aparece OTRO infograma mientras se busca el piso, se actualiza
      // el animal pendiente sin salir de este estado.
      .listen(world.events.globalId, ANIMAL_DETECTED_EVENT, (event: {data: unknown}) => {
        const {animal} = event.data as {animal: string}
        dataAttribute.cursor(eid).pendingAnimal = animal
      })
      // El visitante se alejó del infograma antes de detectar el piso.
      .listen(world.events.globalId, ANIMAL_LOST_EVENT, () => {
        dataAttribute.cursor(eid).pendingAnimal = ''
        cancelled.trigger()
      })
      .onTick(() => {
        // En modo 'absolute', no confiamos en el raycast hasta que el
        // tracking esté en NORMAL (es decir, hasta que el visitante haya
        // movido el celular lo suficiente). En 'responsive' esto es casi
        // instantáneo, así que no se nota demora real.
        const {trackingReady} = dataAttribute.get(eid)
        if (!trackingReady) return

        const s = schemaAttribute.get(eid)
        const cameraEid = world.camera.getActiveEid()
        if (!cameraEid || !s.floorSurface) return

        const hits = world.raycastFrom(cameraEid, 0, s.maxRaycastDistance || 8)
        const floorHit = hits.find((hit) => hit.eid === s.floorSurface)
        if (!floorHit) return // el visitante aún no apunta al piso

        const {pendingAnimal} = dataAttribute.get(eid)
        const modelEid = getModelForAnimal(pendingAnimal)
        if (!modelEid) return

        world.setPosition(modelEid, floorHit.point.x, floorHit.point.y, floorHit.point.z)
        ecs.Hidden.remove(world, modelEid)

        const cursor = dataAttribute.cursor(eid)
        cursor.placedModel = modelEid

        world.events.dispatch(world.events.globalId, MODEL_PLACED_EVENT, {})
        floorFound.trigger()
      })
      .onTrigger(floorFound, 'idle')
      .onTrigger(cancelled, 'idle')
  },
})