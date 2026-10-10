export const VOICE_ROUTING_POLICY = "s4-network-1";
export const VOICE_WORKER_URL = `/voice-sw.js?revision=${VOICE_ROUTING_POLICY}`;
export const VOICE_WORKER_SCOPE = "/voice";

export type RequestRoute =
  | "voice-network"
  | "shell-fetch"
  | "uncontrolled"
  | "other"
  | "unavailable";
export type RoutingState = "pending" | "ready" | "unavailable";

export function controllerRoute(
  controller: Pick<ServiceWorker, "scriptURL"> | null,
  origin: string,
): RequestRoute {
  if (!controller) return "uncontrolled";
  try {
    const url = new URL(controller.scriptURL);
    if (url.origin !== origin) return "other";
    if (`${url.pathname}${url.search}` === VOICE_WORKER_URL)
      return "voice-network";
    return url.pathname === "/sw.js" ? "shell-fetch" : "other";
  } catch {
    return "unavailable";
  }
}

export function requestRoute(): RequestRoute {
  try {
    return controllerRoute(navigator.serviceWorker.controller, location.origin);
  } catch {
    return "unavailable";
  }
}

// Registration is outside sentence-to-audio timing. It never waits, retries or
// sends requests on the measured audio path. Failure keeps the existing route.
export function startVoiceRouting(
  container: ServiceWorkerContainer,
  origin: string,
  changed: (state: RoutingState) => void,
) {
  let disposed = false;
  const update = () => {
    if (!disposed)
      changed(
        controllerRoute(container.controller, origin) === "voice-network"
          ? "ready"
          : "pending",
      );
  };
  container.addEventListener("controllerchange", update);
  update();
  void container
    .register(VOICE_WORKER_URL, {
      scope: VOICE_WORKER_SCOPE,
      updateViaCache: "none",
    })
    .then(update)
    .catch(() => {
      if (!disposed)
        changed(
          controllerRoute(container.controller, origin) === "voice-network"
            ? "ready"
            : "unavailable",
        );
    });
  return () => {
    disposed = true;
    container.removeEventListener("controllerchange", update);
  };
}

// serviceWorker.ready may resolve to the /voice worker after SPA navigation.
// Notifications must continue using the original root registration.
export async function rootPushRegistration(
  container: ServiceWorkerContainer,
  origin: string,
) {
  const root = new URL("/", origin).href;
  let registration = await container.getRegistration(root);
  if (!registration || registration.scope !== root)
    registration = await container.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
  if (registration.scope !== root)
    throw new Error("Push worker scope mismatch");
  const worker =
    registration.active ?? registration.installing ?? registration.waiting;
  if (!worker) throw new Error("Push worker is unavailable. Retry shortly.");
  if (worker.state !== "activated")
    await new Promise<void>((resolve, reject) => {
      const finished = (error?: Error) => {
        clearTimeout(timer);
        worker.removeEventListener("statechange", check);
        if (error) reject(error);
        else resolve();
      };
      const check = () => {
        if (worker.state === "activated") finished();
        else if (worker.state === "redundant")
          finished(new Error("Push worker installation failed"));
      };
      const timer = setTimeout(
        () => finished(new Error("Push worker is not ready. Retry shortly.")),
        10_000,
      );
      worker.addEventListener("statechange", check);
      check();
    });
  return registration;
}
