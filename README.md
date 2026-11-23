# United Gangs

Juego de conducción 2D para navegador, con campaña en solitario y cooperativo online para dos jugadores. No necesita un proceso de compilación.

## Cómo jugar

- **En solitario:** elige Puerto Umbral, Costa Candela, Sierra Eléctrica o Ciudad Prisma. Las seis misiones de cada mapa se pueden jugar en cualquier orden. Después de completar las 24, se desbloquea la única misión de Miami: **Bandas unidas**.
- **Cooperativo online:** un jugador selecciona **Crear sala** y comparte el código de ocho caracteres. El otro abre el juego, pega el código y pulsa **Unirme**. El anfitrión elige el mapa y la misión. Los dos conducen su propio coche y comparten objetivos, créditos y avance.
- **Controles:** WASD o flechas para moverse y conducir, E para entrar o salir del coche y usar el garaje, Espacio para el freno de mano, M para el mapa y Esc para el menú. En móvil hay controles táctiles. Los objetivos normales se activan al llegar; las paradas técnicas indican cuánto tiempo hay que quedarse quieto.

El progreso se conserva mientras no recargues la página. El avance de una sala lo guarda el anfitrión durante su sesión; no se escribe en archivos ni cuentas.

## Ejecutar o publicar

Sirve la carpeta raíz por HTTP para desarrollo local, por ejemplo con `python3 -m http.server 8080`, y abre `http://localhost:8080`. Para publicar, cualquier alojamiento web estático HTTPS puede servir esos mismos archivos. En [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), la fuente puede ser la rama principal y la carpeta `/ (root)`; el repositorio debe tener acceso a Pages según el plan.

El cooperativo usa WebRTC con [PeerJS Cloud](https://peerjs.com/server/cloud) para que dos navegadores se encuentren. El juego no emplea micrófono ni cámara, ni guarda partidas en el servicio de señalización. Algunas redes que bloquean WebRTC o requieren un [servidor TURN](https://peerjs.com/client/faq) podrían impedir la conexión. La biblioteca PeerJS 1.5.5 incluida en `vendor/` conserva su licencia MIT.
