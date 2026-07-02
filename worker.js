/**
 * Proxy Cloudflare Worker pour Jouet de langues.
 *
 * Rôle : recevoir les requêtes du navigateur (bloquées par CORS si on appelle
 * Ark directement), les relayer vers l'API officielle Volcengine Ark en
 * ajoutant la clé API (stockée en secret côté serveur, jamais dans le
 * navigateur), et renvoyer la réponse avec des en-têtes CORS.
 *
 * C'est un simple relais vers l'API OFFICIELLE — pas de contournement de
 * protections anti-bot, pas de session volée : juste ta propre clé API,
 * cachée côté serveur au lieu d'être exposée dans le code de la page.
 *
 * Déploiement (gratuit) : voir README.md.
 */

const ARK_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

// Restreins si possible à l'origine exacte de ton app une fois déployée
// (ex: 'https://tonpseudo.github.io'), au lieu de '*'.
const ALLOWED_ORIGIN = 'https://hana205.github.io/linguistique/';

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Méthode non supportée', { status: 405, headers: corsHeaders });
    }

    const url = new URL(request.url);
    if (!url.pathname.endsWith('/chat/completions')) {
      return new Response('Route inconnue', { status: 404, headers: corsHeaders });
    }

    if (!env.ARK_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ARK_API_KEY non configurée sur le Worker (voir README)." }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let body;
    try {
      body = await request.text();
    } catch (e) {
      return new Response('Corps de requête invalide', { status: 400, headers: corsHeaders });
    }

    try {
      const arkResponse = await fetch(ARK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.ARK_API_KEY}`,
        },
        body,
      });

      const responseBody = await arkResponse.text();
      return new Response(responseBody, {
        status: arkResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (e) {
      return new Response(
        JSON.stringify({ error: `Erreur en contactant Ark : ${e.message}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  },
};
