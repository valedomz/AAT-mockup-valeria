// ClearLabel: función de Vercel que guarda la llave de Gemini en secreto.
// La llave vive en Vercel como GEMINI_API_KEY. Nunca va en index.html ni en GitHub.
//
// Acciones:
//   identificar -> Gemini ve la foto y dice qué producto es (y lee ingredientes si se ven)
//   buscar      -> busca el nombre en Open Beauty Facts (primeras 5 opciones)
//   clasificar  -> Gemini pone cada ingrediente en verde / amarillo / rojo con MI regla

const MODELO = process.env.GEMINI_MODEL || 'gemini-flash-latest';

// ---------- Instrucciones (system prompt) ----------
// Las guardo aquí para usarlas en la Sesión 23.

const PROMPT_IDENTIFICAR = `Eres el identificador de productos de ClearLabel.
Mira la foto. Si es un producto de cuidado personal (shampoo, jabón, crema, body wash, etc.):
- "nombre": marca y nombre del producto como aparecen en el envase, corto (ejemplo: "Dove Uniform Skin").
- "ingredientes": SOLO si en la foto se ve la lista de ingredientes, cópiala ingrediente por ingrediente, tal como está impresa. Si no se ve o no se puede leer bien, deja la lista vacía. No inventes ingredientes.
Si no es un producto de cuidado personal o no puedes saber cuál es, pon "encontrado": false.
Responde solo JSON: {"encontrado": boolean, "nombre": string, "ingredientes": string[]}`;

const PROMPT_SEMAFORO = `Eres el revisor de ingredientes de ClearLabel. Clasifica CADA ingrediente con esta regla, sin cambiarla:
- "rojo": ingredientes agresivos o que irritan la piel, como sulfatos (por ejemplo Sodium Lauryl Sulfate, Sodium Laureth Sulfate) y parabenos (cualquier ingrediente que termine en "paraben").
- "amarillo": ingredientes que pueden irritar piel sensible, como Parfum/Fragrance y los alérgenos de fragancia (Linalool, Limonene, Citronellol, Coumarin, etc.).
- "verde": ingredientes seguros para la piel.
Cuidado: Sodium Lauroyl Isethionate, Sodium Methyl Lauroyl Taurate y Cocamidopropyl Betaine NO son sulfatos.
Da una razón de máximo 12 palabras, en español simple.
Devuelve los ingredientes en el mismo orden y con el mismo nombre que te llegan.
Responde solo JSON: {"clasificados": [{"nombre": string, "color": "verde"|"amarillo"|"rojo", "razon": string}]}`;

async function gemini(partes, sistema) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Falta GEMINI_API_KEY en Vercel');

  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: sistema }] },
      contents: [{ role: 'user', parts: partes }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0 }
    })
  });
  const data = await r.json();
  if (!r.ok) throw new Error('Gemini: ' + (data.error && data.error.message || r.status));
  const texto = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '{}';
  return JSON.parse(texto.replace(/^```(json)?|```$/g, '').trim());
}

async function buscarOBF(q) {
  const url = 'https://world.openbeautyfacts.org/cgi/search.pl?' + new URLSearchParams({
    search_terms: q,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '5',
    fields: 'code,product_name,brands,ingredients_text'
  });
  const r = await fetch(url, { headers: { 'User-Agent': 'ClearLabel/1.0 (proyecto escolar AAT)' } });
  if (!r.ok) throw new Error('Open Beauty Facts: ' + r.status);
  const data = await r.json();
  return (data.products || []).slice(0, 5).map(p => ({
    codigo: p.code,
    nombre: p.product_name || '',
    marca: p.brands || '',
    ingredientes_text: p.ingredients_text || '',
    fuente: 'Open Beauty Facts (código ' + p.code + ')'
  }));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Usa POST' });
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

  try {
    if (body.accion === 'identificar') {
      if (!body.imagen) return res.status(400).json({ error: 'Falta la foto' });
      const r = await gemini(
        [{ inline_data: { mime_type: body.mime || 'image/jpeg', data: body.imagen } }, { text: '¿Qué producto es?' }],
        PROMPT_IDENTIFICAR
      );
      return res.status(200).json({
        encontrado: !!r.encontrado,
        nombre: r.nombre || '',
        ingredientes: Array.isArray(r.ingredientes) ? r.ingredientes : []
      });
    }

    if (body.accion === 'buscar') {
      const q = String(body.q || '').trim();
      if (!q) return res.status(400).json({ error: 'Falta el nombre' });
      return res.status(200).json({ productos: await buscarOBF(q) });
    }

    if (body.accion === 'clasificar') {
      const ingredientes = (body.ingredientes || []).map(String).filter(Boolean).slice(0, 80);
      if (!ingredientes.length) return res.status(400).json({ error: 'No hay ingredientes' });
      const r = await gemini([{ text: 'Ingredientes:\n' + ingredientes.join('\n') }], PROMPT_SEMAFORO);
      const validos = ['verde', 'amarillo', 'rojo'];
      const clasificados = (r.clasificados || []).map(i => ({
        nombre: i.nombre,
        color: validos.includes(i.color) ? i.color : 'amarillo',
        razon: i.razon || ''
      }));
      return res.status(200).json({ clasificados });
    }

    return res.status(400).json({ error: 'Acción no válida' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
