import * as ecs from '@8thwall/ecs'

export const PopupController = ecs.registerComponent({
  name: 'PopupController',

  schema: {
    popupText: ecs.string,
  },

  schemaDefaults: {
    popupText: 'Texto del popup',
  },

  add: (world, component) => {
    // Por ahora dejamos el Popup visible.
  },

  remove: (world, component) => {
    // No necesitamos hacer nada al eliminar el componente.
  },
})

