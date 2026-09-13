import * as ecs from '@8thwall/ecs'

export const PopupController = ecs.registerComponent({
  name: 'PopupController',

  stateMachine: ({world, eid}) => {
    ecs.defineState('default')
      .initial()
      .listen(eid, ecs.input.UI_CLICK, () => {
        console.log('🟣 CLICK RECIBIDO POR POPUP')

        ecs.Hidden.set(world, eid)

        console.log('🟢 POPUP OCULTADO')
      })
  },
})

