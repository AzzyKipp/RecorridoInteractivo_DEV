import * as ecs from '@8thwall/ecs'

const SLAMTargetController = ecs.registerComponent({
  name: 'SLAMTargetController',

  schema: {
    camera: ecs.eid,
  },

  stateMachine: ({world, eid, schemaAttribute}) => {

    const targetsWithSLAMDisabled = new Set([
      'O_Lamina',
      'OA_Lamina',
      'MA_Lamina',
      'G_Lamina',
    ])

    const targetsWithSLAMEnabled = new Set([
      'Aullador_Target',
      'Anteojos_Target',
      'Ocelote_Target',
      'Guacamaya_Target',
    ])

    ecs.defineState('default')
      .initial()

      .listen(
        world.events.globalId,
        ecs.events.REALITY_IMAGE_FOUND,
        (event: {data: unknown}) => {

          const data = event.data as {
            name?: string
          }

          if (!data.name) {
            return
          }

          const cameraEid =
            schemaAttribute.get(eid).camera

          if (!cameraEid) {
            return
          }

          if (targetsWithSLAMDisabled.has(data.name)) {
            ecs.Camera.mutate(world, cameraEid, (cursor) => {
              cursor.disableWorldTracking = true
              return false
            })

            console.log(
              `SLAMTargetController → SLAM DESACTIVADO por ${data.name}`
            )
          }

          if (targetsWithSLAMEnabled.has(data.name)) {
            ecs.Camera.mutate(world, cameraEid, (cursor) => {
              cursor.disableWorldTracking = false
              return false
            })

            console.log(
              `SLAMTargetController → SLAM ACTIVADO por ${data.name}`
            )
          }
        }
      )
  },
})

export {SLAMTargetController}