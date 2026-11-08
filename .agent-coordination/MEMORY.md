# MEMORY · agentos-factor-a

- Topología Canónica Oficial de Factory OS (2026-11-07): La topología oficial es la de 25 nodos en 5 capas y 9 columnas (Entrada/Filtro/Analyze → Spec/Coherencia/Builder/Verificador → 4 Revisores paralelos → Approver/Evaluación/Evidencia/Tu OK → urgencia/main local/Producción). Preservada en commit `bbadc99`. No se debe reorganizar la disposición del diagrama para forzar encuadres; los problemas de visualización se resuelven en el viewport/zoom de ReactFlow.
- Extensión VS Code (2026-11-07): Fusión de `listo/ext1` completa (commit `541dfc2`).
- Despliegue Docker (2026-11-07): Servicio web redesplegado en 127.0.0.1:8094 con bundle verificado.
