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

          // 🐆 POP: escala original → +0.05
          ecs.ScaleAnimation.set(world, eid, {
            fromX: originalScale.x,
            fromY: originalScale.y,
            fromZ: originalScale.z,

            toX: originalScale.x + 0.05,
            toY: originalScale.y + 0.05,
            toZ: originalScale.z + 0.05,

            duration: 180,
            loop: false,
            easeIn: false,
            easeOut: true,
            easingFunction: 'Back',
          })

          // Esperamos a que termine el aumento
          setTimeout(() => {

            // 🔄 Volver explícitamente a la escala original
            ecs.ScaleAnimation.set(world, eid, {
              fromX: originalScale.x + 0.05,
              fromY: originalScale.y + 0.05,
              fromZ: originalScale.z + 0.05,

              toX: originalScale.x,
              toY: originalScale.y,
              toZ: originalScale.z,

              duration: 180,
              loop: false,
              easeIn: true,
              easeOut: false,
              easingFunction: 'Cubic',
            })

          }, 180)
        }
      )
  },
})

export {AnimalPop}
