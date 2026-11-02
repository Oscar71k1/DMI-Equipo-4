import { selectIncidentLocation } from '../src/domain/selectIncidentLocation';

const MANUAL = 'Edificio A, planta baja';
const FALLBACK = { source: 'manual', label: MANUAL };

describe('selectIncidentLocation', () => {
  test('acepta una ubicacion valida del proveedor', () => {
    expect(selectIncidentLocation({ label: 'Biblioteca', latitude: 10.5, longitude: -20.25 }, MANUAL)).toEqual({
      source: 'provider', label: 'Biblioteca', latitude: 10.5, longitude: -20.25,
    });
  });

  test('el cero es una coordenada valida', () => {
    expect(selectIncidentLocation({ label: 'Origen', latitude: 0, longitude: 0 }, MANUAL)).toEqual({
      source: 'provider', label: 'Origen', latitude: 0, longitude: 0,
    });
  });

  test.each([[90, 180], [-90, -180], [90, -180], [-90, 180]])(
    'acepta los limites exactos (%p, %p)',
    (latitude, longitude) => {
      expect(selectIncidentLocation({ label: 'Limite', latitude, longitude }, MANUAL)).toEqual({
        source: 'provider', label: 'Limite', latitude, longitude,
      });
    },
  );

  test.each<[string, unknown]>([
    ['la latitud pasa de 90', { label: 'X', latitude: 90.0001, longitude: 0 }],
    ['la latitud baja de -90', { label: 'X', latitude: -90.0001, longitude: 0 }],
    ['la longitud pasa de 180', { label: 'X', latitude: 0, longitude: 180.0001 }],
    ['la longitud baja de -180', { label: 'X', latitude: 0, longitude: -180.0001 }],
    ['la latitud es NaN', { label: 'X', latitude: Number.NaN, longitude: 0 }],
    ['la latitud es Infinity', { label: 'X', latitude: Number.POSITIVE_INFINITY, longitude: 0 }],
    ['la longitud es -Infinity', { label: 'X', latitude: 0, longitude: Number.NEGATIVE_INFINITY }],
    ['la latitud es una cadena', { label: 'X', latitude: '10', longitude: 0 }],
    ['la longitud es una cadena', { label: 'X', latitude: 0, longitude: '10' }],
    ['falta la longitud', { label: 'X', latitude: 10 }],
    ['faltan las coordenadas', { label: 'X' }],
    ['las coordenadas son null', { label: 'X', latitude: null, longitude: null }],
    ['la etiqueta esta vacia', { label: '', latitude: 1, longitude: 1 }],
    ['la etiqueta son solo espacios', { label: '   ', latitude: 1, longitude: 1 }],
    ['la etiqueta es numerica', { label: 7, latitude: 1, longitude: 1 }],
    ['falta la etiqueta', { latitude: 1, longitude: 1 }],
    ['el proveedor es null', null],
    ['el proveedor es undefined', undefined],
    ['el proveedor es un arreglo', [1, 2]],
    ['el proveedor es una cadena', 'Biblioteca'],
    ['el proveedor es un numero', 42],
    ['el proveedor es un error representado como dato', { error: 'rate_limited' }],
  ])('usa la captura manual cuando %s', (_caso, provider) => {
    expect(selectIncidentLocation(provider, MANUAL)).toEqual(FALLBACK);
  });

  test('la alternativa manual no trae coordenadas y conserva el texto tal cual', () => {
    const result = selectIncidentLocation({ label: 'X', latitude: 999, longitude: 0 }, '  Sala 3 ');
    expect(Object.keys(result).sort()).toEqual(['label', 'source']);
    expect(result.label).toBe('  Sala 3 ');
  });

  test('conserva la etiqueta del proveedor sin recortarla', () => {
    expect(selectIncidentLocation({ label: ' Biblioteca ', latitude: 1, longitude: 2 }, MANUAL)).toEqual({
      source: 'provider', label: ' Biblioteca ', latitude: 1, longitude: 2,
    });
  });

  test('no muta las entradas', () => {
    const valid = Object.freeze({ label: 'Biblioteca', latitude: 1, longitude: 2 });
    const invalid = Object.freeze({ label: '', latitude: 1, longitude: 2 });
    const before = JSON.stringify([valid, invalid]);
    selectIncidentLocation(valid, MANUAL);
    selectIncidentLocation(invalid, MANUAL);
    expect(JSON.stringify([valid, invalid])).toBe(before);
  });
});