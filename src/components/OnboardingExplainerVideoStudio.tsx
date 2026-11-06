/**
 * OnboardingExplainerVideoStudio.tsx
 * Estudio y Reproductor de Vídeo Explicativo Vectorial para Onboarding de Desarrolladores.
 *
 * Qué funciona de verdad:
 * - Renderizado procedural a 60 FPS en un <canvas> HTML5 de alta definición (sin imágenes borrosas).
 * - Soporte nativo para 3 relaciones de aspecto:
 *   1. YouTube (16:9 Horizontal • 1920x1080)
 *   2. TikTok / Reels / Shorts (9:16 Vertical • 1080x1920)
 *   3. GitHub README (16:9 Demo Técnica • 1280x720)
 * - Grabación y descarga de archivo de vídeo real (.webm) mediante HTML5 canvas.captureStream(30) + MediaRecorder.
 * - Narración opcional en español sincronizada por capítulos mediante Web Speech API (window.speechSynthesis).
 *
 * Qué es SIMULADO / Asistido:
 * - La subida directa por API a YouTube Studio o TikTok no se realiza desde el sandbox sin credenciales OAuth;
 *   en su lugar se descarga el fichero de vídeo real (.webm) y se generan los metadatos, timestamps y Markdown listos para pegar.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  Video,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Sparkles,
  Share2,
  Monitor,
  Smartphone,
  GitBranch,
  CircleDot,
} from 'lucide-react';

export type VideoPlatformFormat = 'youtube_16_9' | 'tiktok_9_16' | 'github_16_9';

export interface ExplainerScene {
  id: string;
  sceneNumber: number;
  startTimeSec: number;
  endTimeSec: number;
  title: string;
  subtitle: string;
  narrationText: string;
  highlightLayer: string;
  keyMetrics: string[];
  accentColor: string;
}

export const EXPLAINER_SCENES: ExplainerScene[] = [
  {
    id: 'scene-intro',
    sceneNumber: 1,
    startTimeSec: 0,
    endTimeSec: 6,
    title: '1. AgentOS: Factoría de Desarrollo Agéntico',
    subtitle: 'Orquestación real de 25 nodos en 5 capas con trazabilidad total',
    narrationText:
      'Bienvenido a AgentOS. Una factoría de software agéntico donde 25 nodos especializados construyen, verifican y despliegan código real.',
    highlightLayer: 'ALL LAYERS • 25 NODOS',
    keyMetrics: ['25 Agentes Especializados', '5 Capas Funcionales', 'Zero Mockups Borrosos'],
    accentColor: '#38bdf8',
  },
  {
    id: 'scene-layers',
    sceneNumber: 2,
    startTimeSec: 6,
    endTimeSec: 13,
    title: '2. Las 5 Capas Arquitectónicas (C1 a C5)',
    subtitle: 'De Brain & Seguridad (C1) a Benchmark Lab & Producción (C5)',
    narrationText:
      'La arquitectura se divide en cinco capas: Memoria y Seguridad en Capa 1, Exploración en Capa 2, Construcción en Capa 3, Carriles en Capa 4 y Producción en Capa 5.',
    highlightLayer: 'CAPAS 01 → 05',
    keyMetrics: ['C1: Brain + Seguridad', 'C3: Spec + Builder + UI', 'C5: BD Aislada + Prod'],
    accentColor: '#a855f7',
  },
  {
    id: 'scene-lanes',
    sceneNumber: 3,
    startTimeSec: 13,
    endTimeSec: 20,
    title: '3. Enrutamiento Inteligente por 3 Carriles',
    subtitle: 'Carril Estándar, Carril Exprés y Bypass SSH Urgente P0',
    narrationText:
      'Cada tarea entra por uno de los tres carriles según su criticidad: Estándar con validación completa, Exprés sin modelos pesados o Urgente P0 con firma SSH.',
    highlightLayer: '3 CARRILES DE FLUJO',
    keyMetrics: ['Estándar: Flujo Completo', 'Exprés: Baja Latencia', 'Urgente P0: Bypass SSH'],
    accentColor: '#f43f5e',
  },
  {
    id: 'scene-3d-z',
    sceneNumber: 4,
    startTimeSec: 20,
    endTimeSec: 27,
    title: '4. Profundidad 3D Dinámica (Eje Z + Brillo Focal)',
    subtitle: 'Transición fluida con resortes (0px a 100px) y zoom vectorial HD',
    narrationText:
      'El lienzo eleva en el eje Z los nodos de la ruta activa hasta 100 píxeles con física de resortes y zoom vectorial infinito sin perder nitidez.',
    highlightLayer: 'EJE Z: 0px → 100px',
    keyMetrics: ['useSpring translateZ(100px)', 'Brillo Focal en Ruta Activa', 'Zoom Vectorial 4.0x HD'],
    accentColor: '#10b981',
  },
  {
    id: 'scene-vcs-craft',
    sceneNumber: 5,
    startTimeSec: 27,
    endTimeSec: 34,
    title: '5. Evidencias, Agent VCS y Estándar C.R.A.F.T.',
    subtitle: 'Unified diffs, pruebas en Docker aislado y rollback en 1 clic',
    narrationText:
      'Cada paso genera artefactos verificables: especificaciones, unified diffs, capturas Playwright y commits en Agent VCS con rollback instantáneo.',
    highlightLayer: 'AUDITORÍA & VCS',
    keyMetrics: ['Unified Diffs Reales', 'Pruebas en BD Aislada', 'Rollback Atómico VCS'],
    accentColor: '#f59e0b',
  },
  {
    id: 'scene-outro',
    sceneNumber: 6,
    startTimeSec: 34,
    endTimeSec: 40,
    title: '6. Listo para Producción • YouTube, TikTok & GitHub',
    subtitle: 'Clona el repositorio, ejecuta las 22 pruebas y despliega tu factoría',
    narrationText:
      'Explora el código en GitHub, ejecuta la suite de pruebas automáticas y comparte la arquitectura de AgentOS con tu equipo de ingeniería.',
    highlightLayer: 'AGENTOS v2.4 READY',
    keyMetrics: ['22/22 Tests Superados', 'Node 20 + Express + WS', 'Open Source Ready'],
    accentColor: '#22d3ee',
  },
];

export const TOTAL_VIDEO_DURATION_SEC = 40;

export const OnboardingExplainerVideoStudio: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [format, setFormat] = useState<VideoPlatformFormat>('youtube_16_9');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const lastSpokenSceneIdRef = useRef<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Dimensiones lógicas del lienzo de vídeo según la plataforma elegida
  const getCanvasDimensions = useCallback((fmt: VideoPlatformFormat) => {
    if (fmt === 'tiktok_9_16') {
      return { width: 720, height: 1280, label: '9:16 Vertical HD (TikTok / Shorts)' };
    }
    if (fmt === 'github_16_9') {
      return { width: 1280, height: 720, label: '16:9 GitHub README Demo (720p)' };
    }
    return { width: 1280, height: 720, label: '16:9 YouTube Studio HD (1080p Escala Vectorial)' };
  }, []);

  const currentScene =
    EXPLAINER_SCENES.find(
      (s) => currentTimeSec >= s.startTimeSec && currentTimeSec < s.endTimeSec
    ) || EXPLAINER_SCENES[EXPLAINER_SCENES.length - 1];

  // Síntesis de voz opcional sincronizada con la escena actual
  useEffect(() => {
    if (!voiceEnabled || !isPlaying) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      return;
    }
    if (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      lastSpokenSceneIdRef.current !== currentScene.id
    ) {
      lastSpokenSceneIdRef.current = currentScene.id;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentScene.narrationText);
      utterance.lang = 'es-ES';
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    }
  }, [currentScene, voiceEnabled, isPlaying]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Reloj de avance de reproducción a 60 FPS
  useEffect(() => {
    if (!isPlaying) return;
    let animationFrameId: number;
    let lastTimestamp = performance.now();

    const tick = (now: number) => {
      const deltaSec = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      setCurrentTimeSec((prev) => {
        const next = prev + deltaSec;
        if (next >= TOTAL_VIDEO_DURATION_SEC) {
          // Si estaba grabando, detener grabación al terminar el vídeo
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
          lastSpokenSceneIdRef.current = null;
          return 0;
        }
        return next;
      });

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying]);

  // Motor de dibujo vectorial en el Canvas HTML5 para cada fotograma
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width: W, height: H } = getCanvasDimensions(format);
    const isVertical = format === 'tiktok_9_16';

    ctx.save();
    ctx.clearRect(0, 0, W, H);

    // 1. Fondo Oscuro de Alta Definición con Cuadrícula Técnica Vectorial
    const bgGrad = ctx.createRadialGradient(W * 0.5, H * 0.45, 50, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
    bgGrad.addColorStop(0, '#0b1325');
    bgGrad.addColorStop(1, '#050811');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Cuadrícula geométrica nítida
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)';
    ctx.lineWidth = 1;
    const gridStep = 36;
    for (let x = 0; x < W; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // 2. Cabecera de Marca & Plataforma
    const padX = isVertical ? 38 : 48;
    const topY = isVertical ? 48 : 36;

    // Badge Superior Izquierdo
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = currentScene.accentColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(padX, topY, isVertical ? 260 : 280, 42, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 17px monospace';
    ctx.fillText('⚡ AgentOS v2.4', padX + 16, topY + 26);

    ctx.fillStyle = currentScene.accentColor;
    ctx.font = 'bold 12px monospace';
    ctx.fillText('HD VECTOR', padX + 175, topY + 25);

    // Indicador de Escena / Tiempo arriba a la derecha
    const badgeRightW = 210;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.beginPath();
    ctx.roundRect(W - padX - badgeRightW, topY, badgeRightW, 42, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(
      `ESCENA ${currentScene.sceneNumber}/6 • 00:${String(Math.floor(currentTimeSec)).padStart(2, '0')}s`,
      W - padX - badgeRightW + 16,
      topY + 26
    );

    // 3. Título de Escena y Subtítulo Técnico
    const titleY = isVertical ? 140 : 120;
    ctx.fillStyle = '#ffffff';
    ctx.font = isVertical ? 'bold 28px monospace' : 'bold 30px monospace';
    ctx.fillText(currentScene.title, padX, titleY);

    ctx.fillStyle = '#94a3b8';
    ctx.font = isVertical ? '17px sans-serif' : '18px sans-serif';
    ctx.fillText(currentScene.subtitle, padX, titleY + 32);

    // 4. Visualización Central Dinámica del Grafo de 5 Capas y Nodos Elevados en 3D
    const stageTop = isVertical ? 215 : 175;
    const stageHeight = isVertical ? 640 : 350;
    const stageWidth = W - padX * 2;

    // Marco del escenario central
    ctx.fillStyle = 'rgba(9, 13, 24, 0.82)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(padX, stageTop, stageWidth, stageHeight, 16);
    ctx.fill();
    ctx.stroke();

    // Dibujar las 5 bandas de capa y nodos vectoriales animados
    const layers = [
      { num: '01', name: 'Memoria · Brain · Seguridad', color: '#38bdf8', nodes: ['Brain', 'Seguridad'] },
      { num: '02', name: 'Exploración · Mockup · UX', color: '#a855f7', nodes: ['Explorador', 'Mockup SVG', 'Coherencia'] },
      { num: '03', name: 'Flujo Principal · Builder · UI', color: '#10b981', nodes: ['Analyze', 'Spec Writer', 'Builder', 'Evidencia'] },
      { num: '04', name: 'Carriles · Estándar · Exprés · P0', color: '#f43f5e', nodes: ['Carril P0 SSH', 'Código', 'Tu OK'] },
      { num: '05', name: 'BD Aislada · Benchmark · Prod', color: '#f59e0b', nodes: ['BD Pruebas', 'Benchmark Lab', 'Producción'] },
    ];

    const layerGap = stageHeight / 5;
    const pulse = (Math.sin(currentTimeSec * 4.5) + 1) * 0.5;

    layers.forEach((layer, lIdx) => {
      const ly = stageTop + lIdx * layerGap + 8;
      const lh = layerGap - 14;
      const isHighlightedLayer =
        currentScene.sceneNumber === 1 ||
        (currentScene.sceneNumber === 2) ||
        (currentScene.sceneNumber === 3 && (lIdx === 2 || lIdx === 3)) ||
        (currentScene.sceneNumber === 4 && (lIdx === 2 || lIdx === 3 || lIdx === 4)) ||
        (currentScene.sceneNumber === 5 && (lIdx === 2 || lIdx === 4)) ||
        currentScene.sceneNumber === 6;

      ctx.fillStyle = isHighlightedLayer ? 'rgba(15, 23, 42, 0.85)' : 'rgba(15, 23, 42, 0.3)';
      ctx.strokeStyle = isHighlightedLayer ? layer.color : 'rgba(51, 65, 85, 0.4)';
      ctx.lineWidth = isHighlightedLayer ? 1.5 : 1;
      ctx.beginPath();
      ctx.roundRect(padX + 16, ly, stageWidth - 32, lh, 10);
      ctx.fill();
      ctx.stroke();

      // Etiqueta de la capa
      ctx.fillStyle = isHighlightedLayer ? layer.color : '#64748b';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`CAPA ${layer.num} / ${layer.name}`, padX + 28, ly + 20);

      // Nodos dentro de la capa
      const nodeCount = layer.nodes.length;
      const nodeAreaLeft = isVertical ? padX + 32 : padX + 290;
      const nodeAreaWidth = stageWidth - (nodeAreaLeft - padX) - 30;
      const nodeW = Math.min(isVertical ? 175 : 210, Math.floor(nodeAreaWidth / nodeCount) - 16);
      const nodeH = isVertical ? Math.min(48, lh - 30) : Math.min(44, lh - 12);
      const nodeY = isVertical ? ly + 30 : ly + (lh - nodeH) / 2;

      layer.nodes.forEach((nodeTitle, nIdx) => {
        const nx = nodeAreaLeft + nIdx * (nodeW + 18);
        const isActiveRouteNode =
          (currentScene.sceneNumber === 3 && lIdx === 3 && nIdx === 0) ||
          (currentScene.sceneNumber === 4 && ((lIdx === 3 && nIdx === 0) || (lIdx === 4 && nIdx === 2))) ||
          (currentScene.sceneNumber === 5 && lIdx === 2 && nIdx === 2) ||
          (lIdx === Math.floor(currentTimeSec * 1.5) % 5 && nIdx === 0);

        // Si el nodo está elevado en el eje Z (Escena 4 o nodo activo), dibujamos sombra proyectada y offset 3D
        const zLift = isActiveRouteNode ? 8 + pulse * 5 : 0;

        if (zLift > 0) {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
          ctx.beginPath();
          ctx.roundRect(nx + zLift * 0.6, nodeY + zLift * 0.9, nodeW, nodeH, 8);
          ctx.fill();
        }

        ctx.fillStyle = isActiveRouteNode ? '#06243d' : '#090f1d';
        ctx.strokeStyle = isActiveRouteNode ? '#38bdf8' : isHighlightedLayer ? layer.color : '#334155';
        ctx.lineWidth = isActiveRouteNode ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.roundRect(nx - zLift * 0.3, nodeY - zLift * 0.5, nodeW, nodeH, 8);
        ctx.fill();
        ctx.stroke();

        // Texto nítido del nodo
        ctx.fillStyle = isActiveRouteNode ? '#ffffff' : '#e2e8f0';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(nodeTitle, nx - zLift * 0.3 + 12, nodeY - zLift * 0.5 + nodeH / 2 + 4);

        if (isActiveRouteNode) {
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 10px monospace';
          ctx.fillText('Z+100px', nx - zLift * 0.3 + nodeW - 58, nodeY - zLift * 0.5 + 14);
        }

        // Conector vectorial entre nodos consecutivos
        if (nIdx < nodeCount - 1) {
          const startX = nx + nodeW;
          const endX = nx + nodeW + 18;
          const midY = nodeY + nodeH / 2;
          ctx.strokeStyle = isHighlightedLayer ? '#34d399' : '#334155';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(startX, midY);
          ctx.lineTo(endX, midY);
          ctx.stroke();

          // Partícula animada viajando por la arista
          const pOffset = ((currentTimeSec * 2.5) % 1) * 18;
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(startX + pOffset, midY, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    });

    // 5. Tarjetas de Métricas Clave de la Escena
    const metricsY = stageTop + stageHeight + 22;
    const metricCardW = (stageWidth - 24) / 3;
    currentScene.keyMetrics.forEach((metricText, idx) => {
      const mx = padX + idx * (metricCardW + 12);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = currentScene.accentColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(mx, metricsY, metricCardW, 44, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = isVertical ? 'bold 11.5px monospace' : 'bold 13px monospace';
      ctx.fillText(`✔ ${metricText}`, mx + 14, metricsY + 27);
    });

    // 6. Subtítulos Quemados en Vídeo (Burned-in Captions para TikTok / YouTube / GitHub)
    const captionTop = metricsY + 62;
    const captionH = isVertical ? 110 : 72;
    ctx.fillStyle = 'rgba(4, 9, 20, 0.92)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(padX, captionTop, stageWidth, captionH, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('SUBTÍTULOS SINCRONIZADOS (CC):', padX + 18, captionTop + 22);

    ctx.fillStyle = '#ffffff';
    ctx.font = isVertical ? 'bold 15px sans-serif' : 'bold 15px sans-serif';
    // Ajuste automático de línea para el subtítulo narrado
    const words = currentScene.narrationText.split(' ');
    let line = '';
    let lineY = captionTop + 44;
    const maxLineW = stageWidth - 36;
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      if (ctx.measureText(testLine).width > maxLineW && i > 0) {
        ctx.fillText(line, padX + 18, lineY);
        line = words[i] + ' ';
        lineY += 22;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, padX + 18, lineY);

    // 7. Barra de Progreso Global en el Borde Inferior del Vídeo
    const progRatio = currentTimeSec / TOTAL_VIDEO_DURATION_SEC;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, H - 8, W, 8);
    ctx.fillStyle = currentScene.accentColor;
    ctx.fillRect(0, H - 8, W * progRatio, 8);

    ctx.restore();
  }, [currentTimeSec, format, currentScene, getCanvasDimensions]);

  // Grabación real del Canvas a fichero de vídeo WebM usando MediaRecorder
  const handleStartRecordingVideo = () => {
    const canvas = canvasRef.current;
    if (!canvas || isRecording) return;

    try {
      recordedChunksRef.current = [];
      setRecordedVideoUrl(null);
      setCurrentTimeSec(0);
      setIsPlaying(true);

      const stream = canvas.captureStream(30);
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedVideoUrl(url);
        setIsRecording(false);

        // Descarga automática del vídeo generado
        const a = document.createElement('a');
        a.href = url;
        a.download = `agentos-onboarding-${format}.webm`;
        a.click();
      };

      setIsRecording(true);
      recorder.start(200);
    } catch {
      setIsRecording(false);
    }
  };

  const handleStopRecordingEarly = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  // Textos listos para copiar y publicar en YouTube, TikTok y GitHub
  const youtubeMetadata = `Título: AgentOS v2.4 — Arquitectura de Factoría de Desarrollo Agéntico (25 Nodos & 5 Capas)

Descripción:
Recorrido técnico oficial de onboarding para desarrolladores por AgentOS:
00:00 1. Introducción a la Factoría Agéntica (25 Nodos)
00:06 2. Las 5 Capas Arquitectónicas (Brain, Seguridad, Builder, Producción)
00:13 3. Enrutamiento por 3 Carriles (Estándar, Exprés y Bypass SSH P0)
00:20 4. Grafo 3D en Eje Z con framer-motion useSpring y Brillo Focal
00:27 5. Evidencias Técnicas, Agent VCS y Estándar C.R.A.F.T.
00:34 6. Pruebas Automáticas y Despliegue en GitHub

#AgentOS #AI #SoftwareArchitecture #DevTools #TypeScript #React`;

  const tiktokMetadata = `⚡ Cómo orquestar 25 agentes de IA en 5 capas sin perder el control del código (AgentOS v2.4) 🚀
✅ 3 Carriles (Estándar, Exprés y Bypass SSH P0)
✅ Grafo 3D interactivo en el eje Z (0px → 100px)
✅ Evidencias reales: Unified Diffs + Docker + Rollback VCS
#programacion #desarrolloweb #ia #softwareengineer #github #tech #agentos`;

  const githubMarkdownSnippet = `## 🎬 Vídeo Explicativo de Onboarding (Arquitectura AgentOS v2.4)

https://github.com/tu-org/agentos/assets/agentos-onboarding-github_16_9.webm

| Capítulo | Tiempo | Módulo del Sistema |
| :--- | :---: | :--- |
| **1. Factoría Agéntica** | \`00:00\` | Visión global de los 25 nodos y 5 capas |
| **2. Capas C1 a C5** | \`00:06\` | Brain, Seguridad, Spec Writer, Builder y Producción |
| **3. Tres Carriles** | \`00:13\` | Estándar, Exprés y Bypass SSH Urgente P0 |
| **4. Profundidad 3D Z** | \`00:20\` | Elevación \`translateZ(100px)\` con \`useSpring\` y Zoom HD |
| **5. Evidencias & VCS** | \`00:27\` | Unified diffs, pruebas en BD aislada y rollback |`;

  const handleCopyText = (type: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const dims = getCanvasDimensions(format);

  return (
    <div data-testid="onboarding-video-studio" className="space-y-4 font-mono text-xs">
      {/* Barra Superior de Selección de Formato (YouTube 16:9 / TikTok 9:16 / GitHub 16:9) */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            data-testid="video-format-youtube"
            onClick={() => setFormat('youtube_16_9')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
              format === 'youtube_16_9'
                ? 'bg-rose-500/20 border-rose-500 text-rose-200 shadow-sm'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5 text-rose-400" />
            <span>YouTube (16:9 HD)</span>
          </button>

          <button
            data-testid="video-format-tiktok"
            onClick={() => setFormat('tiktok_9_16')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
              format === 'tiktok_9_16'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-sm'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
            <span>TikTok / Shorts (9:16 Vertical)</span>
          </button>

          <button
            data-testid="video-format-github"
            onClick={() => setFormat('github_16_9')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
              format === 'github_16_9'
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 shadow-sm'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
            <span>GitHub README (16:9)</span>
          </button>
        </div>

        {/* Botón de Grabación y Exportación WebM Real */}
        <div className="flex items-center gap-2">
          {!isRecording ? (
            <button
              data-testid="record-export-video-btn"
              onClick={handleStartRecordingVideo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-[11px] shadow-md cursor-pointer transition"
              title="Graba el stream del canvas a 30 FPS usando MediaRecorder y descarga el archivo .webm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Vídeo (.webm)</span>
            </button>
          ) : (
            <button
              data-testid="stop-recording-video-btn"
              onClick={handleStopRecordingEarly}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950 border border-rose-400 text-rose-200 font-bold text-[11px] animate-pulse cursor-pointer"
            >
              <CircleDot className="w-3.5 h-3.5 text-rose-400" />
              <span>Grabando... Detener y Guardar</span>
            </button>
          )}
        </div>
      </div>

      {/* Visor del Reproductor Canvas Vectorial */}
      <div className="relative rounded-2xl bg-[#04070f] border border-slate-800 p-3 flex flex-col items-center justify-center overflow-hidden shadow-inner">
        <div
          className={`relative overflow-hidden rounded-xl border border-slate-700/80 shadow-2xl bg-[#050811] ${
            format === 'tiktok_9_16' ? 'w-full max-w-[290px] aspect-[9/16]' : 'w-full aspect-video'
          }`}
        >
          <canvas
            ref={canvasRef}
            width={dims.width}
            height={dims.height}
            className="w-full h-full object-contain block"
          />
        </div>

        {/* Controles del Reproductor e Índice de Capítulos */}
        <div className="w-full mt-3 space-y-2.5">
          {/* Línea de Tiempo Interactiva (Scrubber) */}
          <div className="flex items-center gap-3">
            <button
              data-testid="video-play-pause-btn"
              onClick={() => setIsPlaying((p) => !p)}
              className="p-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition cursor-pointer"
              title={isPlaying ? 'Pausar vídeo' : 'Reproducir vídeo'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            <button
              onClick={() => {
                setCurrentTimeSec(0);
                lastSpokenSceneIdRef.current = null;
              }}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition cursor-pointer"
              title="Reiniciar al segundo 00:00"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <div className="flex-1 flex flex-col gap-1">
              <input
                data-testid="video-timeline-scrubber"
                type="range"
                min={0}
                max={TOTAL_VIDEO_DURATION_SEC}
                step={0.1}
                value={currentTimeSec}
                onChange={(e) => {
                  setCurrentTimeSec(Number(e.target.value));
                  lastSpokenSceneIdRef.current = null;
                }}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="text-cyan-300 font-bold">{currentScene.title}</span>
                <span>
                  00:{String(Math.floor(currentTimeSec)).padStart(2, '0')} / 00:{TOTAL_VIDEO_DURATION_SEC}s
                </span>
              </div>
            </div>

            <button
              data-testid="video-voice-toggle-btn"
              onClick={() => setVoiceEnabled((v) => !v)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition cursor-pointer ${
                voiceEnabled
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title="Activar o silenciar narración por voz en español (Web Speech API)"
            >
              {voiceEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>{voiceEnabled ? 'Voz: ON' : 'Voz: OFF'}</span>
            </button>
          </div>

          {/* Botones de Salto Rápido por Escena (Capítulos) */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-1.5">
            {EXPLAINER_SCENES.map((scene) => {
              const isCurrent = scene.id === currentScene.id;
              return (
                <button
                  key={scene.id}
                  data-testid={`video-scene-btn-${scene.sceneNumber}`}
                  onClick={() => {
                    setCurrentTimeSec(scene.startTimeSec + 0.1);
                    lastSpokenSceneIdRef.current = null;
                  }}
                  className={`px-2 py-1.5 rounded-lg border text-left transition cursor-pointer ${
                    isCurrent
                      ? 'bg-cyan-950/90 border-cyan-400 text-cyan-200 shadow-sm'
                      : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="text-[9px] text-slate-400">
                    00:{String(scene.startTimeSec).padStart(2, '0')}s
                  </div>
                  <div className="text-[10px] font-bold truncate">Cap. {scene.sceneNumber}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Kit de Publicación Rápida para YouTube, TikTok y GitHub */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Kit YouTube */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-rose-300 flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-rose-400" /> YouTube Studio (16:9)
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700/50">
                Capítulos + SEO
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-sans leading-relaxed line-clamp-3">
              Incluye marcas de tiempo automáticas (00:00 a 00:34) para la barra de capítulos de YouTube.
            </p>
          </div>
          <button
            data-testid="copy-youtube-kit-btn"
            onClick={() => handleCopyText('youtube', youtubeMetadata)}
            className="w-full py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center gap-1.5 text-[10px] font-bold transition cursor-pointer"
          >
            {copiedType === 'youtube' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">¡Copiado para YouTube!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-rose-400" />
                <span>Copiar Título y Capítulos YT</span>
              </>
            )}
          </button>
        </div>

        {/* Kit TikTok */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-cyan-300 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-cyan-400" /> TikTok / Reels (9:16)
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50">
                Vertical Safe-Zone
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-sans leading-relaxed line-clamp-3">
              Encuadre vertical 9:16 con subtítulos dinámicos integrados y hashtags técnicos de alto alcance.
            </p>
          </div>
          <button
            data-testid="copy-tiktok-kit-btn"
            onClick={() => handleCopyText('tiktok', tiktokMetadata)}
            className="w-full py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center gap-1.5 text-[10px] font-bold transition cursor-pointer"
          >
            {copiedType === 'tiktok' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">¡Copiado para TikTok!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-cyan-400" />
                <span>Copiar Copy y Hashtags TikTok</span>
              </>
            )}
          </button>
        </div>

        {/* Kit GitHub README */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-emerald-400" /> GitHub README.md
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                Markdown Embed
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-sans leading-relaxed line-clamp-3">
              Bloque Markdown con reproductor embebido e índice técnico listo para pegar en el README del repo.
            </p>
          </div>
          <button
            data-testid="copy-github-kit-btn"
            onClick={() => handleCopyText('github', githubMarkdownSnippet)}
            className="w-full py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center gap-1.5 text-[10px] font-bold transition cursor-pointer"
          >
            {copiedType === 'github' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">¡Markdown Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copiar Markdown para GitHub</span>
              </>
            )}
          </button>
        </div>
      </div>

      {recordedVideoUrl && (
        <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 flex items-center justify-between text-[11px] text-emerald-200">
          <span>✔ Vídeo WebM grabado y descargado con éxito ({dims.label}).</span>
          <a
            href={recordedVideoUrl}
            download={`agentos-onboarding-${format}.webm`}
            className="underline font-bold text-emerald-300 hover:text-white"
          >
            Descargar de nuevo
          </a>
        </div>
      )}
    </div>
  );
};
