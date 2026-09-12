import * as ecs from '@8thwall/ecs'

const AnimalPop = ecs.registerComponent({
  name: 'Animal Pop',

  stateMachine: ({world, eid}) => {

    let hasPopped = false

    // Guardamos la escala original del modelo
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

          const targetName = event.data.name

          if (targetName !== 'O_Lamina') {
            return
          }

          hasPopped = true

          // 🐆 Aumentar 5%
          ecs.ScaleAnimation.set(world, eid, {
            fromX: originalScale.x,
            fromY: originalScale.y,
            fromZ: originalScale.z,

            toX: originalScale.x * 1.05,
            toY: originalScale.y * 1.05,
            toZ: originalScale.z * 1.05,

            duration: 150,
            loop: false,
            easeIn: false,
            easeOut: true,
            easingFunction: 'EaseOut',
          })

          // Después volvemos a la escala ORIGINAL
          setTimeout(() => {
            ecs.ScaleAnimation.set(world, eid, {
              fromX: originalScale.x * 1.05,
              fromY: originalScale.y * 1.05,
              fromZ: originalScale.z * 1.05,

              toX: originalScale.x,
              toY: originalScale.y,
              toZ: originalScale.z,

              duration: 150,
              loop: false,
              easeIn: true,
              easeOut: false,
              easingFunction: 'EaseIn',
            })
          }, 150)
        }
      )
  },
})

export {AnimalPop}
