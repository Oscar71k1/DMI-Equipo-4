// docs/evidence-code-examples/cors-antes-despues.mjs
// Demostracion de correccion propuesta para course-backend/server.mjs
// Este archivo NO reemplaza al original; es evidencia de la auditoria de Jarumi.

// ANTES (código real en course-backend/server.mjs, línea ~11):
function sendAntes(response, status, body, headers = {}) {
  const value = typeof body === 'string' ? body : JSON.stringify(body);
  response.writeHead(status, {
    'access-control-allow-origin': '*', // <-- Cualquier origen puede acceder
    'content-type': typeof body === 'string' ? 'application/json' : 'application/json; charset=utf-8',
    ...headers,
  });
  response.end(value);
}

// DESPUÉS (propuesta corregida, restringiendo a orígenes conocidos):
const ALLOWED_ORIGINS = ['http://127.0.0.1:8081', 'http://localhost:8081']; // Expo dev server local

function sendDespues(response, status, body, headers = {}, requestOrigin = '') {
  const value = typeof body === 'string' ? body : JSON.stringify(body);
  const allowedOrigin = ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS[0];
  response.writeHead(status, {
    'access-control-allow-origin': allowedOrigin, // <-- Solo orígenes conocidos, no '*'
    'content-type': typeof body === 'string' ? 'application/json' : 'application/json; charset=utf-8',
    ...headers,
  });
  response.end(value);
}

module.exports = { sendAntes, sendDespues, ALLOWED_ORIGINS };