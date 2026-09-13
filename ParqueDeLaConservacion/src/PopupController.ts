import * as ecs from '@8thwall/ecs'

export const PopupController = ecs.registerComponent({
  name: 'PopupController',

  schema: {
    closeButton: ecs.eid,
  },

  stateMachine: ({world, eid, schemaAttribute}) => {
    const {closeButton} = schemaAttribute.get(eid)

    ecs.defineState('default')
      .initial()
      .listen(closeButton, ecs.input.UI_CLICK, () => {
        console.log('🔴 CLOSE BUTTON → CERRANDO POPUP')

        world.getEntity(eid).disable()

        console.log('🟣 POPUP DESACTIVADO')
      })
  },
})