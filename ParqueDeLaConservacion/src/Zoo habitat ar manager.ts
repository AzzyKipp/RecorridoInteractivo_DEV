/**
 * zoo-habitat-ar-manager.ts
 *
 * Componente personalizado para 8th Wall Studio (ECS + TypeScript).
 * Recorrido AR del Parque de la Conservación de Medellín: 4 hábitats
 * (Oso, Ocelote, Guacamaya, Mono), cada uno activado por su infograma.
 *
 * Flujo:
 *  1. SCANNING       -> se escanea uno de los 4 Image Targets (infogramas).
 *  2. WAITING_FLOOR  -> se muestra un mensaje pidiendo alejarse y apuntar
 *                       al piso; se hace raycast contra una superficie
 *                       (Collider tipo Plane a Y=0) para detectar el suelo.
 *  3. ANIMAL_PLACED  -> se coloca y muestra el modelo GLB del animal en el
 *                       punto del piso detectado. El modelo queda anclado
 *                       al mundo (no al infograma), así el visitante puede
 *                       alejar la cámara del infograma sin que desaparezca.
 *
 * Documentación oficial usada como base:
 * - Eventos de Image Target (REALITY_IMAGE_FOUND / REALITY_IMAGE_LOST):
 *   https://8thwall.org/docs/api/studio/events/xr/image-targets
 * - World Effects (piso = Y 0 relativo a la cámara):
 *   https://8thwall.org/docs/studio/guides/xr/world
 * - API de world (raycastFrom, setPosition, camera.getActiveEid, etc.):
 *   https://8thwall.org/docs/api/studio/world
 * - Componente Collider (para la superficie de detección):
 *   https://8thwall.org/docs/api/studio/ecs/collider
 * - Componente Hidden (mostrar/ocultar modelos):
 *   https://8thwall.org/docs/api/studio/ecs/hidden
 * - Componente Ui (mensaje en pantalla):
 *   https://8thwall.org/docs/api/studio/ecs/ui
 * - Entities / Events / Prefabs guides:
 *   https://8thwall.org/docs/studio/guides/entities
 *   https://8thwall.org/docs/studio/guides/events
 *   https://8thwall.org/docs/studio/guides/prefabs
 */

import * as ecs from '@8thwall/ecs'

// Nombre exacto de cada Image Target (infograma) -> clave del animal.
// Ajusta estos strings si en tu proyecto los nombres de los Image Targets
// no coinciden exactamente con los nombres de archivo.
type AnimalKey = 'oso' | 'ocelote' | 'guacamaya' | 'mono'

const ANIMAL_BY_IMAGE_NAME: Record<string, AnimalKey> = {
  InfogramaOso: 'oso',
  InfogramaOcelote: 'ocelote',
  InfogramaGuacayama: 'guacamaya',
  InfogramaMono: 'mono',
}

const INSTRUCTION_MESSAGE =
  'Aléjate un poco del infograma y apunta la cámara hacia el piso para descubrir al animal 🐾'

