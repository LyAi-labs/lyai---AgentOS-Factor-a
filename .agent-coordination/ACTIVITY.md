# Registro de Actividad

- 2026-11-07 10:54 UTC · **Factoría (`cerrar.py`)** · Fusionada `listo/20261107-100409-a3b09998ec0b` (Restauración de la topología canónica oficial de Factory OS en el lienzo) en `claude/compassionate-wozniak-2h4ztu` (`fbe9eed6`, 1 commit(s)) tras OK de Ignacio. Sin push ni despliegue.
- 2026-11-07 11:12 UTC · **Factoría (`cerrar.py`)** · Fusionada `listo/20261107-100409-a3b09998ec0b` (Restauración de la topología canónica oficial de Factory OS en el lienzo) en `claude/compassionate-wozniak-2h4ztu` (`5a165a15`, 0 commit(s)) tras OK de Ignacio. Sin push ni despliegue.

## 2026-11-07 11:20 UTC · Claude Code (server) — topología canónica restaurada + ext1 fusionada
- ⚠️ **Para Antigravity**: a las 11:04 se hizo `git revert` (5a165a1) del commit fbe9eed «restaurar topologia canonica oficial». Ignacio confirma que la topología canónica es **la de nuestra Factoría hecha a mano** (Entrada/Filtro/Analyze → Spec/Coherencia/Builder/Verificador → Revisión en paralelo (4) → Approver/Evaluación/Evidencia/Tu OK → urgencia/main local/Producción). Re-aplicada en **bbadc99**. **No la reviertas** sin OK de Ignacio.
- Fusionada `listo/ext1` (extensión VS Code) con --no-ff.
- Tests: shared 9/9 · web 11/11 · server 29 ok + 4 skipped.
- Redesplegado solo `web` (`docker-compose -f docker-compose.yml -f docker-compose.traefik.yml up -d --build web`) → `factory-os-web-1` healthy; bundle servido en 127.0.0.1:8094 contiene «Revisión en paralelo». Sin push.
- Verificable: `git log --oneline -4` · `curl -s 127.0.0.1:8094/assets/<index>.js | grep -c "Revisión en paralelo"` → 1.

## 2026-11-07 11:21 UTC · Antigravity (AGY) — Cierre de sesión y lección de calibración de lienzo
- **Alineación de topología canónica**: Confirmada la preservación inmutable de la topología oficial hecha a mano (25 nodos en 5 capas y 9 columnas, commit `bbadc99`). Verificado que el lienzo muestra el grafo canónico y que el bundle de producción servido en 127.0.0.1:8094 contiene la topología completa.
- **Calibración del lienzo**: Documentada la lección técnica en la Wiki sobre calibración de `defaultViewport` / `minZoom` en ReactFlow frente al error de intentar reordenar nodos topológicos.
- **Extensión VS Code**: Verificada la fusión de `listo/ext1` en la rama de trabajo.
- **Persistencia**: Registrada lección en wiki compartida (`lesson-2026-11-07-factory-os-calibracion-lienzo-vs-topologia.md`), notificado canal Aurelius y ejecutado check de cierre AUR-065.
- 2026-11-08 03:20 UTC · **Factoría (`cerrar.py`)** · Fusionada `listo/20261108-031745-ead8ce390140` (Compactación de cabecera y calibración de centrado del diagrama en Factory OS) en `claude/compassionate-wozniak-2h4ztu` (`12c2b12b`, 1 commit(s)) tras OK de Ignacio. Sin push ni despliegue.
