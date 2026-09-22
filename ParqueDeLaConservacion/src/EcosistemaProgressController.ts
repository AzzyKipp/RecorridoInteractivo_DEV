import * as ecs from '@8thwall/ecs'

const EcosistemaProgressController = ecs.registerComponent({
  name: 'Ecosistema Progress Controller',

  schema: {
    progreso: ecs.eid,
    ocelote: ecs.eid,
  },

  stateMachine: ({world, eid, schemaAttribute}) => {

    ecs.defineState('default')
      .initial()

      .listen(
        world.events.globalId,
        ecs.events.GLTF_MODEL_LOADED,
        (event: any) => {

          const {ocelote} = schemaAttribute.get(eid)

          if (!ocelote) {
            return
          }

          const model = world.three.entityToObject.get(ocelote)

          if (!model) {
            return
          }

          model.traverse((child: any) => {

            if (child.isMesh && child.material) {

              const materials = Array.isArray(child.material)
                ? child.material
                : [child.material]

              materials.forEach((material: any) => {
                material.transparent = true
                material.opacity = 0.25
              })
            }
          })
        }
      )
  },
})

export {EcosistemaProgressController}
