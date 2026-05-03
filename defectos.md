# Registro de Defectos -- Pruebas de Carga y Rendimiento

Curso: Testing y Validación de Software\
Proyecto: Pruebas de Carga y Rendimiento\
Equipo: \[Nombre del equipo\]\
Fecha: \[Fecha\]

------------------------------------------------------------------------

## Introducción

Este documento recopila los defectos identificados durante la ejecución
de pruebas de rendimiento (Baseline, Load, Stress, Spike, Soak y
Regresión).\
Cada defecto se documenta para garantizar trazabilidad, análisis técnico
y propuesta de mejora.

------------------------------------------------------------------------

# Formato 1: Lista detallada

## Defecto PERF-01 --- Campo de **id** no soporta las cedulas de 10 digitos

-   Escenario: Baseline/Load/Stress (register_voter_k6.js) \
-   Resultado esperado: Registro exitoso con un un documento real \
-   Resultado obtenido: Numeric value out of range of int \
-   Causa: Los documentos estan definidos como int pero las cedulas al ser de 10 digitos superan el rango establecido para un dato tipo int \
-   Impacto: Los requests fallan
-   Prioridad: Alta

### Evidencia
``` java 
 Numeric value (5131999541) out of range of int (-2147483648 - 2147483647)
```
Esta fue la salida que se mostro en la terminal de spring al tratar de correr la prueba

### Estado
Abierto

------------------------------------------------------------------------

## Defecto PERF-02 --- Registro concurrente causa HTTP 500

-   Capa afectada: Servidor de aplicación\
-   Escenario: Load/Stress (200 - 600 VUs)\
-   SLO definido: Error rate \< 1%\
-   Resultado esperado: Responda con DUPLICATED para id repetidos
-   Resultado obtenido: **JdbcSQLIntegrityConstraintViolationException**,dos VUs pasan el existsById simultáneamente e intentan insertar el mismo id
-   Causa: No hay manejo de transacciones para registerVoter
-   Prioridad: Alta

### Evidencia
``` java 
JdbcSQLIntegrityConstraintViolationException: Unique index or primary key violation
```

### Estado
Abierto


------------------------------------------------------------------------

## Defecto PERF-03 --- body VALID falla al 100% en cualquier prueba

-   Escenario: Baseline/Load/Stress 
-   Resultado esperado: register_failed rate < 1%
-   Resultado obtenido: register_failed = 100%
-   Causa: La app responde con DUPLICATED en lugar de VALID por que la base de datos almacenada en memoria persiste entre ejecuciones y los id se van acabando.
-   Prioridad: Media

### Estado
Abierto

------------------------------------------------------------------------

# Formato 2: Tabla de seguimiento
| ID      | Escenario           | Resultado Esperado                         | Resultado Obtenido                                      | Estado  | Prioridad |
|---------|--------------------|--------------------------------------------|---------------------------------------------------------|--------|-----------|
| PERF-01 | Baseline / Load / Stress | Registros exitosos con documentId real     | HTTP 400  — int out of range                      | Abierto | Alta      |
| PERF-02 | Load / Stress      | Respuesta DUPLICATED para IDs repetidos    | HTTP 500 — condición de carrera en inserción concurrente | Abierto | Alta   |
| PERF-03 | Baseline / Load / Stress | register_failed rate < 1%                  | register_failed = 100% — BD  persiste entre ejecuciones | Abierto | Media     |

------------------------------------------------------------------------

## Convenciones de Estado

Abierto: Defecto identificado sin corrección aplicada.\
En progreso: En proceso de corrección.\
Resuelto: Corregido y validado con nuevas pruebas.

------------------------------------------------------------------------

Universidad de La Sabana -- Facultad de Ingeniería\
Curso: Testing y Validación de Software (2025-1)
