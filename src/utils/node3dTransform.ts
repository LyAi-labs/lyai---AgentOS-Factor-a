/**
 * node3dTransform.ts
 * Capa de transformación 3D para el componente NodeGraphCanvas y depurador en NodeInspectorModal.
 * Calcula valores dinámicos de CSS 'transform: translateZ()' para los nodos
 * en función de su ruta activa (activeTaskPathNodeIds), intensidad de actividad,
 * nivel de clúster arquitectónico o ajuste manual (override).
 */

export type Transform3DMode = 'activity' | 'cluster' | 'hybrid' | 'off';

export interface Node3DElevationParams {
  nodeId: string;
  layer?: number | string; // 1 | 2 | 3 | 4 | 5 o 'layer1'..'layer5'
  isNodeExecuting: boolean;
  isPathStep: boolean;
  isInspected: boolean;
  isHovered: boolean;
  isBottleneck: boolean;
  heatScore?: number; // 0 - 100
  totalExecutions?: number;
  mode: Transform3DMode;
  depthScale?: number; // Multiplicador de profundidad (ej. 1.0, 1.4)
  activeTaskPathNodeIds?: string[]; // Secuencia activa de la ruta
  manualZOverride?: number | null; // Override manual de profundidad Z desde el NodeInspectorModal
  isEditMode3DDisabled?: boolean; // Toggle para desactivar temporalmente 3D durante edición de grafos
}

export interface Node3DElevationResult {
  zElevation: number; // Elevación efectiva en píxeles para translateZ()
  autoCalculatedZ: number; // Valor Z calculado dinámicamente antes de override manual
  isManualOverride: boolean; // Indica si el valor proviene de un override manual del usuario
  scaleBonus: number; // Factor de escala óptico para reforzar la perspectiva
  boxShadow: string; // Sombra volumétrica del nodo elevado
  groundShadow: {
    offsetX: number;
    offsetY: number;
    blur: number;
    spread: number;
    opacity: number;
    color: string;
  };
  badgeLabel: string;
  badgeTone: 'cyan' | 'indigo' | 'rose' | 'amber' | 'slate' | 'emerald';
}

/**
 * Calcula la profundidad Z para los nodos basándose en activeTaskPathNodeIds.
 * Transiciona los nodos de la ruta activa a un plano elevado (hasta 100px, con escalones
 * progresivos 50px -> 100px o 100px directo en ejecución) y los nodos inactivos a 0px.
 */
export function calculatePathStepElevation(params: {
  nodeId: string;
  activeTaskPathNodeIds: string[];
  isNodeExecuting: boolean;
  minZ?: number; // Cota inicial de ruta (ej: 50px)
  maxZ?: number; // Cota principal de ruta activa (100px)
}): number {
  const {
    nodeId,
    activeTaskPathNodeIds,
    isNodeExecuting,
    minZ = 50,
    maxZ = 100,
  } = params;

  const stepIndex = activeTaskPathNodeIds.indexOf(nodeId);
  // Nodos fuera de activeTaskPathNodeIds y no en ejecución van a 0px
  if (stepIndex === -1 && !isNodeExecuting) {
    return 0;
  }

  if (isNodeExecuting) {
    return maxZ; // 100px en el nodo activo
  }

  const totalSteps = activeTaskPathNodeIds.length;
  if (totalSteps <= 1) {
    return maxZ;
  }

  // Profundidad creciente a lo largo de la ruta activa (ej: 50px -> 75px -> 100px)
  const progressRatio = stepIndex / (totalSteps - 1);
  return Math.round(minZ + progressRatio * (maxZ - minZ));
}

/**
 * Obtiene la cota Z base de un clúster o capa arquitectónica (C1 a C5).
 */
export function getClusterBaseElevation(layer?: number | string): number {
  const layerStr = String(layer || '1').toLowerCase();
  if (layerStr.includes('5')) return 65; // Entornos, Benchmark Lab, Producción
  if (layerStr.includes('4')) return 50; // Carriles, Código, Approver, Tu OK
  if (layerStr.includes('3')) return 35; // Flujo principal, UI, Evidencia
  if (layerStr.includes('2')) return 20; // Exploración, Mockup, UX, Telemetría
  return 10; // Memoria, Seguridad, Brain (Capa 01)
}

/**
 * Calcula la intensidad de actividad en un rango de 0 a 100
 * combinando estado de ejecución, ruta activa, densidad térmica y ejecuciones.
 */
export function calculateActivityIntensity(params: {
  isNodeExecuting: boolean;
  isPathStep: boolean;
  isBottleneck: boolean;
  heatScore?: number;
  totalExecutions?: number;
}): number {
  if (params.isNodeExecuting) return 100;
  if (params.isBottleneck) return Math.max(85, params.heatScore || 85);
  if (params.isPathStep) return Math.max(65, (params.heatScore || 50) + 15);
  if (params.heatScore !== undefined && params.heatScore > 0) {
    return Math.min(100, params.heatScore);
  }
  const execBonus = Math.min(40, (params.totalExecutions || 0) * 4);
  return Math.min(100, 10 + execBonus);
}

