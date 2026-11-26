# ClearLabel

App: https://aat-mockup-valeria.vercel.app

## Decisiones de diseño vs. sugerencias del IS

### 1. Seguridad: dónde guardar las llaves
- Qué propuso el IS (Claude): crear un archivo aparte, api/analizar.js, que corre en Vercel y guarda la llave de Gemini como variable secreta (GEMINI_API_KEY), en vez de ponerla en index.html. En Supabase, usar solo la publishable key con RLS encendido y nunca la secret key.
- Qué decidí: aceptar.
- Por qué: index.html es público en GitHub y en el navegador, así que cualquiera podría copiar mi llave y gastarla.
- Cómo lo verifiqué: abrí /api/analizar y respondió {"error":"Usa POST"}; la llave no aparece en mi repositorio.

### 2. Escalabilidad: Gemini saturado (errores 503 y 504)
- Qué pasó: al probar con "Dove", Gemini respondió "This model is currently experiencing high demand" y después "Error 504", porque Vercel cortaba la función cuando Gemini tardaba.
- Qué propuso el IS: A) reintentar con el mismo modelo, B) reintentar y luego usar un modelo más ligero (gemini-flash-lite), C) solo mostrar un mensaje en español.
- Qué decidí: B, más darle 60 segundos a la función (vercel.json).
- Por qué: si Gemini falla justo cuando alguien prueba mi app, parece rota. Prefiero una respuesta un poco menos precisa a ninguna respuesta.

Razón 3:
- Cómo lo verifiqué: volví a buscar "Dove", elegí "Dove · Go fresh" y salió el semáforo con 60/100.

### 3. Funcionalidad: el IS escondía errores
- Qué pasó: al buscar "Dove" salía "Lo siento, este producto no fue encontrado", pero el producto sí existía. La causa real era que api/analizar.js quedó en la carpeta api/api/api y Vercel no lo encontraba (404). El código del IS mostraba "no encontrado" en vez del error real.
- Qué decidí: revisar. Moví el archivo a api/ y lo comprobé abriendo /api/analizar.
- Por qué:  el mensaje engañaba al usuario, porque le hacía creer que el producto no existía cuando en realidad la app había fallado.
