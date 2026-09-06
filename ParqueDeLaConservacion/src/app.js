const onxrloaded = () => {
  XR8.XrController.configure({
    imageTargetData: [
      require('../image-targets/Mapa_Target.json'),
      require('../image-targets/Ocelote_Target.json'),
      require('../image-targets/Anteojos_Target.json'),
      require('../image-targets/Aullador_Target.json'),
      require('../image-targets/Guacamaya_Target.json'),
      require('../image-targets/G_Target.json'),
      require('../image-targets/O_Target.json'),
      require('../image-targets/OA_Target.json'),
      require('../image-targets/MA_Target.json'),
      require('../image-targets/G_Lamina.json'),
      require('../image-targets/O_Lamina.json'),
      require('../image-targets/OA_Lamina.json'),
      require('../image-targets/MA_Lamina.json'),

    ],
  })
}
window.XR8 ? onxrloaded() : window.addEventListener('xrloaded', onxrloaded)