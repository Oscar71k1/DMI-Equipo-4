# ADR-001 — Organizar el código para trabajar en equipo

## Contexto: qué problema queremos resolver

Somos un equipo de tres personas y necesitamos una forma común de organizar CampusOps. Si cada quien mezcla pantallas, reglas y conexiones a su manera, juntar el trabajo puede ser difícil y provocar errores.

En el estado anterior a la refactorización, `App.tsx` llamaba directamente al cliente del servidor mientras dibujaba la pantalla. Esa dependencia obligaba a la UI a conocer al proveedor. En el esqueleto actual, `App.tsx` sólo monta la UI y las acciones creadas en composición; la consulta de salud pasa por aplicación y un puerto de dominio.

Esta semana necesitamos mostrar una lista de incidencias y abrir su detalle con datos ficticios. Más adelante agregaremos sesión, almacenamiento y ubicación. Mantendremos React Native, Expo y TypeScript, como pide el proyecto.

## Alternativas: qué opciones tenemos

### Opción 1. Separar el código según el trabajo que hace

Tener cuatro carpetas principales: pantallas, acciones de la app, reglas y acceso a datos. Sus nombres en el código serán `ui`, `application`, `domain` e `infrastructure`.

- **A favor:** es una estructura pequeña y fácil de explicar entre los tres.
- **En contra:** para revisar una función completa, como consultar una incidencia, habrá que abrir archivos de varias carpetas.

### Opción 2. Separar primero por funciones de la app

Tener una carpeta para incidencias, otra para sesión y otras según crezca la aplicación. Dentro de cada una, separar también pantallas, acciones, reglas y acceso a datos.

- **A favor:** los archivos de una función quedan juntos y cada integrante puede trabajar en una parte.
- **En contra:** hay más divisiones y debemos decidir dónde poner el código que varias partes necesitan. Para la lista y el detalle de esta semana resulta más complicado.

  Por ejemplo, si necesitamos saber quién es el usuario actual y qué permisos tiene, ese código lo necesitarían tanto la función de incidencias como la de sesión. Con la Opción 1 tiene un lugar claro (`domain`); con la Opción 2 no está definido en qué carpeta debería vivir.

Las dos opciones permiten probar y cambiar la fuente de datos si acordamos cómo se conectan sus partes.

## Decisión: qué vamos a hacer

Elegimos la opción 1 porque es más sencilla para el tamaño actual del proyecto.

| Parte | Qué hará |
|---|---|
| Pantallas — UI | Mostrar la lista, el detalle y los mensajes al usuario. |
| Acciones — Aplicación | Coordinar tareas, como pedir la lista o buscar una incidencia por su identificador. |
| Reglas y datos — Dominio | Definir qué contiene una incidencia, sus reglas y qué operaciones necesitamos para consultarla. |
| Acceso a datos — Infraestructura | Obtener los datos. Esta semana usará información ficticia guardada en memoria. |

Las pantallas pedirán las tareas a aplicación. Aplicación usará un contrato definido en dominio: un acuerdo escrito en código que indica qué se puede pedir y qué debe devolverse. Infraestructura cumplirá ese acuerdo al entregar los datos.

Un archivo separado conectará las partes al iniciar la app. Las pantallas no llamarán directamente al servidor ni al almacenamiento. Dominio no dependerá de pantallas, Expo o conexiones de red.

Antes de dividir el trabajo, acordaremos qué datos devuelve una lista, qué devuelve un detalle y qué ocurre si una incidencia no existe. Así podremos avanzar por separado y después conectar nuestras partes.

### Contrato acordado entre Jarumi y Fer

**Campos mínimos de una incidencia** (reutilizando el vocabulario de `src/campusops/contracts.ts`):

```typescript
type Incident = Readonly<{
  id: string;
  category: IncidentCategory;
  description: string;
  location: IncidentLocation;
  status: IncidentStatus;
  work: IncidentWork;
}>;
```

**Operaciones del contrato de dominio:**

- `list(): Promise<readonly Incident[]>` — devuelve la lista completa de incidencias. Una lista vacía es un resultado válido. El fake copia los datos de entrada y sus respuestas para evitar que un consumidor modifique el estado de otras consultas.
- `getById(id: string): Promise<Incident | null>` — devuelve la incidencia solicitada o `null` si no existe. Nunca se inventa información.

