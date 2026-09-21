const CALLBACK_NAMES = {
  message: 'onMessage',
  track: 'onTrack',
  'peer-connected': 'onPeerConnected'
};

export function listenToPeerManager(peerManager, eventName, handler) {
  if (typeof handler !== 'function') {
    return () => {};
  }

  if (typeof peerManager?.on === 'function') {
    peerManager.on(eventName, handler);
    return () => peerManager.off?.(eventName, handler);
  }

  const callbackName = CALLBACK_NAMES[eventName];
  if (!callbackName || !peerManager) {
    return () => {};
  }

  const previousHandler = typeof peerManager[callbackName] === 'function'
    ? peerManager[callbackName]
    : () => {};
  const chainedHandler = (...args) => {
    handler(...args);
    previousHandler.apply(peerManager, args);
  };
  peerManager[callbackName] = chainedHandler;

  return () => {
    if (peerManager[callbackName] === chainedHandler) {
      peerManager[callbackName] = previousHandler;
    }
  };
}