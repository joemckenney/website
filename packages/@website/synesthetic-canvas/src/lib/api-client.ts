import type { GestureAnalysis, GestureFeatures } from "../types";

export async function fetchSynesthesia(
  apiUrl: string,
  features: GestureFeatures,
): Promise<GestureAnalysis | null> {
  try {
    const url = `${apiUrl}/signal/synesthesia`;
    console.log("[synesthesia] POST", url, features);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ features }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[synesthesia] response not ok:", response.status, text);
      return null;
    }

    const data = (await response.json()) as { analysis: GestureAnalysis };
    console.log("[synesthesia] analysis:", data.analysis);
    return data.analysis;
  } catch (err) {
    console.error("[synesthesia] fetch failed:", err);
    return null;
  }
}
