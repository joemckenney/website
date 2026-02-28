export interface SystemCheckResult {
  webAudio: {
    supported: boolean;
  };
  geolocation: {
    supported: boolean;
    permission: "granted" | "denied" | "prompt" | "unknown";
  };
  overallReady: boolean;
}

export async function performSystemCheck(): Promise<SystemCheckResult> {
  // Check Web Audio API
  const webAudioSupported =
    typeof AudioContext !== "undefined" ||
    // biome-ignore lint/suspicious/noExplicitAny: Checking for legacy webkit API
    typeof (window as any).webkitAudioContext !== "undefined";

  // Check Geolocation
  const geoSupported = "geolocation" in navigator;
  let geoPermission: "granted" | "denied" | "prompt" | "unknown" = "unknown";

  if (geoSupported && navigator.permissions) {
    try {
      const result = await navigator.permissions.query({
        name: "geolocation" as PermissionName,
      });
      geoPermission = result.state as "granted" | "denied" | "prompt";
    } catch {
      geoPermission = "unknown";
    }
  }

  return {
    webAudio: {
      supported: webAudioSupported,
    },
    geolocation: {
      supported: geoSupported,
      permission: geoPermission,
    },
    overallReady: webAudioSupported && geoSupported,
  };
}

export function getSetupInstructions(check: SystemCheckResult): string[] {
  const instructions: string[] = [];

  if (check.webAudio.supported) {
    instructions.push("\u2713 Web Audio API supported");
  } else {
    instructions.push("\u26A0\uFE0F  Web Audio API not supported");
    instructions.push("   Update your browser to use this app.");
  }

  if (check.geolocation.supported) {
    instructions.push("\u2713 Geolocation API available");
    if (check.geolocation.permission === "denied") {
      instructions.push(
        "\u26A0\uFE0F  Location permission denied — enable in browser settings or provide coordinates manually",
      );
    }
  } else {
    instructions.push("\u26A0\uFE0F  Geolocation API not supported");
  }

  if (check.overallReady) {
    instructions.push("");
    instructions.push(
      "\u2713 System ready. Type \"start\" to begin, or \"start lat,long\" with coordinates.",
    );
  }

  return instructions;
}
