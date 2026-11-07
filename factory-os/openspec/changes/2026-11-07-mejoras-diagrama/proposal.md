# Change (PENDIENTE de decisión de Ignacio): mejoras-diagrama

Propuestas sobre el diagrama de referencia, detectadas al convertirlo en un motor ejecutable. Ninguna está aplicada:
`openspec/specs/` refleja el diagrama tal cual. Cada una indica el delta que supondría.

## 1. Approver: separar "quórum" de "juicio" — PARCIALMENTE APLICADO (2026-11-07)
Aplicado, por alineación con la constitución (O2, O9): el quórum ya lo deciden los veredictos de los revisores
(ENG-012). Sigue pendiente decidir si Approver conserva su propio juicio de modelo (hoy sí, con tasa configurable).
**Hoy:** Approver (Sonnet 5.5 · 4/4) es a la vez la puerta de quórum y un modelo que puede rechazar (15 % en la simulación).
Si los 4 votos ya son verdes, un rechazo del propio Approver gasta un retrabajo completo (Builder + 4 revisiones).
**Propuesta:** Approver = puerta determinista que solo agrega votos; el juicio de modelo pasa a ser un 5.º voto paralelo.
**Tradeoff:** un nodo más; a cambio, un rechazo indica qué revisor falló y el retrabajo puede limitarse a esa rama.
**Delta:** MODIFIED WF-002, ENG-004.

## 2. Retrabajo dirigido en vez de reinicio total
**Hoy:** "falla · máx 2" devuelve a Builder y repite las 4 revisiones.
**Propuesta:** si solo falló Seguridad, repetir Builder → Seguridad y conservar los votos verdes cuyo diff no cambió.
**Tradeoff:** más lógica de invalidación (hash del diff por voto); a cambio, menos coste de modelos y menos tiempo de ciclo.
**Delta:** MODIFIED ENG-004.

## 3. Dos aprobaciones humanas seguidas en el carril estándar
**Hoy:** Tu OK → main local → Producción (Ignacio · deploy) son dos esperas humanas por tarea. En la simulación,
"Tu OK" es el cuello de botella dominante en cuanto hay volumen.
**Opciones:** (a) un único OK que cubra fusión y despliegue; (b) despliegue por lotes con un OK por lote;
(c) mantener las dos esperas (máximo control).
**Delta:** MODIFIED WF-002/003, ENG-005.

## 4. Carril de urgencia sin verificación previa
**Hoy:** Carril urgencia → main local directo, con Seguridad a posteriori (<24 h).
**Propuesta:** pasar por Verificador en modo "smoke" (≤ 60 s) antes de main local; Seguridad sigue a posteriori.
**Tradeoff:** un minuto más en un hotfix frente a desplegar algo que no arranca.
**Delta:** MODIFIED WF-004.

## 5. Accesibilidad de la paleta de la leyenda
El validador de paletas da para los 7 colores del diagrama, sobre fondo oscuro: rosa (Policy) ↔ verde (Agent logic)
ΔE 4,6 en deuteranopía, y naranja (Tool action) ↔ rosa ΔE 12,5 en visión normal (umbral 15). En `factory-os` ya se
compensa con un distintivo textual por categoría, pero el diagrama original depende solo del color.
**Propuesta:** reasignar Tool action a un ámbar más claro o añadir un distintivo textual también en el diagrama.

## 6. Analyze en categoría Policy
Analyze clasifica y enruta (investigar / pantalla nueva / spec / parche): funcionalmente es un gateway. En el
diagrama aparece como Policy (rojo), igual que Seguridad y Verificador, lo que sugiere que bloquea.
**Propuesta:** categoría Agent logic o Tool action. Cambio cosmético, sin delta de motor.
