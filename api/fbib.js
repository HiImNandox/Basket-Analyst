export const config = { runtime: 'edge' };

export default async function handler(req, res) {
  // Headers CORS — permite peticiones desde cualquier origen
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { endpoint, matchId, currentSeason } = req.query;

  // Validación básica
  if (!endpoint || !matchId) {
    return res.status(400).json({ error: 'Faltan parámetros: endpoint y matchId son obligatorios' });
  }

  const ALLOWED_ENDPOINTS = ['getJsonWithMatchStats', 'getJsonWithMatchMoves'];
  if (!ALLOWED_ENDPOINTS.includes(endpoint)) {
    return res.status(400).json({ error: `Endpoint no permitido. Usa: ${ALLOWED_ENDPOINTS.join(', ')}` });
  }

  const season = currentSeason === 'false' ? 'false' : 'true';
  const url = `https://msstats.optimalwayconsulting.com/v1/fbib/${endpoint}/${matchId}?currentSeason=${season}`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'HoopStats/1.0' }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `La API de la FBIB respondió con ${response.status}` });
    }

    const data = await response.json();
    // Cache 5 minutos (partidos en vivo) — puedes subir a 3600 para partidos acabados
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: `Error al contactar la API de la FBIB: ${err.message}` });
  }
}
