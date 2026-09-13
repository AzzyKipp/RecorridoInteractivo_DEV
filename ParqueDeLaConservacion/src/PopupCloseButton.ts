import * as ecs from '@8thwall/ecs'

export const PopupCloseButton = ecs.registerComponent({
  name: 'PopupCloseButton',

  stateMachine: ({world, eid}) => {
    ecs.defineState('default')
      .initial()
      .listen(eid, ecs.input.UI_CLICK, () => {
        console.log('🔴 CLOSE BUTTON FUNCIONA')

        ecs.Hidden.set(world, eid)

        console.log('🟢 HIDDEN APLICADO')
      })
  },
})

