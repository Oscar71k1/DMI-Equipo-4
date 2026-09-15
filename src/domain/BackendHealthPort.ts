/**
 * Puerto puro para comprobar la salud del backend heredado.
 * Se resuelve si el backend respondió bien; se rechaza si falló o no está disponible.
 */
export interface BackendHealthPort {
  check(): Promise<void>;
}