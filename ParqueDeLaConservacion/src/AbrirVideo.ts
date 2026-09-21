import * as ecs from '@8thwall/ecs'

ecs.registerComponent({
  name: 'AbrirVideo',

  schema: {
    url: ecs.string,
  },

  stateMachine: ({world, eid, schemaAttribute}) => {
    const {url} = schemaAttribute.get(eid)

    ecs.defineState('default')
      .initial()
      .listen(eid, ecs.input.SCREEN_TOUCH_START, () => {
        console.log('Icono tocado:', eid)

        if (url) {
          window.open(url, '_blank')
        }
      })
  },
})