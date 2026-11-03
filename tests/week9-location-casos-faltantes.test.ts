import { selectIncidentLocation } from '../src/domain/selectIncidentLocation';

describe('selectIncidentLocation: casos faltantes de la guia', () => {
  test('null devuelve la captura manual sin coordenadas', () => {
    const result = selectIncidentLocation(null, 'Edificio A, planta baja');
    expect(result).toEqual({ source: 'manual', label: 'Edificio A, planta baja' });
    expect(result).not.toHaveProperty('latitude');
    expect(result).not.toHaveProperty('longitude');
  });

  test('etiqueta del proveedor solo con espacios cae a captura manual', () => {
    const result = selectIncidentLocation({ label: '   ', latitude: 10, longitude: 20 }, 'Referencia manual');
    expect(result).toEqual({ source: 'manual', label: 'Referencia manual' });
  });

  test('etiqueta del proveedor con espacios alrededor se conserva sin recortar', () => {
    const result = selectIncidentLocation({ label: '  Edificio B  ', latitude: 10, longitude: 20 }, 'x');
    expect(result).toEqual({ source: 'provider', label: '  Edificio B  ', latitude: 10, longitude: 20 });
  });

  test('la etiqueta manual se devuelve tal como se recibio, sin recortar', () => {
    const result = selectIncidentLocation(null, '  Zona norte  ');
    expect(result).toEqual({ source: 'manual', label: '  Zona norte  ' });
  });

  test('acepta coordenadas exactamente en los limites (±90, ±180) y (0, 0)', () => {
    const resMax = selectIncidentLocation({ label: 'Limite Max', latitude: 90, longitude: 180 }, 'Manual');
    expect(resMax).toEqual({ source: 'provider', label: 'Limite Max', latitude: 90, longitude: 180 });

    const resMin = selectIncidentLocation({ label: 'Limite Min', latitude: -90, longitude: -180 }, 'Manual');
    expect(resMin).toEqual({ source: 'provider', label: 'Limite Min', latitude: -90, longitude: -180 });

    const resZero = selectIncidentLocation({ label: 'Origen Zero', latitude: 0, longitude: 0 }, 'Manual');
    expect(resZero).toEqual({ source: 'provider', label: 'Origen Zero', latitude: 0, longitude: 0 });
  });

  test('cae a manual ante coordenadas fuera de rango, NaN, Infinity o cadenas', () => {
    expect(selectIncidentLocation({ label: 'Mal', latitude: 90.0001, longitude: 0 }, 'Manual')).toEqual({ source: 'manual', label: 'Manual' });
    expect(selectIncidentLocation({ label: 'Mal', latitude: 0, longitude: -180.0001 }, 'Manual')).toEqual({ source: 'manual', label: 'Manual' });
    expect(selectIncidentLocation({ label: 'NaN', latitude: NaN, longitude: 0 }, 'Manual')).toEqual({ source: 'manual', label: 'Manual' });
    expect(selectIncidentLocation({ label: 'Inf', latitude: 0, longitude: Infinity }, 'Manual')).toEqual({ source: 'manual', label: 'Manual' });
    expect(selectIncidentLocation({ label: 'String', latitude: '19.43' as any, longitude: -99.13 as any }, 'Manual')).toEqual({ source: 'manual', label: 'Manual' });
  });

  test('garantiza inmutabilidad del objeto de entrada', () => {
    const entrada = { label: 'Original', latitude: 19.43, longitude: -99.13 };
    const copia = { ...entrada };
    selectIncidentLocation(entrada, 'Manual');
    expect(entrada).toEqual(copia);
  });
});