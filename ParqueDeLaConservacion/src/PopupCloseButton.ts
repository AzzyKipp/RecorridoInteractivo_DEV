import * as ecs from '@8thwall/ecs'

export const PopupCloseButton = ecs.registerComponent({
  name: 'PopupCloseButton',

  schema: {
    // @label Popup
    popup: ecs.eid,
  },

  stateMachine: ({world, eid, schemaAttribute}) => {
    ecs.defineState('default')
      .initial()
      .listen(eid, ecs.input.UI_CLICK, () => {
        const {popup} = schemaAttribute.get(eid)

        if (popup) {
          ecs.Hidden.set(world, popup)
        }
      })
  },
})