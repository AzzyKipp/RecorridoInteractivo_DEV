import * as ecs from '@8thwall/ecs'

const EcosistemaVisibility = ecs.registerComponent({
  name: 'Ecosistema Visibility',

  stateMachine: ({world, eid}) => {

    // ─────────────────────────────
    // ECOSISTEMA EMPIEZA OCULTO
    // ─────────────────────────────

    ecs.Hidden.set(world, eid)

    // ─────────────────────────────
    // ESPERAR DESBLOQUEO
    // ─────────────────────────────

    ecs.defineState('default')
      .initial()
      .listen(
        world.events.globalId,
        'ECOSISTEMA_DESBLOQUEADO',
        () => {

          // Mostrar Ecosistema
          ecs.Hidden.remove(world, eid)

          console.log('🌿 ¡ECOSISTEMA DESBLOQUEADO!')
        }
      )
  },
})

export {EcosistemaVisibility}