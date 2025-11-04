export interface SystemCheckResult {
  browser: {
    isChrome: boolean;
    version: string | null;
    meetsMinimumVersion: boolean;
  };
  chromeAI: {
    apiAvailable: boolean;
    status: "unavailable" | "downloading" | "available" | "unknown";
    needsFlags: boolean;
  };
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
  // Check browser version
  const userAgent = navigator.userAgent;
  const chromeMatch = userAgent.match(/Chrome\/(\d+)/);
  const isChrome = chromeMatch !== null;
  const version = chromeMatch ? chromeMatch[1] : null;
  const meetsMinimumVersion = version ? parseInt(version) >= 127 : false;

  // Check Chrome AI API
  const languageModel =
    window.LanguageModel || (window as any).ai?.languageModel;
  const apiAvailable = !!languageModel;
  let aiStatus: "unavailable" | "downloading" | "available" | "unknown" =
    "unknown";

  if (apiAvailable) {
    try {
      aiStatus = await languageModel.availability();
    } catch {
      aiStatus = "unavailable";
    }
  } else {
    aiStatus = "unavailable";
  }

  const needsFlags = isChrome && meetsMinimumVersion && !apiAvailable;

  // Check Web Audio API
  const webAudioSupported =
    typeof AudioContext !== "undefined" ||
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

  const overallReady =
    isChrome && meetsMinimumVersion && webAudioSupported && geoSupported;

  return {
    browser: {
      isChrome,
      version,
      meetsMinimumVersion,
    },
    chromeAI: {
      apiAvailable,
      status: aiStatus,
      needsFlags,
    },
    webAudio: {
      supported: webAudioSupported,
    },
    geolocation: {
      supported: geoSupported,
      permission: geoPermission,
    },
    overallReady,
  };
}

export function getSetupInstructions(check: SystemCheckResult): string[] {
  const instructions: string[] = [];

  if (!check.browser.isChrome) {
    instructions.push("⚠️  This app requires Google Chrome (version 127+)");
    instructions.push("   Download Chrome at: https://www.google.com/chrome/");
    return instructions;
  }

  if (!check.browser.meetsMinimumVersion) {
    instructions.push(
      `⚠️  Chrome ${check.browser.version} detected. Chrome 127+ required.`,
    );
    instructions.push("   Update Chrome: chrome://settings/help");
    return instructions;
  }

  if (check.chromeAI.needsFlags) {
    instructions.push("⚠️  Chrome AI (Gemini Nano) flags not enabled!");
    instructions.push("");
    instructions.push("Enable these Chrome flags:");
    instructions.push("");
    instructions.push(
      "1. Visit: chrome://flags/#optimization-guide-on-device-model",
    );
    instructions.push("   Set to: Enabled BypassPerfRequirement");
    instructions.push("");
    instructions.push("2. Visit: chrome://flags/#prompt-api-for-gemini-nano");
    instructions.push("   Set to: Enabled");
    instructions.push("");
    instructions.push("3. Restart Chrome completely");
    instructions.push("");
    instructions.push("4. Visit: chrome://components/");
    instructions.push('   Find "Optimization Guide On Device Model"');
    instructions.push(
      '   Click "Check for update" and wait for download (~1.7GB)',
    );
    instructions.push("");
    instructions.push("5. Reload this page");
    instructions.push("");
    instructions.push(
      "Note: Without AI, the app will use rule-based sound generation.",
    );
    instructions.push("      Evolution features require AI.");
  } else if (check.chromeAI.status === "downloading") {
    instructions.push("ℹ️  Chrome AI model is downloading...");
    instructions.push("   Check progress: chrome://components/");
    instructions.push('   Look for "Optimization Guide On Device Model"');
    instructions.push("   Model size: ~1.7GB");
    instructions.push("");
    instructions.push(
      "   The app will work with rule-based generation until download completes.",
    );
  } else if (check.chromeAI.status === "available") {
    instructions.push("✓ Chrome AI (Gemini Nano) is ready");
  } else {
    instructions.push("⚠️  Chrome AI status unknown");
    instructions.push("   The app will use rule-based generation as fallback.");
  }

  if (!check.webAudio.supported) {
    instructions.push("");
    instructions.push("⚠️  Web Audio API not supported");
    instructions.push("   Update your browser to use this app.");
  }

  if (!check.geolocation.supported) {
    instructions.push("");
    instructions.push("⚠️  Geolocation API not supported");
  } else if (check.geolocation.permission === "denied") {
    instructions.push("");
    instructions.push("⚠️  Location permission denied");
    instructions.push(
      '   Enable in browser settings or use "debug" command for manual input.',
    );
  }

  return instructions;
}
