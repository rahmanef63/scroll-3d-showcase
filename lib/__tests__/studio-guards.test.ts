import { describe, expect, it, vi } from 'vitest';
import { reauthOnLock } from '@/app/studio/_components/studio-guards';
import type { ShowcaseStudioAdapter } from '@/slices/scroll-3d-showcase/studio';

/**
 * The studio session is an eight-hour cookie and nothing announces its end. Left
 * alone, every action after it throws the same sentence into the status slot
 * while the editor goes on looking alive — dirty dot, undo stack, a camera path
 * being tuned against a backend that will refuse to store it.
 */
const base = (): ShowcaseStudioAdapter => ({
  syncModels: vi.fn(async () => ({ added: 0, total: 0 })),
  savePreset: vi.fn(async () => {}),
});

describe('reauthOnLock', () => {
  it('sends an expired session to the lock screen, and still reports the failure', async () => {
    const onLocked = vi.fn();
    const adapter = base();
    adapter.savePreset = vi.fn(async () => {
      throw new Error('Studio is locked');
    });

    const guarded = reauthOnLock(adapter, onLocked);
    await expect(guarded.savePreset('m', {} as never)).rejects.toThrow(/locked/i);
    expect(onLocked).toHaveBeenCalledTimes(1);
  });

  it('leaves every other failure alone — a full disk is not a logout', async () => {
    const onLocked = vi.fn();
    const adapter = base();
    adapter.syncModels = vi.fn(async () => {
      throw new Error('Model is too large');
    });

    const guarded = reauthOnLock(adapter, onLocked);
    await expect(guarded.syncModels()).rejects.toThrow(/too large/);
    expect(onLocked).not.toHaveBeenCalled();
  });

  it('passes results through untouched', async () => {
    const guarded = reauthOnLock(base(), vi.fn());
    expect(await guarded.syncModels()).toEqual({ added: 0, total: 0 });
  });

  it('guards the optional members too, when the host supplies them', async () => {
    const onLocked = vi.fn();
    const adapter = base();
    adapter.forgetModel = vi.fn(async () => {
      throw new Error('Studio is locked');
    });

    const guarded = reauthOnLock(adapter, onLocked);
    await expect(guarded.forgetModel?.('m')).rejects.toThrow();
    expect(onLocked).toHaveBeenCalledTimes(1);
  });

  it('leaves an absent member absent, so the chrome still hides its chip', () => {
    const guarded = reauthOnLock(base(), vi.fn());
    expect(guarded.setLiveModel).toBeUndefined();
    expect(guarded.uploadModel).toBeUndefined();
  });
});