**Mensajes de la UI:**

- Lista vacía: "No hay incidencias registradas todavía."
- Detalle no encontrado: "No se encontró la incidencia solicitada."
- Error inesperado: "Ocurrió un problema al cargar la información. Intenta de nuevo."

**Composición e indicador de salud heredado:** la raíz de composición conecta los adaptadores concretos (incluyendo el indicador de salud heredado de `src/api/courseBackend`) con los casos de uso de aplicación, a través de un contrato de dominio. La pantalla no importa directamente ese cliente.

**Clasificación de `src/campusops/contracts.ts`:** se trata como vocabulario de dominio compartido, aunque su ruta original se conserve fuera de la carpeta `domain/`.

**Rutas implementadas:** `src/domain/Incident.ts` define el modelo y `IncidentRepository.ts` su puerto; `src/application/createIncidentQueries.ts` coordina las consultas; `src/infrastructure/InMemoryIncidentRepository.ts` implementa el fake. `src/composition/createCampusOps.ts` conecta esas piezas y el adaptador de salud. `src/ui/CampusOpsScreen.tsx` muestra el indicador heredado y selecciona lista/detalle; sus pantallas reciben acciones, sin importar composición. El puerto de salud se llama `BackendHealthPort`; lo implementa `CourseBackendHealthAdapter`, que utiliza el cliente `src/api/courseBackend.ts`. El cliente por sí solo no implementa ese puerto.

**Presentación:** los identificadores del contrato permanecen en inglés; `src/ui/incidentLabels.ts` traduce categorías y estados para mostrarlos en español. Al cambiar la consulta de lista o el identificador del detalle, la pantalla vuelve a carga y deja de mostrar los datos anteriores mientras espera la nueva respuesta.

Los perfiles de reportante, técnico y coordinador se definirán en dominio. Dejaremos previstos los límites de sesión, almacenamiento y ubicación para las semanas correspondientes. Cuando se implementen los permisos, el servidor también deberá comprobar qué puede hacer cada usuario.

## Consecuencias: qué ganamos y qué nos cuesta

- **Pruebas más fáciles:** podremos probar las pantallas con datos ficticios sin tener el servidor encendido.
- **Menos ajustes al juntar el trabajo:** todos seguiremos el mismo acuerdo para pedir y entregar datos. Si ese acuerdo cambia, tendremos que revisarlo juntos.
- **Cambios más localizados:** después podremos conectar otra fuente de datos manteniendo el mismo acuerdo. Todavía será necesario comprobar sus respuestas y manejar sus errores.
- **Más archivos:** esta organización requiere más archivos que poner todo en una pantalla. Aceptamos ese trabajo extra para mantener separadas las responsabilidades.

Revisaremos la decisión si el proyecto crece y esta organización empieza a dificultar encontrar o cambiar el código.

## Cómo comprobaremos que funciona

1. Abrir la lista y consultar el detalle de una incidencia ficticia.
2. Cambiar la fuente de datos por otra de prueba sin cambiar las pantallas ni las acciones de aplicación.
3. Probar una lista vacía y una incidencia que no exista. La app debe explicar lo ocurrido sin cerrarse ni inventar información.
4. Revisar qué archivos usan a otros. Conservar la evidencia de la llamada directa anterior de la pantalla al cliente del servidor y comprobar que el estado corregido respeta los límites.
 Esta detección se realiza con una prueba automática (`tests/architecture.test.ts`) que analiza los imports reales del código, en vez de depender de una revisión manual.
5. Comprobar que el dibujo de `docs/architecture.mmd` coincida con el código y ejecutar las revisiones de semana 2, conservando las de semana 1.

Las comprobaciones de cada aportación se conservan con su procedencia en las evidencias de Semana 02. El cierre del equipo requiere repetirlas sobre la versión integrada y actualizar sus reportes; una ejecución sobre una rama de trabajo no equivale a validar la etiqueta final.

## Referencias

- [Aclaración de semana 2](../../ACLARACION_ANTES_DE_INICIAR.md).
- [Actividad de arquitectura](../assignments/week-02.md).
- [Alcance de CampusOps](../CAMPUSOPS.md).

## Asistencia utilizada

Se usó IA para ayudar a redactar este documento a partir del proyecto. El equipo todavía debe revisarlo y comprobar que el código cumpla lo acordado.
