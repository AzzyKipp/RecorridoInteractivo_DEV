import * as ecs from '@8thwall/ecs'

ecs.registerComponent({
  name: 'ExternalURLController',

  schema: {
    url: ecs.string,
  },

  stateMachine: ({world, eid, schemaAttribute}) => {
    const {url} = schemaAttribute.get(eid)

    ecs.defineState('default')
      .initial()
      .listen(world.events.globalId, ecs.input.SCREEN_TOUCH_START, (event) => {
        console.log('👆 TOUCH')
        console.log('🎯 TARGET:', event.target)

        if (event.target === eid) {
          console.log('🔥 MODELO TOCADO:', eid)
          console.log('🔗 URL:', url)

          window.open(url, '_blank', 'noopener,noreferrer')
        }
      })
  },
})