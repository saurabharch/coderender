// Notification chime synthesized with WebAudio — zero audio assets to host.
// (Service workers can't play sound, so the page chimes when a bot reply or
// team notice arrives while the tab is open.)
let ctx: AudioContext | null = null;

export function chime(kind: "reply" | "notice" = "reply") {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = ctx || new AC();
    if (ctx.state === "suspended") void ctx.resume();
    const notes = kind === "reply" ? [660, 880] : [523, 659, 784];
    notes.forEach((f, i) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = "sine";
      o.frequency.value = f;
      const t = ctx!.currentTime + i * 0.12;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      o.connect(g).connect(ctx!.destination);
      o.start(t);
      o.stop(t + 0.3);
    });
  } catch { /* silent devices stay silent */ }
}
