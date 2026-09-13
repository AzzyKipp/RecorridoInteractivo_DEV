import * as ecs from '@8thwall/ecs'

export const InformationController = ecs.registerComponent({
  name: 'InformationController',

  schema: {
    popup: ecs.eid,
  },

  stateMachine: ({world, eid, schemaAttribute}) => {
    ecs.defineState('default')
      .initial()
      .listen(eid, ecs.input.UI_CLICK, () => {
        const {popup} = schemaAttribute.get(eid)

        console.log('🔵 INFORMATION FUNCIONA')

        if (popup) {
          ecs.Hidden.remove(world, popup)

          console.log('🟢 POPUP ABIERTO')
        }
      })
  },
})
