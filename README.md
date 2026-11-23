# United Gangs

Juego de conducción 2D para navegador, con una campaña local y modo libre en solitario o cooperativo para dos jugadores. No necesita un proceso de compilación.

## Cómo jugar

- **Historia local:** elige Puerto Umbral, Costa Candela, Sierra Eléctrica o Ciudad Prisma. Las seis misiones de cada mapa se pueden jugar en cualquier orden. Después de completar las 24, se desbloquea **Bandas unidas**, la única misión de Miami. Cada tramo final tiene un límite de tiempo y en Miami también hay un límite total de 8 minutos.
- **Modo libre:** explora cualquiera de las cuatro primeras ciudades. Pulsa J o **Encargo** para pedir una secundaria. Puedes repetir tantas como quieras; se generan rutas para entregas, carreras, persecuciones y recorridos.
- **Cooperativo online:** uno pulsa **Crear sala** y comparte el código de ocho caracteres. El otro lo introduce en **Unirme**. El anfitrión elige el mapa y cualquiera puede pedir encargos. Los dos conducen su propio coche, comparten objetivos y cada uno gana recompensas para su inventario. La campaña nunca se juega online.
- **Controles:** WASD o flechas para moverse, E para entrar, salir o usar el garaje, Espacio para gastar una llave inglesa y reparar el coche, Mayús para el freno de mano, H para despegar o aterrizar con el Halo X-9, M para el mapa, F para pantalla completa y Esc para el menú. En móvil hay controles táctiles. Las instrucciones aparecen como avisos de radio y los objetivos se activan al llegar.

## Progresión

Cada misión completada da créditos, XP y una llave inglesa. Usa los créditos en la tienda y equipa un coche para tu próxima salida. El Halo X-9 puede sobrevolar edificios y canales, pero debes aterrizar para completar objetivos y no puedes bajar del coche en el aire.

El pase tiene 50 niveles de 500 XP cada uno. La XP se acumula incluso con el pase bloqueado. Completar la historia lo desbloquea y existe una pista escondida en modo libre cuyo código desbloquea todos los niveles. Las recompensas de cinco en cinco se entregan automáticamente, con el deportivo Aurora 50 como premio final.

El perfil se mantiene mientras la página esté abierta. Para continuar después de recargar, usa **Pase de batalla → Respaldo de partida** desde la portada y conserva el código de respaldo fuera del juego. Restaurarlo reemplaza el perfil de la sesión. No hay cuentas ni almacenamiento automático en un servidor.

El modo de pantalla completa ocupa toda el área disponible en la pestaña o en la vista previa sin ocultar las barras del navegador.

## Ejecutar o publicar

Sirve la carpeta raíz por HTTP para desarrollo local, por ejemplo con `python3 -m http.server 8080`, y abre `http://localhost:8080`. Para publicar, cualquier alojamiento web estático HTTPS puede servir esos mismos archivos. En [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), la fuente puede ser la rama principal y la carpeta `/ (root)`; el repositorio debe tener acceso a Pages según el plan.

El cooperativo usa WebRTC con [PeerJS Cloud](https://peerjs.com/server/cloud) para que dos navegadores se encuentren. El juego no emplea micrófono ni cámara, ni guarda partidas en el servicio de señalización. Algunas redes que bloquean WebRTC o requieren un [servidor TURN](https://peerjs.com/client/faq) podrían impedir la conexión. La biblioteca PeerJS 1.5.5 incluida en `vendor/` conserva su licencia MIT.
