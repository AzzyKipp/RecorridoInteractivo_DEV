import * as ecs from '@8thwall/ecs'

const ANIMAL_DETECTED_EVENT = 'zoo:animalDetected'
const MODEL_PLACED_EVENT = 'zoo:modelPlaced'
const FLOOR_STATUS_EVENT = 'zoo:floorStatus'

ecs.registerComponent({
  name: 'zoo-surface-model-placer',

  schema: {
    // -----------------------------------------
    // MODELOS
    // -----------------------------------------

    osoModel: ecs.eid,
    ocelotModel: ecs.eid,
    guacamayaModel: ecs.eid,
    monoModel: ecs.eid,

    // -----------------------------------------
    // SUPERFICIE
    // -----------------------------------------

    floorSurface: ecs.eid,

    // -----------------------------------------
    // DISTANCIA DEL RAYCAST
    // -----------------------------------------

    maxRaycastDistance: ecs.f32,
  },

  schemaDefaults: {
    maxRaycastDistance: 8,
  },

  data: {
    // Animal seleccionado por Image Target
    pendingAnimal: ecs.string,

    // Modelo actualmente colocado
    placedModel: ecs.eid,

    // Estado del World Tracking
    trackingReady: ecs.boolean,

    // Piso detectado
    floorReady: ecs.boolean,
  },

  // ==================================================
  // ADD
  // ==================================================

  add: (world, component) => {

    const s =
      component.schemaAttribute.get(component.eid)

    // Ocultar modelos al comenzar
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

  // ==================================================
  // STATE MACHINE
  // ==================================================

  stateMachine: ({
    world,
    eid,
    schemaAttribute,
    dataAttribute,
  }) => {

    // ==================================================
    // OBTENER MODELO SEGÚN ANIMAL
    // ==================================================

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

    // ==================================================
    // OCULTAR MODELO
    // ==================================================

    const hideModel =
      (modelEid: bigint) => {

        if (modelEid) {
          ecs.Hidden.set(world, modelEid)
        }
      }

    // ==================================================
    // WORLD TRACKING
    // ==================================================

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
          '[surface] WORLD TRACKING:',
          data.status
        )
      }
    )

    // ==================================================
    // IMAGE TARGET → SELECCIONAR ANIMAL
    // ==================================================

    world.events.addListener(
      world.events.globalId,
      ANIMAL_DETECTED_EVENT,
      (event: {data: unknown}) => {

        const data = event.data as {
          animal?: string
        }

        const animal =
          data.animal ?? ''

        if (!animal) {
          return
        }

        console.log(
          '[surface] ANIMAL SELECCIONADO:',
          animal
        )

        const current =
          dataAttribute.get(eid)

        // Ocultar modelo anterior
        if (current.placedModel) {
          hideModel(current.placedModel)
        }

        const cursor =
          dataAttribute.cursor(eid)

        cursor.pendingAnimal =
          animal

        cursor.placedModel =
          0n
      }
    )

    // ==================================================
    // DETECCIÓN CONTINUA DEL PISO
    // ==================================================

    ecs.defineState('trackingFloor')
      .initial()

      .onTick(() => {

        const current =
          dataAttribute.get(eid)

        const s =
          schemaAttribute.get(eid)

        // ----------------------------------------------
        // WORLD TRACKING TODAVÍA NO ESTÁ LISTO
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
        // CÁMARA
        // ----------------------------------------------

        const cameraEid =
          world.camera.getActiveEid()

        if (!cameraEid) {
          return
        }

        // ----------------------------------------------
        // FLOOR SURFACE
        // ----------------------------------------------

        if (!s.floorSurface) {
          return
        }

        // ----------------------------------------------
        // RAYCAST PARA SABER SI HAY PISO
        // ----------------------------------------------

        const hits =
          world.raycastFrom(
            cameraEid,
            0,
            s.maxRaycastDistance || 8
          )

        const floorHit =
          hits.find(
            (hit) =>
              hit.eid === s.floorSurface
          )

        const found =
          !!floorHit

        // ----------------------------------------------
        // CAMBIO DEL ESTADO
        // ----------------------------------------------

        if (
          found !==
          current.floorReady
        ) {

          dataAttribute.cursor(eid).floorReady =
            found

          console.log(
            '[surface] FLOOR:',
            found
              ? 'READY ✓'
              : 'NOT FOUND'
          )

          world.events.dispatch(
            world.events.globalId,
            FLOOR_STATUS_EVENT,
            {
              ready: found,
              tracking: 'NORMAL',
            }
          )
        }
      })

      // ==================================================
      // TAP NATIVO SOBRE EL CANVAS
      // ==================================================

      .onEnter(() => {

        const {
          renderer,
          activeCamera,
        } = world.three

        const canvas =
          renderer.domElement

        // ----------------------------------------------
        // FUNCIÓN DEL TAP
        // ----------------------------------------------

        const handleTouch =
          (event: TouchEvent) => {

            const current =
              dataAttribute.get(eid)

            // ------------------------------------------
            // DEBUG
            // ------------------------------------------

            console.log(
              '[surface]  TOUCH DETECTADO'
            )

            // ------------------------------------------
            // ¿TENEMOS ANIMAL?
            // ------------------------------------------

            if (!current.pendingAnimal) {

              console.log(
                '[surface]  TOUCH IGNORADO: ' +
                'no hay animal'
              )

              return
            }

            // ------------------------------------------
            // ¿TENEMOS PISO?
            // ------------------------------------------

            if (!current.floorReady) {

              console.log(
                '[surface]  TOUCH IGNORADO: ' +
                'no hay piso'
              )

              return
            }

            // ------------------------------------------
            // ¿YA HAY MODELO?
            // ------------------------------------------

            if (current.placedModel) {

              console.log(
                '[surface] TOUCH IGNORADO: ' +
                'modelo ya colocado'
              )

              return
            }

            // ------------------------------------------
            // PRIMER TOUCH
            // ------------------------------------------

            const touch =
              event.touches[0]

            if (!touch) {
              return
            }

            // ------------------------------------------
            // RECT DEL CANVAS
            // ------------------------------------------

            const rect =
              canvas.getBoundingClientRect()

            // ------------------------------------------
            // NORMALIZED DEVICE COORDINATES
            // ------------------------------------------

            const x =
              ((touch.clientX - rect.left) /
                rect.width) * 2 - 1

            const y =
              -(
                (touch.clientY - rect.top) /
                rect.height
              ) * 2 + 1

            console.log(
              '[surface] TOUCH NDC:',
              x,
              y
            )

            // ------------------------------------------
            // THREE
            // ------------------------------------------

            const THREE =
              (window as any).THREE

            if (!THREE) {

              console.error(
                '[surface]  THREE no disponible'
              )

              return
            }

            // ------------------------------------------
            // RAYCASTER
            // ------------------------------------------

            const raycaster =
              new THREE.Raycaster()

            const mouse =
              new THREE.Vector2(
                x,
                y
              )

            // ------------------------------------------
            // ACTUALIZAR CÁMARA
            // ------------------------------------------

            activeCamera.updateMatrixWorld()

            raycaster.setFromCamera(
              mouse,
              activeCamera
            )

            // ------------------------------------------
            // INTERSECCIÓN CON EL PISO Y = 0
            // ------------------------------------------

            const floorPlane =
              new THREE.Plane(
                new THREE.Vector3(
                  0,
                  1,
                  0
                ),
                0
              )

            const hitPoint =
              new THREE.Vector3()

            const intersection =
              raycaster.ray.intersectPlane(
                floorPlane,
                hitPoint
              )

            // ------------------------------------------
            // NO INTERSECCIÓN
            // ------------------------------------------

            if (!intersection) {

              console.log(
                '[surface] El tap no intersectó ' +
                'con el plano del piso.'
              )

              return
            }

            // ------------------------------------------
            // ASEGURAR QUE EL PUNTO ESTÉ DELANTE
            // DE LA CÁMARA
            // ------------------------------------------

            const distance =
              raycaster.ray.origin.distanceTo(
                hitPoint
              )

            if (distance <= 0) {

              console.log(
                '[surface] Punto inválido'
              )

              return
            }

            console.log(
              '[surface]  TAP POSITION:',
              hitPoint.x,
              hitPoint.y,
              hitPoint.z
            )

            // ------------------------------------------
            // MODELO
            // ------------------------------------------

            const modelEid =
              getModelForAnimal(
                current.pendingAnimal
              )

            if (!modelEid) {

              console.error(
                '[surface] No existe modelo para:',
                current.pendingAnimal
              )

              return
            }

            // ------------------------------------------
            // COLOCAR
            // ------------------------------------------

            world.setPosition(
              modelEid,
              hitPoint.x,
              hitPoint.y,
              hitPoint.z
            )

            // ------------------------------------------
            // MOSTRAR
            // ------------------------------------------

            ecs.Hidden.remove(
              world,
              modelEid
            )

            // ------------------------------------------
            // GUARDAR
            // ------------------------------------------

            dataAttribute.cursor(eid).placedModel =
              modelEid

            // ------------------------------------------
            // AVISAR
            // ------------------------------------------

            world.events.dispatch(
              world.events.globalId,
              MODEL_PLACED_EVENT,
              {
                animal:
                  current.pendingAnimal,

                position: {
                  x: hitPoint.x,
                  y: hitPoint.y,
                  z: hitPoint.z,
                },
              }
            )

            console.log(
              '[surface]  MODELO COLOCADO:',
              current.pendingAnimal
            )

            // ------------------------------------------
            // QUITAR LISTENER
            // ------------------------------------------

            canvas.removeEventListener(
              'touchstart',
              handleTouch
            )
          }

        // ----------------------------------------------
        // ESCUCHAR TOUCH
        // ----------------------------------------------

        canvas.addEventListener(
          'touchstart',
          handleTouch,
          {
            passive: true,
            capture: true,
          }
        )

        console.log(
          '[surface] Touch listener ACTIVADO'
        )
      })
  },
})