const cache = new Map<string, HTMLAudioElement>();

export function playSfx(name: "whoosh" | "hit" | "miss" | "combo", volume = 0.45) {
  if (typeof window === "undefined") return;
  try {
    let audio = cache.get(name);
    if (!audio) {
      audio = new Audio(`/sfx/${name}.wav`);
      cache.set(name, audio);
    }
    const a = audio.cloneNode(true) as HTMLAudioElement;
    a.volume = volume;
    void a.play().catch(() => {});
  } catch {
    // ignore autoplay blocks
  }
}
