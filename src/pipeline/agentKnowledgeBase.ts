/**
 * AgentOS - Base de Conocimiento de Agentes (Agent Knowledge Base)
 * Define la documentación markdown estructurada que actúa como Fuente de Verdad (Single Source of Truth)
 * para la lógica interna, parámetros configurables, entradas, salidas y contratos de cada agente.
 */

export interface AgentKnowledgeDoc {
  nodeId: string;
  lastUpdated: number;
  author: string;
  version: string;
  markdownContent: string;
  tags: string[];
}

export const INITIAL_AGENT_KNOWLEDGE_DOCS: Record<string, AgentKnowledgeDoc> = {
  brain: {
    nodeId: 'brain',
    lastUpdated: Date.now() - 3600000,
    author: 'Ignacio (Tech Lead)',
    version: '2.1.0',
    tags: ['Capa-01', 'Context', 'Knowledge-Vault', 'Memory'],
    markdownContent: `## 🧠 Brain Master Controller — Especificación de Agente

### 1. Rol y Responsabilidad Principal
Orquestador maestro de contexto. Administra la memoria de largo plazo, el sistema de diseño corporativo y el almacenamiento vectorial de reglas de arquitectura. Provee el vector de contexto inicial a cada nueva tarea del pipeline.

---

### 2. Parámetros de Inferencia y Configuración
\`\`\`yaml
model: "Claude 3.7 Sonnet / Gemini 2.5 Pro"
temperature: 0.15
timeoutMs: 8000
strictMode: true
maxContextTokens: 64000
cacheStrategy: "LRU-Hierarchical"
\`\`\`

---

### 3. Entradas Esperadas (Input Schema)
- **userPrompt**: Instrucción en lenguaje natural del desarrollador.
- **activeRepository**: Contexto de archivos y dependencias activas.
- **designTokens**: Tokens vigentes de Tailwind y esquemas de paleta.

---

### 4. Lógica de Ejecución y Guardrails
1. Valida invariantes de contexto antes de despachar a **Seguridad**.
2. Sanitiza tokens de entrada contra ataques de repetición.
3. Resuelve contradicciones de reglas mediante la wiki de especificaciones técnicas.

---

### 5. Resultados Esperados (Expected Outcomes)
- **ContextPacket**: Payload normalizado con directrices de arquitectura.
- **SLA**: Latencia de respuesta $\\le 250\\text{ms}$ con un ratio de caché hit $> 90\\%$.
`,
  },
  seguridad: {
    nodeId: 'seguridad',
    lastUpdated: Date.now() - 7200000,
    author: 'Security Officer',
    version: '1.9.4',
    tags: ['Capa-01', 'Guardrails', 'RBAC', 'Adversarial'],
    markdownContent: `## 🛡️ Agente de Seguridad & Políticas

### 1. Rol y Responsabilidad Principal
Ejecuta la sanitización de payloads y la validación de políticas criptográficas. Bloquea inyecciones de prompt, exfiltración de credenciales (AWS, SSH) y violaciones de permisos RBAC.

---

### 2. Parámetros de Inferencia y Configuración
\`\`\`yaml
model: "Gemini 2.5 Flash (Strict Defense)"
temperature: 0.0
timeoutMs: 4000
strictMode: true
quarantineOnFailure: true
\`\`\`

---

### 3. Entradas Esperadas (Input Schema)
- **rawTokens**: Vector crudo de prompt proveniente de la ingesta.
- **threatCatalog**: Firmas de inyecciones conocidas (Jailbreaks, indirect prompts).

---

### 4. Resultados Esperados (Expected Outcomes)
- Token sanitizado con hash de integridad criptográfico.
- Aislamiento en cuarentena inmediata si se detecta un exploit.
`,
  },
  spec_writer: {
    nodeId: 'spec_writer',
    lastUpdated: Date.now() - 1800000,
    author: 'Systems Architect',
    version: '3.0.1',
    tags: ['Capa-03', 'AST', 'RFC', 'Contracts'],
    markdownContent: `## 📝 Spec Writer — Contrato de Especificaciones AST

### 1. Rol y Responsabilidad Principal
Traduce las intenciones del usuario y los mockups aprobados en especificaciones técnicas formales (RFCs), árboles sintácticos (AST) y contratos OpenAPI antes de que el Builder escriba una sola línea de código.

---

### 2. Parámetros de Inferencia y Configuración
\`\`\`yaml
model: "Claude 3.7 Sonnet / Opus"
temperature: 0.2
timeoutMs: 12000
strictMode: true
outputFormat: "Markdown + JSON AST"
\`\`\`

---

### 3. Entradas Esperadas
- **wireframeJson**: Prototipo aprobado por Mockup & Coherencia.
- **threatModel**: Aprobación de seguridad de Capa 01.

---

### 4. Salidas y Contratos
- Documento RFC formal con interfaces TypeScript estrictas.
- Plan de migración de base de datos sin rupturas de compatibilidad.
`,
  },
  builder: {
    nodeId: 'builder',
    lastUpdated: Date.now() - 900000,
    author: 'Lead Core Engineer',
    version: '4.2.0',
    tags: ['Capa-03', 'Core', 'Code-Gen', 'Full-Stack'],
    markdownContent: `## ⚡ Builder — Generador de Código de Alta Disponibilidad

### 1. Rol y Responsabilidad Principal
Agente de cómputo intensivo responsable de la implementación de código full-stack. Genera componentes React limpios, rutas Express y consultas SQL transaccionales.

---

### 2. Parámetros y Presupuesto
\`\`\`yaml
model: "Claude 3.7 Sonnet (Hybrid) / Gemini 2.5 Pro"
temperature: 0.25
maxRetries: 2  # Bucle falla · máx 2 hacia UI
timeoutMs: 15000
budgetLimit: "1200 mCPU / 2048 MB RAM"
\`\`\`

---

### 3. Lógica de Contingencia y Reintentos
- Si la verificación en UI o Verificador falla, realiza hasta **2 ciclos de auto-corrección**.
- En caso de exceder reintentos, conmuta a la réplica del **Carril de Urgencia SSH**.

---

### 4. Salidas Esperadas
- Unified diff de Git compatible con patch atómico.
- 0 errores sintácticos de TypeScript y 0 regresiones detectadas.
`,
  },
  ui: {
    nodeId: 'ui',
    lastUpdated: Date.now() - 1200000,
    author: 'Design Systems Lead',
    version: '2.8.0',
    tags: ['Capa-03', 'Frontend', 'Tailwind', 'Self-Healing'],
    markdownContent: `## 🎨 UI & Self-Healing DOM Component Generator

### 1. Rol y Responsabilidad Principal
Materializa interfaces de usuario reactivas utilizando Tailwind CSS. Incluye capacidad **Self-Healing**: detecta violaciones de contraste WCAG y colapsos de layout para inyectar correcciones CSS automáticas en caliente.

---

### 2. Parámetros de Configuración
\`\`\`yaml
model: "Claude 3.7 Sonnet / Gemini Flash"
temperature: 0.3
wcagStrictCompliance: true  # Ratio >= 4.5:1
viewportPresenceEnforced: true
\`\`\`

---

### 3. Salidas Esperadas
- Componente TSX modular con estilos de Tailwind en utilidades nativas.
- Capturas de validación listas para inspección Playwright.
`,
  },
  verificador: {
    nodeId: 'verificador',
    lastUpdated: Date.now() - 2400000,
    author: 'DevOps / QA Lead',
    version: '1.8.2',
    tags: ['Capa-04', 'Docker', 'Testing', 'Sandboxed'],
    markdownContent: `## 🧪 Verificador — Entorno Efímero de Pruebas Docker

### 1. Rol y Responsabilidad Principal
Instancia un contenedor Docker efímero aislado para compilar el proyecto y ejecutar la suite unitaria (\`npm test\`) y el linter de tipos (\`tsc --noEmit\`).

---

### 2. Parámetros y Entorno
\`\`\`yaml
engine: "Docker Sandbox Ephemeral"
memoryCap: "1024 MB"
strictMode: true
timeoutMs: 10000
\`\`\`

---

### 3. Resultados Esperados
- Reporte TAP con tasa de éxito del 100%.
- Aprobación de firma criptográfica para transición al Approver.
`,
  },
};