ecs.registerComponent({
  name: 'zoo-habitat-ar-manager',

  schema: {
    // Entidades raíz de cada modelo GLB. Deben existir ya en la escena,
    // cada una con el componente "Hidden" agregado desde el Inspector
    // (así arrancan invisibles hasta que se detecte su infograma + piso).
    osoModel: ecs.eid,
    ocelotModel: ecs.eid,
    guacamayaModel: ecs.eid,
    monoModel: ecs.eid,

    // Entidad invisible que representa el piso: un plano grande en Y=0
    // con un componente Collider (shape: Plane, type: Static). Contra
    // esta entidad se hace el raycast que simula la "detección de
    // superficie".
    floorSurface: ecs.eid,

    // Entidad con componente Ui (type: 'overlay') para el mensaje.
    instructionUi: ecs.eid,

    // Distancia máxima (m) del raycast al buscar el piso.
    maxRaycastDistance: ecs.f32,
  },

  schemaDefaults: {
    maxRaycastDistance: 8,
  },

  data: {
    // Animal detectado en el infograma actual, pendiente de colocar.
    pendingAnimal: ecs.string,
    // eid del modelo actualmente visible en la escena (0 = ninguno).
    placedModel: ecs.eid,
  },

  stateMachine: ({world, eid, schemaAttribute, dataAttribute}) => {
    const imageFoundFromScanning = ecs.defineTrigger()
    const imageFoundFromPlaced = ecs.defineTrigger()
    const floorDetected = ecs.defineTrigger()
    const trackingLost = ecs.defineTrigger()

    // OJO: los eid en 8th Wall Studio son de tipo `bigint`, no `number`.
    const getModelForAnimal = (animal: string): bigint => {
      const s = schemaAttribute.get(eid)
      if (animal === 'oso') return s.osoModel
      if (animal === 'ocelote') return s.ocelotModel
      if (animal === 'guacamaya') return s.guacamayaModel
      if (animal === 'mono') return s.monoModel
      return 0n
    }

    const hideModel = (modelEid: bigint) => {
      if (modelEid) {
        ecs.Hidden.set(world, modelEid)
      }
    }

    // Oculta los 4 modelos de una sola vez. Se llama al arrancar la
    // experiencia y cada vez que volvemos al estado "scanning", para
    // garantizar que ningún animal se vea hasta que se lea su infograma.
    const hideAllModels = () => {
      const s = schemaAttribute.get(eid)
      hideModel(s.osoModel)
      hideModel(s.ocelotModel)
      hideModel(s.guacamayaModel)
      hideModel(s.monoModel)
    }

    const showInstruction = (visible: boolean) => {
      const {instructionUi} = schemaAttribute.get(eid)
      if (!instructionUi) return
      ecs.Ui.mutate(world, instructionUi, (cursor) => {
        cursor.text = INSTRUCTION_MESSAGE
        cursor.display = visible ? 'flex' : 'none'
        return false
      })
    }

    // Maneja la llegada de un REALITY_IMAGE_FOUND cuando el visitante
    // apunta a uno de los 4 infogramas.
    const handleImageFound = (trigger: ReturnType<typeof ecs.defineTrigger>) =>
      // No tipamos el parámetro explícitamente: el listener llega como
      // QueuedEvent<unknown>, así que leemos event.data con un cast interno.
      (event: {data: unknown}) => {
        const data = event.data as {name: string}
        const animal = ANIMAL_BY_IMAGE_NAME[data.name]
        if (!animal) return // no es uno de nuestros 4 infogramas

        // Si ya había un animal visible, lo ocultamos antes de pasar al nuevo.
        const current = dataAttribute.get(eid)
        if (current.placedModel) {
          hideModel(current.placedModel)
        }

        const cursor = dataAttribute.cursor(eid)
        cursor.pendingAnimal = animal
        cursor.placedModel = 0n

        trigger.trigger()
      }

    // --- Estado 1: SCANNING -----------------------------------------
    ecs.defineState('scanning')
      .initial()
      .onEnter(() => {
        showInstruction(false)
        hideAllModels()
      })
      .listen(world.events.globalId, ecs.events.REALITY_IMAGE_FOUND, handleImageFound(imageFoundFromScanning))
      .onTrigger(imageFoundFromScanning, 'waitingForFloor')

    // --- Estado 2: WAITING_FOR_FLOOR ---------------------------------
    ecs.defineState('waitingForFloor')
      .onEnter(() => {
        showInstruction(true)
      })
      .onExit(() => {
        showInstruction(false)
      })
      .listen(world.events.globalId, ecs.events.REALITY_IMAGE_LOST, (event: {data: unknown}) => {
        const data = event.data as {name: string}
        const {pendingAnimal} = dataAttribute.get(eid)
        if (ANIMAL_BY_IMAGE_NAME[data.name] === pendingAnimal) {
          trackingLost.trigger()
        }
      })
      .onTick(() => {
        const s = schemaAttribute.get(eid)
        const cameraEid = world.camera.getActiveEid()
        if (!cameraEid || !s.floorSurface) return

        // "Detección de plano/superficie": raycast desde la cámara hacia
        // adelante contra la entidad-piso (Collider tipo Plane en Y=0).
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

        floorDetected.trigger()
      })
      .onTrigger(trackingLost, 'scanning')
      .onTrigger(floorDetected, 'animalPlaced')

    // --- Estado 3: ANIMAL_PLACED -------------------------------------
    ecs.defineState('animalPlaced')
      .listen(world.events.globalId, ecs.events.REALITY_IMAGE_FOUND, handleImageFound(imageFoundFromPlaced))
      .onTrigger(imageFoundFromPlaced, 'waitingForFloor')
  },
})