# Change: gobierno-constitucion (archivado 2026-11-07)

## Why
Revisión del README "AgentOS / Factoría 3" contra la constitución real de lyai-factory. El motor incumplía O9 (reintentaba
revisores) y O2 (el rechazo lo decidía Approver al azar, no los veredictos), y no implementaba O1 (parar la línea) ni
dejaba rastro auditable de las decisiones humanas.

## What Changes
- MODIFIED ENG-004: el retrabajo lo provocan veredictos no aprobados o el juicio de Approver.
- ADDED ENG-012 contrato de veredicto (aprobado/rechazado/blocked; estilo no bloquea; revisores sin reintento).
- ADDED ENG-013 parar la línea (blocked, revisión a posteriori negativa, andon manual).
- ADDED API-007 control de la línea por API · API-008 auditoría encadenada por hash y verificación.
- ADDED PER-004 audit_log de solo inserción (trigger) y cadena continua tras reinicio. Migración 2.
- ADDED UI-006 banner de línea parada, andon, veredictos/hallazgos por paso, impacto aguas abajo.

## Descartado del README revisado (y por qué)
- Topología de 14 nodos con nombres propios: diverge del diagrama de referencia (25 nodos), que es la fuente.
- Firmas Ed25519 con claves generadas por el servidor: no prueban autoría; la firma real es la SSH de Ignacio.
- Modelos `gemini-3.8-flash`, `gemini-4-argon`: no verificados; además ningún nodo llama a modelos sin OK de Ignacio.
- Migración ETL de Factorías 1–4 con "100 % de reconciliación": sin acceso a los datos de origen, no es verificable aquí.
- Canary 10/50/100 % y supervisor de rollback: cambio de diagrama, queda como propuesta para decisión de Ignacio.
