// =============================================
// JACSAW NEXUS HUB — data.js  |  25 recursos curados
// =============================================
const NEXUS_DATA_DEFAULT = [
    {
        id: 1, name: 'FitGirl Repacks', category: 'REPACKERS',
        url: 'https://fitgirl-repacks.site', trust: 5,
        tags: ['PC', 'Lossless'], color: '#7C3AED',
        isNew: false, added: '2026-04-08',
        desc: 'Compresión extrema. El sitio más seguro para repacks de PC.',
        notes: 'Verifica siempre la URL oficial (fitgirl-repacks.site). Los instaladores comprueban integridad automáticamente con MD5. Tiene canal de Telegram oficial para anuncios de nuevos lanzamientos. No acepta donaciones cripto para evitar impostores. La instalación puede durar horas pero el tamaño final es el más pequeño del mercado.'
    },
    {
        id: 2, name: 'DODI Repacks', category: 'REPACKERS',
        url: 'https://dodi-repacks.site/', trust: 5,
        tags: ['PC', 'Fast-Install'], color: '#7C3AED',
        isNew: false, added: '2026-04-08',
        desc: 'Excelente balance entre velocidad y tamaño.',
        notes: 'Instalación notablemente más rápida que FitGirl manteniendo buen ratio de compresión. Tiene servidor de Discord activo con soporte de la comunidad. Ideal para conexiones medias. Comprueba la firma SHA256 del instalador antes de ejecutar. Actualiza rápido ante nuevos lanzamientos.'
    },
    {
        id: 3, name: 'El Amigos', category: 'REPACKERS',
        url: 'https://www.elamigosweb.com/', trust: 4,
        tags: ['PC', 'ES/EN'], color: '#7C3AED',
        isNew: false, added: '2026-04-08',
        desc: 'Referente hispano. Instaladores sencillos y directos.',
        notes: 'El referente para la comunidad hispanohablante. Instaladores completamente en español. Soporte activo en sus foros. Algunos juegos incluyen traducción al castellano cuando está disponible. No todos los títulos son tan recientes como FitGirl o DODI, pero la calidad es constante y la comunidad muy activa.'
    },
    {
        id: 4, name: 'KaosKrew', category: 'REPACKERS',
        url: 'https://kaoskrew.org/viewforum.php?f=13', trust: 4,
        tags: ['PC', 'Classic'], color: '#7C3AED',
        isNew: false, added: '2026-04-08',
        desc: 'Grupo histórico de la scene. Repacks limpios.',
        notes: 'Uno de los grupos veteranos más respetados de la scene. Requiere registro en el foro para acceder a los links de descarga. Sus repacks son especialmente valorados para títulos clásicos y de tamaño moderado. Comunidad pequeña pero muy técnica y de confianza contrastada.'
    },
    {
        id: 5, name: 'SteamRip', category: 'PRE-INSTALADOS',
        url: 'https://steamrip.com/', trust: 4,
        tags: ['PC', 'No-Install'], color: '#00D4FF',
        isNew: false, added: '2026-04-08',
        desc: 'Descarga directa, extraer y jugar. Muy seguro.',
        notes: 'La filosofía es simple: descarga el ZIP, extráelo y lanza el .exe directamente. Sin instaladores complicados ni configuraciones previas. Perfecto para probar juegos rápido. Los archivos son algo más grandes que los repacks pero la instalación es instantánea. Servidores propios con buenas velocidades.'
    },
    {
        id: 6, name: 'IGG Games', category: 'JUEGOS PC',
        url: 'https://igg-games.com/', trust: 2,
        tags: ['PC', 'Ads+'], color: '#00D4FF',
        isNew: false, added: '2026-04-08', warn: 'RIESGO',
        desc: 'Catálogo inmenso. Publicidad agresiva. Usa uBlock.',
        notes: 'Catálogo enorme pero con publicidad muy agresiva y múltiples redirecciones peligrosas. OBLIGATORIO: instala uBlock Origin antes de visitar. Nunca hagas clic en el botón "Download" falso. No recomendado para usuarios sin experiencia previa.'
    },
    {
        id: 7, name: 'Game3rb', category: 'JUEGOS PC',
        url: 'https://game3rb.com/', trust: 3,
        tags: ['PC', 'Online-Fix'], color: '#00D4FF',
        isNew: false, added: '2026-04-08',
        desc: 'Especialistas en juegos con multijugador fix.',
        notes: 'Muy buena fuente para juegos con fix de multijugador ya integrado en el propio paquete. Útil para jugar en LAN simulado o con amigos sin necesitar cuenta de Steam. Velocidades de descarga variables según el mirror elegido.'
    },
    {
        id: 8, name: 'GameBRB', category: 'JUEGOS PC',
        url: 'https://gamebrb.com/', trust: 3,
        tags: ['PC', 'Direct'], color: '#00D4FF',
        isNew: false, added: '2026-04-08',
        desc: 'Sitio de descargas directas con múltiples espejos.',
        notes: 'Ofrece varios mirrors por descarga: Mediafire, MEGA, 1fichier, Google Drive. La actualización es irregular pero cubre gran cantidad de títulos populares. Útil como alternativa cuando otros sitios están caídos.'
    },
    {
        id: 9, name: 'OVA Games', category: 'JUEGOS PC',
        url: 'https://www.ovagames.com/', trust: 4,
        tags: ['PC', 'Mediafire'], color: '#00D4FF',
        isNew: false, added: '2026-04-08',
        desc: 'Descargas rápidas con mirrors de alta calidad.',
        notes: 'Especializado en Mediafire y otros mirrors de alta velocidad sin límites de descarga. Verificado de forma consistente como seguro por la comunidad. Incluye instrucciones de instalación claras en cada entrada.'
    },
    {
        id: 10, name: 'PC Games Torrents', category: 'TORRENTS',
        url: 'https://pcgamestorrents.com/', trust: 3,
        tags: ['Torrent', 'PC'], color: '#00D4FF',
        isNew: false, added: '2026-04-08',
        desc: 'Indexador enfocado exclusivamente en torrents.',
        notes: 'Necesitas un cliente torrent como qBittorrent. Filtra por número de seeders para priorizar descargas activas. La mayoría de torrents enlazan repacks de FitGirl o DODI.'
    },
    {
        id: 11, name: 'SmallGames', category: 'INDIE',
        url: 'https://smallgames.ws/', trust: 3,
        tags: ['PC', 'Indie', 'RU'], color: '#00D4FF',
        isNew: false, added: '2026-04-08',
        desc: 'Tesoro oculto para juegos indie y rusos raros.',
        notes: 'Especializado en títulos indie y juegos de desarrollo ruso raramente disponibles en sitios occidentales. La interfaz está parcialmente en ruso pero es navegable. Ideal para descubrir joyas ocultas.'
    },
    {
        id: 12, name: 'GOG-Games', category: 'GOG-FREE',
        url: 'https://gog-games.to/', trust: 5,
        tags: ['GOG', 'DRM-Free'], color: '#6041A3',
        isNew: false, added: '2026-04-08',
        desc: 'Instaladores originales de GOG sin modificaciones.',
        notes: 'Los instaladores son exactamente los originales distribuidos por GOG. DRM-Free garantizado: funcionan offline y para siempre sin activación de ningún tipo. Perfectos para archivar.'
    },
    {
        id: 13, name: 'FreeGOGPCGames', category: 'GOG-FREE',
        url: 'https://freegogpcgames.com/', trust: 3,
        tags: ['DRM-Free'], color: '#6041A3',
        isNew: false, added: '2026-04-08',
        desc: 'Alternativa para juegos sin DRM de GOG.',
        notes: 'Alternativa a GOG-Games con algunos títulos exclusivos no disponibles allí. Útil como segunda opción cuando el sitio principal está temporalmente caído.'
    },
    {
        id: 14, name: 'Online-Fix', category: 'ONLINE FIXES',
        url: 'https://online-fix.me/', trust: 5,
        tags: ['Multiplayer', 'Fix'], color: '#EF4444',
        isNew: false, added: '2026-04-08',
        desc: 'La fuente #1 para jugar pirata con amigos online.',
        notes: 'El recurso más completo para fixes de multijugador. Los fixes permiten jugar en LAN simulado o con servidores propios. Incluye guías de configuración detalladas por juego. Se requiere registro gratuito.'
    },
    {
        id: 15, name: 'CS.RIN.RU', category: 'SCENE',
        url: 'https://cs.rin.ru/', trust: 5,
        tags: ['Forum', 'Tools'], color: '#10B981',
        isNew: false, added: '2026-04-08',
        desc: 'La biblia del gaming underground. Conocimiento puro.',
        notes: 'El mayor foro de gaming underground activo en internet. Requiere registro. Aquí se originan muchos de los cracks que redistribuyen otros sitios. Se espera conocimiento técnico previo.'
    },
    {
        id: 16, name: "Vimm's Lair", category: 'EMULACIÓN',
        url: 'https://vimm.net/', trust: 5,
        tags: ['Retro', 'ROMs'], color: '#F59E0B',
        isNew: false, added: '2026-04-08',
        desc: 'El refugio más seguro para consolas clásicas.',
        notes: 'El sitio de ROMs retro más respetado. Cubre NES, SNES, N64, GBA, PS1, PS2 y más. Todas las ROMs están verificadas con checksum y libres de malware. Sin publicidad agresiva.'
    },
    {
        id: 17, name: 'NXBrew', category: 'EMULACIÓN',
        url: 'https://nxbrew.me/', trust: 4,
        tags: ['Switch', 'NSP'], color: '#F59E0B',
        isNew: false, added: '2026-04-08',
        desc: 'Todo para la híbrida de Nintendo. NSP y XCI.',
        notes: 'La mejor fuente actualizada para juegos de Nintendo Switch. NSP para emuladores de PC como Yuzu o Ryujinx. Incluye actualizaciones (UPD) y DLCs separados para mayor flexibilidad.'
    },
    {
        id: 18, name: 'NSW2U', category: 'EMULACIÓN',
        url: 'https://nsw2u.click/', trust: 4,
        tags: ['Switch', '3DS'], color: '#F59E0B',
        isNew: false, added: '2026-04-08',
        desc: 'Actualizaciones, DLCs y ROMs de consolas Nintendo.',
        notes: 'Cubre tanto Switch (NSP/XCI) como 3DS (CIA/3DS format). Buena fuente de actualizaciones y DLCs. Interfaz sencilla bien organizada por consola.'
    },
    {
        id: 19, name: 'LinuxRulez', category: 'LINUX',
        url: 'https://rentry.co/LinuxRulez', trust: 5,
        tags: ['Linux', 'SteamDeck'], color: '#EC4899',
        isNew: false, added: '2026-04-08',
        desc: 'Scripts optimizados para jugar en Linux y Steam Deck.',
        notes: 'Guía y colección de scripts para configurar gaming pirata en Linux. Cubre Proton, Wine y configuración específica para Steam Deck. Scripts automatizados para instalar repacks sin complicaciones.'
    },
    {
        id: 20, name: 'SkidrowReloaded', category: 'SCENE',
        url: 'https://www.skidrowreloaded.com/', trust: 1,
        tags: ['Fake-Name', 'Risky'], color: '#4A5A6E',
        isNew: false, added: '2026-04-08', warn: 'PELIGRO',
        desc: 'Sitio que usa nombres de la scene. Solo expertos.',
        notes: 'ADVERTENCIA CRÍTICA: Este sitio NO está afiliado al grupo real Skidrow ni Reloaded. Historial documentado de archivos con adware. Solo para usuarios avanzados que sepan analizar ejecutables.'
    },
    {
        id: 21, name: 'NintendoProject', category: 'EMULACIÓN',
        url: 'https://nintendoproject.com/', trust: 5,
        tags: ['Nintendo', 'Emulador'], color: '#F59E0B',
        isNew: true, added: '2026-04-10', warn: 'DE PAGO',
        desc: 'Sitio con muchos emuladores y librería de juegos rápida.',
        notes: 'Tiene emuladores y juegos de diferentes plataformas como ps2, ps3, ps4, gba, n3ds, y muchos más. Recomendado echarle un ojo por su organización.'
    },
    {
        id: 22, name: 'Optijuegos', category: 'SCENE',
        url: 'https://optijuegos.net/legacy', trust: 2,
        tags: ['Legacy', 'ES'], color: '#4A5A6E',
        isNew: false, added: '2026-04-08',
        desc: 'Archivos antiguos y juegos livianos.',
        notes: 'Archivo histórico de la comunidad española. Muchos títulos clásicos de PC y juegos de bajos requisitos de la era 2000-2010. Útil exclusivamente como archivo para encontrar joyas antiguas.'
    },
    {
        id: 23, name: 'SwitchRom', category: 'EMULACIÓN',
        url: 'https://switchrom.net/', trust: 4,
        tags: ['Switch', 'Direct-Download'], color: '#F59E0B',
        isNew: true, added: '2026-04-10',
        desc: 'Catálogo extenso enfocado exclusivamente en Nintendo Switch.',
        notes: 'Biblioteca muy completa que incluye actualizaciones (Updates) y contenido descargable (DLC). Se recomienda usar un bloqueador de publicidad activo y verificar la región del archivo.'
    },
    {
        id: 24, name: 'RomsFun', category: 'EMULACIÓN',
        url: 'https://romsfun.com/', trust: 5,
        tags: ['Multi-System', 'Retro', 'Direct-Download'],
        color: '#F59E0B', 
        isNew: true, added: '2026-04-10',
        desc: 'Enorme repositorio multiconsola con descarga directa de alta velocidad.',
        notes: 'Una de las opciones más completas para sistemas retro y consolas modernas. Destaca por no tener límites de velocidad excesivos y una navegación limpia. Incluye capturas de pantalla.'
    },
    {
        id: 25, name: 'PiviGames', category: 'REPACKERS',
        url: 'https://pivigames.blog/', trust: 5,
        tags: ['PC', 'Updates', 'Online-Fix'], color: '#7C3AED',
        isNew: false, added: '2026-04-10',
        desc: 'La mayor comunidad hispana de juegos de PC y actualizaciones.',
        notes: 'Excelente para encontrar juegos con soporte para multijugador online (Online-Fix). El sitio se actualiza diariamente y ofrece múltiples opciones de descarga. Muy útil para tutoriales en español.'
    },
    {
        id: 26, name: 'TinyRepacks', category: 'REPACKERS',
        url: 'https://tiny-repacks.win/', trust: 5,
        tags: ['PC', 'Ultra-Small'], color: '#7C3AED',
        isNew: true, added: '2026-04-10',
        desc: 'Especialistas en repacks de tamaño mínimo para conexiones lentas.',
        notes: 'Nueva estrella en la escena. Utilizan algoritmos de compresión propietarios que a veces superan a FitGirl en títulos específicos. Comunidad creciente en Lemmy y Reddit.'
    },
    {
        id: 27, name: 'Ziperto', category: 'EMULACIÓN',
        url: 'https://www.ziperto.com/', trust: 4,
        tags: ['Switch', '3DS', 'PS Vita'], color: '#F59E0B',
        isNew: true, added: '2026-04-10',
        desc: 'Líder en ROMs de consolas portátiles y actualizaciones.',
        notes: 'Extremadamente confiable para formatos .NSP, .CIA y .VPK. Organizado por partes en servidores como 1Fichier y Zippyshare (mirrors). Obligatorio usar bloqueador de anuncios.'
    },
    {
        id: 30, name: 'Linux-Quack', category: 'LINUX',
        url: 'https://linux-quack.io/', trust: 5,
        tags: ['SteamDeck', 'Flatpak', 'Native'], color: '#EC4899',
        isNew: true, added: '2026-04-10',
        desc: 'Scripts y binarios optimizados nativamente para SteamOS.',
        notes: 'Especialmente diseñado para usuarios de Steam Deck. Ofrecen instaladores en formato Flatpak que configuran automáticamente Wine y Proton sin tocar la terminal.'
    },
    {
        id: 32, name: '1337x (Games Section)', category: 'TORRENTS',
        url: 'https://1337x.to/popular-games', trust: 5,
        tags: ['Multi-System', 'Scene', 'Repacks'], color: '#EF4444',
        isNew: true, added: '2026-04-10',
        desc: 'El buscador de torrents más activo y organizado actualmente.',
        notes: 'IMPORTANTE: Solo descargar de uploaders verificados (Vips/Trusted). Ideal para encontrar versiones de DODI o FitGirl cuando sus webs principales están caídas. Usa siempre uBlock Origin.',
        warn: 'REVISAR UPLOADER'
    },
];