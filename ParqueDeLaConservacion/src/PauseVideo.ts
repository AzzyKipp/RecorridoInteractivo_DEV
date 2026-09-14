import * as ecs from '@8thwall/ecs'

const PauseVideo = ecs.registerComponent({
  name: 'Pause Video',

  schema: {
    videoEntity: ecs.eid,
    pauseIcon: ecs.eid,
    playIcon: ecs.eid,
  },

  add: (world, component) => {
    const {videoEntity, pauseIcon, playIcon} =
      component.schemaAttribute.get(component.eid)

    // Sincronizar los iconos al iniciar
    if (videoEntity && ecs.VideoControls.has(world, videoEntity)) {
      const video = ecs.VideoControls.get(world, videoEntity)

      if (video) {
        if (video.paused) {
          if (pauseIcon) ecs.Hidden.set(world, pauseIcon)
          if (playIcon) ecs.Hidden.remove(world, playIcon)
        } else {
          if (pauseIcon) ecs.Hidden.remove(world, pauseIcon)
          if (playIcon) ecs.Hidden.set(world, playIcon)
        }
      }
    }

    // Click / tap en el botón
    world.events.addListener(component.eid, ecs.input.UI_CLICK, () => {
      const {
        videoEntity,
        pauseIcon,
        playIcon,
      } = component.schemaAttribute.get(component.eid)

      if (!videoEntity) {
        console.warn('Pause Video: No se ha asignado el video.')
        return
      }

      if (!ecs.VideoControls.has(world, videoEntity)) {
        console.warn(
          'Pause Video: La entidad asignada no tiene VideoControls.'
        )
        return
      }

      const video = ecs.VideoControls.get(world, videoEntity)

      if (!video) return

      const newPausedState = !video.paused

      // Cambiar estado del video
      ecs.VideoControls.mutate(world, videoEntity, (controls) => {
        controls.paused = newPausedState
        return false
      })

      // Actualizar iconos
      if (newPausedState) {
        // Video pausado → mostrar PLAY
        if (pauseIcon) ecs.Hidden.set(world, pauseIcon)
        if (playIcon) ecs.Hidden.remove(world, playIcon)
      } else {
        // Video reproduciendo → mostrar PAUSA
        if (pauseIcon) ecs.Hidden.remove(world, pauseIcon)
        if (playIcon) ecs.Hidden.set(world, playIcon)
      }
    })
  },
})

export {PauseVideo}