/**
 * Calcula la transformación tridimensional (translateZ, sombras de suelo, perspectiva y overrides)
 * para un nodo del grafo.
 */
export function calculateNode3DElevation(
  params: Node3DElevationParams
): Node3DElevationResult {
  const {
    nodeId,
    layer,
    isNodeExecuting,
    isPathStep,
    isInspected,
    isHovered,
    isBottleneck,
    heatScore = 0,
    totalExecutions = 0,
    mode,
    depthScale = 1.0,
    activeTaskPathNodeIds = [],
    manualZOverride = null,
    isEditMode3DDisabled = false,
  } = params;

  const intensity = calculateActivityIntensity({
    isNodeExecuting,
    isPathStep,
    isBottleneck,
    heatScore,
    totalExecutions,
  });

  // 1. Calcular siempre primero el valor automático (para previsualizar en el depurador)
  let rawAutoZ = 0;
  let badgeLabel = 'Z: 0px';
  let badgeTone: Node3DElevationResult['badgeTone'] = 'slate';

  if (mode === 'activity') {
    // Jerarquía visual basada en activeTaskPathNodeIds:
    // Nodos en la ruta activa se elevan (50px a 100px) y los nodos inactivos quedan en 0px.
    const stepElevation = calculatePathStepElevation({
      nodeId,
      activeTaskPathNodeIds,
      isNodeExecuting,
      minZ: 50,
      maxZ: 100,
    });

    if (isNodeExecuting) {
      rawAutoZ = 100;
      badgeLabel = '⚡ Z+100px ACTIVO';
      badgeTone = 'cyan';
    } else if (isPathStep || stepElevation > 0) {
      rawAutoZ = stepElevation > 0 ? stepElevation : 100;
      const stepIdx = activeTaskPathNodeIds.indexOf(nodeId);
      badgeLabel =
        stepIdx >= 0
          ? `🚀 Z+${rawAutoZ}px PASO ${stepIdx + 1}`
          : `🚀 Z+${rawAutoZ}px RUTA`;
      badgeTone = 'cyan';
    } else if (isInspected) {
      rawAutoZ = 65;
      badgeLabel = '🎯 Z+65px INSPECCION';
      badgeTone = 'indigo';
    } else if (isHovered) {
      rawAutoZ = 45;
      badgeLabel = '👆 Z+45px ENFOQUE';
      badgeTone = 'cyan';
    } else if (isBottleneck && activeTaskPathNodeIds.length === 0) {
      rawAutoZ = 40;
      badgeLabel = '🔥 Z+40px CUELLO CARGA';
      badgeTone = 'rose';
    } else {
      // Nodos inactivos fuera de la ruta se mantienen en el plano 0px
      rawAutoZ = 0;
      badgeLabel = 'Z: 0px PLANO';
      badgeTone = 'slate';
    }
  } else if (mode === 'cluster') {
    const clusterBase = getClusterBaseElevation(layer);
    let extraBonus = 0;
    const layerNum = String(layer || '1').slice(-1);

    if (isNodeExecuting) {
      extraBonus = 35;
      badgeLabel = `⚡ Z+${clusterBase + extraBonus}px C${layerNum} ACTIVO`;
      badgeTone = 'cyan';
    } else if (isPathStep) {
      extraBonus = 20;
      badgeLabel = `🚀 Z+${clusterBase + extraBonus}px C${layerNum} RUTA`;
      badgeTone = 'cyan';
    } else if (isInspected || isHovered) {
      extraBonus = 18;
      badgeLabel = `🎯 Z+${clusterBase + extraBonus}px C${layerNum} FOCO`;
      badgeTone = 'indigo';
    } else if (isBottleneck) {
      extraBonus = 12;
      badgeLabel = `🔥 Z+${clusterBase + extraBonus}px C${layerNum} ALTA`;
      badgeTone = 'rose';
    } else {
      badgeLabel = `📦 Z+${clusterBase}px CLÚSTER C${layerNum}`;
      badgeTone = 'slate';
    }
    rawAutoZ = clusterBase + extraBonus;
  } else if (mode === 'hybrid') {
    const clusterBase = getClusterBaseElevation(layer);
    const activityComponent = Math.round(intensity * 0.5);
    let stateBonus = 0;

    if (isNodeExecuting) stateBonus = 25;
    else if (isPathStep) stateBonus = 18;
    else if (isInspected) stateBonus = 15;
    else if (isHovered) stateBonus = 10;

    rawAutoZ = Math.round(clusterBase * 0.6 + activityComponent + stateBonus);

    if (isNodeExecuting) {
      badgeLabel = `⚡ Z+${rawAutoZ}px DINÁMICO`;
      badgeTone = 'cyan';
    } else if (isBottleneck) {
      badgeLabel = `🔥 Z+${rawAutoZ}px CRÍTICO`;
      badgeTone = 'rose';
    } else if (isPathStep) {
      badgeLabel = `🚀 Z+${rawAutoZ}px PASO`;
      badgeTone = 'cyan';
    } else {
      badgeLabel = `Z+${rawAutoZ}px HÍBRIDO`;
      badgeTone = 'slate';
    }
  }

  const autoCalculatedZ = Math.max(0, Math.round(rawAutoZ * depthScale));

  // 2. Si el modo está en 'off' o el usuario desactivó 3D temporalmente en modo edición de grafos:
  if (mode === 'off' || isEditMode3DDisabled) {
    return {
      zElevation: 0,
      autoCalculatedZ,
      isManualOverride: manualZOverride !== null && manualZOverride !== undefined,
      scaleBonus: 1,
      boxShadow: '0 4px 8px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.4)',
      groundShadow: {
        offsetX: 0,
        offsetY: 2,
        blur: 4,
        spread: 0,
        opacity: 0.3,
        color: 'rgba(0,0,0,0.5)',
      },
      badgeLabel: isEditMode3DDisabled ? 'Z: 0px (EDICIÓN 2D)' : 'Z: 0px',
      badgeTone: 'slate',
    };
  }

  // 3. Verificar si existe un override manual de profundidad para este nodo
  const isManualOverride = manualZOverride !== null && manualZOverride !== undefined;
  const zElevation = isManualOverride
    ? Math.max(0, Math.round(manualZOverride))
    : autoCalculatedZ;

  if (isManualOverride) {
    badgeLabel = `🎛️ Z+${zElevation}px MANUAL`;
    badgeTone = 'emerald';
  }

  // Factor de aumento de escala óptico para reforzar la sensación de perspectiva hacia el usuario
  const scaleBonus = zElevation > 0 ? 1 + Math.min(0.14, zElevation * 0.0014) : 1;

  // Sombra volumétrica del nodo elevado
  let boxShadow = '0 4px 8px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.4)';
  if (zElevation > 0) {
    if (isManualOverride) {
      boxShadow = `0 ${Math.round(zElevation * 0.5)}px ${Math.round(
        zElevation * 1.0
      )}px -8px rgba(0, 0, 0, 0.92), 0 0 38px rgba(16, 185, 129, 0.75), inset 0 1px 2px rgba(255, 255, 255, 0.6)`;
    } else if (isNodeExecuting) {
      boxShadow = `0 ${Math.round(zElevation * 0.55)}px ${Math.round(
        zElevation * 1.1
      )}px -8px rgba(0, 0, 0, 0.95), 0 0 50px rgba(56, 189, 248, 0.9), inset 0 1px 3px rgba(255, 255, 255, 0.7)`;
    } else if (isBottleneck) {
      boxShadow = `0 ${Math.round(zElevation * 0.5)}px ${Math.round(
        zElevation * 1.0
      )}px -8px rgba(0, 0, 0, 0.9), 0 0 35px rgba(244, 63, 94, 0.75), inset 0 1px 2px rgba(255, 255, 255, 0.5)`;
    } else if (isInspected) {
      boxShadow = `0 ${Math.round(zElevation * 0.45)}px ${Math.round(
        zElevation * 0.9
      )}px -8px rgba(0, 0, 0, 0.85), 0 0 30px rgba(99, 102, 241, 0.7), inset 0 1px 2px rgba(255, 255, 255, 0.4)`;
    } else {
      boxShadow = `0 ${Math.round(zElevation * 0.4)}px ${Math.round(
        zElevation * 0.8
      )}px -6px rgba(0, 0, 0, 0.8), 0 0 18px rgba(56, 189, 248, 0.25)`;
    }
  }

  // Sombra proyectada en el suelo Z=0 (Ground Drop Shadow)
  const groundShadow = {
    offsetX: Math.round(zElevation * 0.22),
    offsetY: Math.round(zElevation * 0.34),
    blur: Math.round(zElevation * 0.45 + 6),
    spread: Math.round(zElevation * 0.12),
    opacity: zElevation > 0 ? Math.min(0.85, 0.25 + zElevation * 0.007) : 0.2,
    color: isManualOverride
      ? 'rgba(16, 185, 129, 0.45)'
      : isNodeExecuting
      ? 'rgba(6, 182, 212, 0.45)'
      : isBottleneck
      ? 'rgba(244, 63, 94, 0.45)'
      : isInspected
      ? 'rgba(99, 102, 241, 0.35)'
      : 'rgba(0, 0, 0, 0.75)',
  };

  return {
    zElevation,
    autoCalculatedZ,
    isManualOverride,
    scaleBonus,
    boxShadow,
    groundShadow,
    badgeLabel,
    badgeTone,
  };
}
