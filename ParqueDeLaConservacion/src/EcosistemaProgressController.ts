
import * as ecs from '@8thwall/ecs'

const EcosistemaProgressController = ecs.registerComponent({
  name: 'Ecosistema Progress Controller',

  schema: {
    progreso: ecs.eid,
  },

  stateMachine: ({world, eid, schemaAttribute}) => {

    const requiredTargets = new Set([
      'O_Lamina',
      'OA_Lamina',
      'MA_Lamina',
      'G_Lamina',
    ])

    const discoveredTargets = new Set<string>()

    ecs.defineState('default')
      .initial()

      .listen(
        world.events.globalId,
        ecs.events.REALITY_IMAGE_FOUND,
        (event: any) => {

          const targetName = event.data.name

          // Ignorar cualquier target que no sea una de las 4 láminas
          if (!requiredTargets.has(targetName)) {
            return
          }

          // Evitar repetir una lámina
          if (discoveredTargets.has(targetName)) {
            return
          }

          discoveredTargets.add(targetName)

          // Por ahora solo mostramos en el debug visual
          console.log(
            `Ecosistema Progress: ${targetName} encontrado`
          )
        }
      )
  },
})

export {EcosistemaProgressController}
