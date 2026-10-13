export type SessionEvent = Readonly<{
  type: 'request401' | 'refreshSucceeded' | 'refreshFailed' | 'logout';
  requestId?: string;
  generation?: number;
  token?: string;
}>;

export type SessionState = Readonly<{
  status: 'anonymous' | 'authenticated';
  activeGeneration: number | null;
  refreshInFlight: boolean;
  refreshCalls: number;
  waiting: readonly string[];
  retriedRequestIds: readonly string[];
  persistedToken: string | null;
}>;

export const initialSessionState: SessionState = {
  status: 'authenticated',
  activeGeneration: 0,
  refreshInFlight: false,
  refreshCalls: 0,
  waiting: [],
  retriedRequestIds: [],
  persistedToken: null,
};

// Estado seguro: sin sesión, sin token y sin nadie esperando.
// Se conservan los contadores para poder observar lo que pasó.
function toAnonymous(state: SessionState): SessionState {
  return {
    status: 'anonymous',
    activeGeneration: null,
    refreshInFlight: false,
    refreshCalls: state.refreshCalls,
    waiting: [],
    retriedRequestIds: state.retriedRequestIds,
    persistedToken: null,
  };
}

export function reduceSession(state: SessionState, event: SessionEvent): SessionState {
  switch (event.type) {
    case 'logout':
      // Invalida todo. Un refresh que llegue después ya no encuentra sesión.
      return toAnonymous(state);

    case 'request401': {
      const id = event.requestId;
      if (state.status === 'anonymous' || !id) return state;
      // Cada solicitud se reintenta una sola vez.
      if (state.retriedRequestIds.includes(id) || state.waiting.includes(id)) return state;

      const current = state.activeGeneration ?? 0;
      const generation = event.generation ?? current;

      // 401 viejo: la sesión ya se renovó después. No hace falta otro refresh.
      if (generation < current) {
        return { ...state, retriedRequestIds: [...state.retriedRequestIds, id] };
      }
      // Ya hay un refresh en proceso: me formo con los demás.
      if (state.refreshInFlight) {
        return { ...state, waiting: [...state.waiting, id] };
      }
      // Soy el primero: arranca el único refresh.
      return {
        ...state,
        refreshInFlight: true,
        refreshCalls: state.refreshCalls + 1,
        waiting: [...state.waiting, id],
      };
    }

    case 'refreshSucceeded': {
      // Sin sesión (logout) o sin refresh pendiente: no se resucita nada.
      if (state.status === 'anonymous' || !state.refreshInFlight) return state;
      // Un éxito sin generación o sin token no es confiable: estado seguro.
      if (event.generation === undefined || !event.token) return toAnonymous(state);
      // Resultado obsoleto: ya hay una generación igual o más nueva.
      if (event.generation <= (state.activeGeneration ?? 0)) return state;

      return {
        status: 'authenticated',
        activeGeneration: event.generation,
        refreshInFlight: false,
        refreshCalls: state.refreshCalls,
        waiting: [],
        retriedRequestIds: [...state.retriedRequestIds, ...state.waiting],
        persistedToken: event.token,
      };
    }

    case 'refreshFailed':
      if (state.status === 'anonymous' || !state.refreshInFlight) return state;
      // Falla una vez: se pasa a anónimo, se borra el token y nadie reintenta.
      return toAnonymous(state);
  }
}