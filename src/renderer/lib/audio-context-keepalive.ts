/**
 * Keep an AudioContext running across page-visibility changes.
 *
 * WebKit interrupts AudioContexts when the page stops being visible — on
 * macOS Safari that includes the window simply being occluded by another
 * app, and on iPadOS it's the Split View / Stage Manager audio session
 * interruption. A suspended context stops pulling from the mic, which
 * silently starves both the level analyser and the transcription worklet.
 *
 * Resuming from the `statechange` handler alone is not enough: WebKit
 * rejects `resume()` while the page is hidden, and no further statechange
 * fires afterwards, so the context stays suspended even once the user comes
 * back. This wires up both signals — resume on suspend, and resume again on
 * the next visibilitychange — so the pipeline recovers on return.
 *
 * Returns a disposer; call it when the context is being torn down.
 */
export function keepAudioContextAwake(
  context: AudioContext,
  isActive: () => boolean,
  label: string,
): () => void {
  let disposed = false;

  const tryResume = () => {
    if (disposed || !isActive()) return;
    if (context.state !== 'suspended') return;
    context.resume().catch((err) => {
      // Expected while the page is hidden — the visibilitychange handler
      // below retries once we're visible again.
      console.warn(`Failed to resume ${label} AudioContext:`, err);
    });
  };

  const handleStateChange = () => tryResume();
  const handleVisibility = () => {
    if (!document.hidden) tryResume();
  };

  context.addEventListener('statechange', handleStateChange);
  document.addEventListener('visibilitychange', handleVisibility);

  return () => {
    disposed = true;
    context.removeEventListener('statechange', handleStateChange);
    document.removeEventListener('visibilitychange', handleVisibility);
  };
}
