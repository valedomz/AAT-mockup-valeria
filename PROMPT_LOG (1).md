# Bitácora de prompts: Assignment 2, ClearLabel

App: https://aat-mockup-valeria.vercel.app
Repo: https://github.com/valedomz/AAT-mockup-valeria

## Paso 1: Especificación (Checkpoint A)

**Qué hace:** El usuario toma una foto de la botella de un producto. Gemini identifica el nombre del producto y la app busca ese nombre en Open Beauty Facts y muestra las primeras 5 opciones con nombre y marca. Si Gemini no identifica la foto, la app le pide al usuario escribir el nombre y sigue el mismo flujo. Al picar una opción, la app muestra cada ingrediente con su semáforo (verde, amarillo o rojo) y un puntaje del 0 al 100. Las recomendaciones de productos más seguros quedan como mejora futura.

**Qué datos necesita:**
- La foto que toma el usuario, o el nombre que escribe si la foto falla.
- Gemini, para identificar el producto en la foto.
- Open Beauty Facts, para la lista de ingredientes.
- Mi regla de semáforo, que Gemini aplica a cada ingrediente: rojo si es agresivo o irrita la piel (como sulfatos y parabenos), amarillo si puede irritar piel sensible (como Parfum), verde si es seguro.
- Mi regla de puntaje: empieza en 100, resta 15 por cada rojo y 5 por cada amarillo, nunca baja de 0.

**Cómo sabré que funciona:**
- Caso 1: tomo foto de mi Dove Uniform Skin. Espero que salga entre las 5 opciones, que ningún ingrediente salga en rojo por ser sulfato o parabeno (la botella dice "0% parabenos & sulfatos"), que Parfum salga en amarillo y que el puntaje coincida con mi regla al contar rojos y amarillos.
- Caso 2: escribo "asdfgh". Espero ver: "Lo siento, este producto no fue encontrado."

Actualización después del Paso 2 (decisiones C y D): si el producto no está en Open Beauty Facts y la foto muestra la lista de ingredientes, Gemini la lee y la app la ofrece como una opción marcada "leído por IA". La pantalla Buscar también busca en Open Beauty Facts.

Auditada por: Valeria Amoumbrad
Cambios después de la auditoría: Mi compañera me preguntó qué pasaba si el producto o sus ingredientes no estaban en Open Beauty Facts. Eso me hizo ver que muchos productos se iban a quedar sin resultado. Por eso agregué que, si no está, Gemini lea los ingredientes directo de la foto de la etiqueta (decisión C), marcados como "leído por IA".

### Decisiones al definir la especificación
- Escanear la botella completa con IA en vez del código de barras, con respaldo de escribir el nombre por si la foto falla. Razón: [tu razón]
- Recorté las recomendaciones de productos más seguros y las dejé como mejora futura. Razón: la función tenía que ser chica y terminable; las recomendaciones son otra función completa.
- La IA clasifica los ingredientes, pero con mi regla escrita, porque una IA puede calificar distinto el mismo producto dos veces.

## Paso 2: Construcción (aceptar / rechazar / revisar)

Herramienta: Claude (chat). Mi prompt: "Construye mi función según mi especificación del Paso 1". Claude me dio primero un plan de 7 pasos y 4 puntos para decidir antes de escribir código.

