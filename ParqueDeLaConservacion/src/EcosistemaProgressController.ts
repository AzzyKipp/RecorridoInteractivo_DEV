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

      .onEnter(() => {

        const {ocelote} = schemaAttribute.get(eid)

        if (!ocelote) {
          return
        }

        // Ocultar Ocelote al comenzar
        ecs.Disabled.set(world, ocelote)
      })

      .listen(
        world.events.globalId,
        ecs.events.REALITY_IMAGE_FOUND,
        (event: any) => {

          const targetName = event.data.name

          if (targetName !== 'Ecosistema') {
            return
          }

          const {ocelote} = schemaAttribute.get(eid)

          if (!ocelote) {
            return
          }

          // Mostrar Ocelote al escanear Ecosistema
          ecs.Disabled.remove(world, ocelote)
        }
      )
  },
})

export {EcosistemaProgressController}