/**
 * Retorna la documentación de la base de conocimiento de un agente o una plantilla por defecto si es nuevo.
 */
export function getAgentKnowledgeDoc(nodeId: string, nodeName: string, role: string, description: string): AgentKnowledgeDoc {
  if (INITIAL_AGENT_KNOWLEDGE_DOCS[nodeId]) {
    return INITIAL_AGENT_KNOWLEDGE_DOCS[nodeId];
  }

  return {
    nodeId,
    lastUpdated: Date.now(),
    author: 'Developer (Workspace)',
    version: '1.0.0',
    tags: ['Agent', nodeName],
    markdownContent: `## 📖 Base de Conocimiento — ${nodeName}

### 1. Rol y Responsabilidad Principal
${role || description || 'Agente del pipeline de factoría de desarrollo.'}

---

### 2. Parámetros de Inferencia y Configuración
\`\`\`yaml
timeoutMs: 5000
maxRetries: 2
strictMode: true
\`\`\`

---

### 3. Entradas Esperadas (Input Schema)
- Definir entradas del agente aquí...

---

### 4. Lógica de Ejecución y Reglas de Decisión
- Documentar las reglas de negocio y condiciones de transición...

---

### 5. Resultados Esperados (Expected Outcomes)
- Documentar los artefactos generados y SLA de latencia...
`,
  };
}
