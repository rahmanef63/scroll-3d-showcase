import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useRunStatus } from '../studio/use-run-status';

/**
 * The chrome has one status slot and, below `lg`, it is the only place any
 * backend failure is ever shown. What expires and what waits is therefore not a
 * detail — it is whether the reason a save failed is readable at all.
 */
describe('useRunStatus', () => {
  it('clears a success on its own, so a stale receipt cannot sit beside a dirty dot', async () => {
    const { result } = renderHook(() => useRunStatus());

    await act(async () => result.current.run('SAVING', async () => 'SAVED'));
    expect(result.current.status).toBe('SAVED');
    expect(result.current.failed).toBe(false);

    await waitFor(() => expect(result.current.status).toBe(''), { timeout: 4000 });
  });

  it('keeps a failure until something replaces it', async () => {
    const { result } = renderHook(() => useRunStatus());

    await act(async () =>
      result.current.run('UPLOADING', async () => {
        throw new Error('Model is 22.4 MB — the limit is 16.0 MB. Compress it first.');
      }),
    );

    expect(result.current.failed).toBe(true);
    expect(result.current.status).toContain('22.4 MB');
    // Long enough that the success timer would have fired twice.
    await new Promise((resolve) => setTimeout(resolve, 3200));
    expect(result.current.status).toContain('22.4 MB');
  });

  it('lets the reader put a failure away', async () => {
    const { result } = renderHook(() => useRunStatus());
    await act(async () =>
      result.current.run('SYNCING', async () => {
        throw new Error('nope');
      }),
    );

    act(() => result.current.dismiss());
    expect(result.current.status).toBe('');
    expect(result.current.failed).toBe(false);
  });

  it('drops the failure the moment the next action starts', async () => {
    const { result } = renderHook(() => useRunStatus());
    await act(async () =>
      result.current.run('SYNCING', async () => {
        throw new Error('nope');
      }),
    );
    await act(async () => result.current.run('SAVING', async () => 'SAVED'));

    expect(result.current.status).toBe('SAVED');
    expect(result.current.failed).toBe(false);
  });

  it('never throws out of `run` — the caller is a click handler', async () => {
    const { result } = renderHook(() => useRunStatus());
    await expect(
      act(async () =>
        result.current.run('SAVING', async () => {
          throw new Error('boom');
        }),
      ),
    ).resolves.not.toThrow();
  });
});
