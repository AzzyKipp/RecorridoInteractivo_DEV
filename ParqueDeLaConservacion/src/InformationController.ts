import * as ecs from '@8thwall/ecs'

export const InformationController = ecs.registerComponent({
  name: 'InformationController',

schema: {
  popup: ecs.eid,
  popupText: ecs.eid,
  text: ecs.string,
},

  stateMachine: ({world, eid, schemaAttribute}) => {
    ecs.defineState('default')
      .initial()
 .listen(eid, ecs.input.UI_CLICK, () => {
  const {popup, popupText, text} = schemaAttribute.get(eid)

  console.log('🔵 INFORMATION FUNCIONA')

  if (popupText) {
    ecs.Ui.mutate(world, popupText, (cursor) => {
      cursor.text = text
      return false
    })

    console.log('📝 TEXTO CAMBIADO')
  }

  if (popup) {
    world.getEntity(popup).enable()

    console.log('🟢 POPUP ABIERTO')
  }
})
  },
})