
import * as ecs from '@8thwall/ecs'

const AnimalPop = ecs.registerComponent({
  name: 'Animal Pop',

  stateMachine: ({world, eid}) => {

    let hasPopped = false

    // Guardamos los valores numéricos de la escala ORIGINAL
    const scale = ecs.Scale.get(world, eid)

    const originalX = scale.x
    const originalY = scale.y
    const originalZ = scale.z

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
            fromX: originalX,
            fromY: originalY,
            fromZ: originalZ,

            toX: originalX + 0.005,
            toY: originalY + 0.005,
            toZ: originalZ + 0.005,

            duration: 180,
            loop: false,
            easeIn: false,
            easeOut: true,
            easingFunction: 'Back',
          })

          // 🔄 Volver a la escala original
          setTimeout(() => {
            ecs.Scale.set(world, eid, {
              x: originalX,
              y: originalY,
              z: originalZ,
            })
          }, 180)
        }
      )
  },
})

export {AnimalPop}
