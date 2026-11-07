import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LineBanner } from '../src/components/LineBanner';
import { computeImpact } from '../src/lib/impact';
import { task } from './fixtures';

const base = { running: true, speed: 1, arrivalRatePerMin: 0, autoApprove: false, simTime: 0, lineStoppedAt: 0 };

describe('dashboard gobierno', () => {
  it('[UI-006] banner de línea parada e impacto aguas abajo', () => {
    const { container, unmount } = render(<LineBanner engine={{ ...base, lineStopped: false, lineStopReason: null }} />);
    expect(container.innerHTML).toBe('');
    unmount();

    render(<LineBanner engine={{ ...base, lineStopped: true, lineStopReason: 'Código devolvió blocked' }} />);
    expect(screen.getByRole('alert').textContent).toMatch(/Línea parada.*Código devolvió blocked/);
    expect(screen.getByRole('button', { name: 'Reanudar línea' })).toBeTruthy();
    expect(screen.getByLabelText('Nota de reanudación')).toHaveProperty('required', true);

    const step = (nodeId: string, status: 'blocked' | 'done' | 'queued') => ({
      nodeId, deps: [], status, attempts: 0, queuedAt: null, startedAt: null, finishedAt: null, error: null, verdict: null, findings: [],
    });
    const tasks = [
      task('a', 1, { steps: [step('builder', 'queued')] }),
      task('b', 2, { steps: [step('builder', 'done')] }),
      task('c', 3, { status: 'completed', steps: [step('builder', 'blocked')] }),
    ];
    const impact = computeImpact('builder', tasks);
    expect(impact.pendingTasks.map((t) => t.id)).toEqual(['a']);
    expect(impact.downstream.map((d) => d.id)).toEqual(expect.arrayContaining(['approver', 'produccion', 'verificador']));
    expect(impact.layersAffected).toEqual(expect.arrayContaining([3, 4, 5]));
    expect(computeImpact('benchmark_lab', tasks).downstream).toEqual([]);
  });
});
