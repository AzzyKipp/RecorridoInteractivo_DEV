import * as ecs from '@8thwall/ecs'

const AnimalPop = ecs.registerComponent({
  name: 'Animal Pop',

  stateMachine: ({world, eid}) => {

    let hasPopped = false

    // Guardamos la escala ORIGINAL del modelo
    const originalScale = ecs.Scale.get(world, eid)

    ecs.defineState('waiting')
      .initial()
      .listen(
        world.events.globalId,
        ecs.events.REALITY_IMAGE_FOUND,
        (event: any) => {

          if (hasPopped) {
            return
          }

          // Este componente se pondrá sobre el modelo
          // y aquí comprobamos qué target fue encontrado.
          const targetName = event.data.name

          if (targetName !== 'O_Lamina') {
            return
          }

          hasPopped = true

          // 🐆 POP: escala original → 115%
          ecs.ScaleAnimation.set(world, eid, {
            fromX: originalScale.x,
            fromY: originalScale.y,
            fromZ: originalScale.z,

            toX: originalScale.x * 1.15,
            toY: originalScale.y * 1.15,
            toZ: originalScale.z * 1.15,

            duration: 180,
            loop: false,
            reverse: true,
            easeIn: false,
            easeOut: true,
            easingFunction: 'Back',
          })
        }
      )
  },
})

export {AnimalPop}
