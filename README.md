# United Gangs

Juego de conducción 2D para navegador, con una campaña local y modo libre en solitario o cooperativo para dos jugadores. No necesita un proceso de compilación.

## Cómo jugar

- **Historia local:** elige Puerto Umbral, Costa Candela, Sierra Eléctrica o Ciudad Prisma. Las seis misiones de cada mapa se pueden jugar en cualquier orden. Después de completar las 24, se desbloquea **Bandas unidas**, la única misión de Miami. Cada tramo final tiene un límite de tiempo y en Miami también hay un límite total de 8 minutos.
- **Modo libre:** recorre un mundo de sectores procedurales que mezcla puerto, costa, sierra, el centro de Prisma y un distrito Art Déco inspirado en Miami. Usa M para marcar una salida y cruza su flecha para llegar al siguiente sector sin pasar por el menú. Pulsa J o **Encargo** para pedir una secundaria. Si sales del sector de una misión, el GPS te indica cómo volver.
- **Cooperativo online:** uno pulsa **Crear sala** y comparte el código de ocho caracteres. El otro lo introduce en **Unirme**. El anfitrión elige dónde empezar y cualquiera puede pedir encargos. Los dos conducen su propio coche y conservan su inventario. Para cruzar una salida, los dos jugadores deben estar cerca de ella. La campaña no se juega online.
- **Controles:** WASD o flechas para moverse, E para interactuar, Espacio para reparar el coche, Mayús para el freno de mano, H para el Halo X-9, M para el mapa, R para la radio, I para Hallazgos, V para silenciar, F para pantalla completa y Esc para el menú. En móvil hay controles táctiles. Los objetivos se activan al llegar.
- **Policía:** el sexto atropello de un conductor activa una estrella; un choque fuerte contra otro vehículo activa tres. Un roce leve o un golpe contra el escenario no tiene la misma penalización.

## Radio

El dial tiene cuatro emisoras originales generadas con Web Audio: Neón FM, Muelle Bass, Costa Groove y Antena Lunar. **Solo efectos** deja activos el motor y los avisos. **Abrir playlist en Spotify** abre la playlist elegida en otra pestaña y desactiva solo la música del juego; Spotify no se reproduce dentro del juego.

## Progresión

Cada misión completada da créditos, XP y una llave inglesa. Usa los créditos en la tienda y equipa un coche para tu próxima salida. El Halo X-9 puede sobrevolar edificios y canales, pero debes aterrizar para completar objetivos y no puedes bajar del coche en el aire.

El pase tiene 50 niveles de 500 XP cada uno. La XP se acumula incluso con el pase bloqueado. Completar la historia lo desbloquea. Las recompensas se entregan automáticamente de cinco en cinco y culminan con el Aurora 50.

En modo libre hay 15 inscripciones ocultas. Acércate a pie y pulsa E o Acción para anotar una inscripción en **Hallazgos**. Puedes canjear sus códigos allí o desde el Pase de batalla. El diario no muestra ubicaciones ni códigos por descubrir. Cada recompensa se otorga una sola vez por perfil.

El perfil se mantiene mientras la página esté abierta. Para continuar después de recargar, usa **Pase de batalla → Respaldo de partida** desde la portada y conserva el código de respaldo fuera del juego. Restaurarlo reemplaza el perfil de la sesión. No hay cuentas ni almacenamiento automático en un servidor.

El modo de pantalla completa ocupa toda el área disponible en la pestaña o en la vista previa sin ocultar las barras del navegador.

## Ejecutar o publicar

Sirve la carpeta raíz por HTTP para desarrollo local, por ejemplo con `python3 -m http.server 8080`, y abre `http://localhost:8080`. Para publicar, cualquier alojamiento web estático HTTPS puede servir esos mismos archivos. En [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), la fuente puede ser la rama principal y la carpeta `/ (root)`; el repositorio debe tener acceso a Pages según el plan.

El cooperativo usa WebRTC con [PeerJS Cloud](https://peerjs.com/server/cloud) para que dos navegadores se encuentren. El juego no emplea micrófono ni cámara, ni guarda partidas en el servicio de señalización. Algunas redes que bloquean WebRTC o requieren un [servidor TURN](https://peerjs.com/client/faq) podrían impedir la conexión. La biblioteca PeerJS 1.5.5 incluida en `vendor/` conserva su licencia MIT.
