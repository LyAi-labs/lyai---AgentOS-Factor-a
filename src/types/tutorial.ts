/**
 * AgentOS - Definición de Tipos para el Motor de Tutoriales y Onboarding de Desarrolladores
 * Patrón reutilizable para crear tours interactivos modulares en la plataforma.
 */

import { ActiveTab } from '../components/LayerFilterBar';

export interface TutorialStep {
  id: string;
  stepNumber: number;
  title: string;
  badge: string;
  targetTab: ActiveTab;
  highlightTarget?: string;
  description: string;
  keyConcepts: string[];
  proDevTip: string;
  codeSnippet?: string;
  interactiveActionLabel?: string;
}

export interface TutorialModule {
  id: string;
  title: string;
  category: 'onboarding' | 'architecture' | 'vcs' | 'chaos_engineering' | 'd3_analytics';
  targetAudience: string;
  estimatedMinutes: number;
  steps: TutorialStep[];
}

export interface TutorialPatternTemplate {
  title: string;
  purpose: string;
  codeExample: string;
  rules: string[];
}