| # | Qué propuso la IA | Campo de mi especificación en juego | Mi decisión | Por qué |
|---|-------------------|-------------------------------------|-------------|---------|
| A | Agregar un archivo nuevo, api/analizar.js (función de Vercel), además de index.html, para guardar la llave de Gemini | Qué datos necesita (Gemini) | Aceptar | index.html es público en GitHub y en el navegador, así que cualquiera podría copiar mi llave y gastarla. |
| B | Si el producto existe pero no tiene ingredientes en Open Beauty Facts, mostrar "Este producto no tiene ingredientes registrados" | Cómo sabré que funciona (caso que mi especificación no cubría) | Aceptar | Si la app calculara el puntaje sin ingredientes, saldría 100 y parecería seguro aunque no lo sea. |
| C | Si el producto no está en Open Beauty Facts, que Gemini lea los ingredientes de la foto de la etiqueta | Qué datos necesita: cambia la fuente de los ingredientes (mi especificación decía solo Open Beauty Facts) | Aceptar, y actualizo mi especificación | Muchos productos mexicanos o nuevos no están en Open Beauty Facts, como mi Dove Uniform Skin; así la app sirve aunque no lo encuentre. La app marca esa opción como "leído por IA" para que se sepa de dónde salió. |
| D | Conectar también la pantalla Buscar a Open Beauty Facts | Qué hace: está fuera de mi especificación | Aceptar (alcance extra) | Usaba la misma búsqueda de Open Beauty Facts, así que conectarla era poco trabajo extra. |
| E | En las instrucciones de Gemini (api/analizar.js) Claude agregó: los alérgenos de fragancia (Linalool, Limonene, Citronellol, Coumarin) van en amarillo, y una aclaración de que Sodium Lauroyl Isethionate y Sodium Methyl Lauroyl Taurate NO son sulfatos | Qué datos necesita: mi regla de semáforo. Mi regla solo decía Parfum en amarillo | Aceptar | esos ingredientes sí son fragancias y la aclaración evita que la IA confunda ingredientes suaves con sulfatos |
| F | El puntaje lo calcula el código, no Gemini | Mi regla de puntaje | Mi regla (100 − 15 por rojo − 5 por amarillo) es mía y la puedo comprobar contando colores. |
| G | Gemini saturado (503) y Vercel cortando (504): A) reintentar, B) reintentar y usar modelo ligero, C) solo mensaje en español | Qué datos necesita (Gemini) | B, más 60 segundos en vercel.json | Si Gemini falla justo cuando alguien prueba mi app, parece rota; prefiero una respuesta un poco menos precisa a ninguna. |

## Paso 3: Veredicto

Veredicto: Revisar
Razón: Perfume/Fragrance sí salió en amarillo como dice mi regla, pero el primer ingrediente trae texto basura ("ance das cri INGREDIENTS/INGREDIENTE:") porque la app no limpia el texto de Open Beauty Facts.
Input exacto: escribí "Dove" en la pantalla Escanear → "Buscar por nombre" → elegí "Dove · Go fresh". Deploy confirmado el 25 de noviembre.
Output real (copiado de la pantalla):
```
60 /100 · Aceptable, con cuidado
Dove · Go fresh
ance das cri INGREDIENTS/INGREDIENTE: Butane · Seguro · Gas propelente seguro para uso cosmético.
Isobutane · Seguro · Gas propelente seguro para la piel.
Propane · Seguro · Gas propelente común y seguro.
Aluminum PPG-14 Butyl Ether · Seguro · Emoliente acondicionador seguro para la piel.
Cyclopentasiloxane · Seguro · Silicona que aporta textura suave y es segura.
Perfume/Fragrance · Vigilar · Fragancia que puede irritar la piel sensible.
```

### Problemas que encontré al probar (antes de que funcionara)
1. Al buscar "Dove" salía "Lo siento, este producto no fue encontrado". La causa real era que el archivo api/analizar.js quedó en api/api/api/ y Vercel no lo encontraba (404). El código del IS escondía ese error como si el producto no existiera.
2. Gemini respondió "This model is currently experiencing high demand" y luego "Error 504". Decisión G: elegí la opción B (reintentar y usar el modelo ligero) y darle 60 segundos a la función con vercel.json.
3. En el resultado de Dove Go fresh el primer ingrediente trae texto basura ("ance das cri INGREDIENTS/INGREDIENTE:") que viene de Open Beauty Facts y la app no lo limpia.

## Uso de IA
- Herramienta(s): 
- Para qué la usé: 
- Qué decidí o verifiqué yo: 
