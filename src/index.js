import { handleRoute } from './router.js';
import { verifyJWT } from './auth.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    try {
      const response = await handleRoute(request, env, ctx);
      // Add CORS headers to all responses
      response.headers.set('Access-Control-Allow-Origin', '*');
      return response;
    } catch (err) {
      return new Response(JSON.stringify({ status: false, reason: 'SERVER ERROR: ' + err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  },
};
