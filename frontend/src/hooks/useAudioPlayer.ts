import { useRef, useCallback, useEffect } from "react";
import { useAppStore } from "../store/appStore.ts";

interface AudioTrack {
  source: AudioBufferSourceNode | null;
  gain: GainNode;
  buffer: AudioBuffer | null;
}

export function useAudioPlayer() {
  const ctxRef = useRef<AudioContext | null>(null);
  const tracksRef = useRef<Map<string, AudioTrack>>(new Map());
  const startTimeRef = useRef(0);
  const offsetRef = useRef(0);
  const rafRef = useRef<number>(0);

  const {
    stems,
    stemStates,
    isPlaying,
    setIsPlaying,
    setCurrentTime,
    setDuration,
  } = useAppStore();

  const getContext = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    return ctxRef.current;
  }, []);

  const loadStems = useCallback(async () => {
    const ctx = getContext();
    tracksRef.current.clear();

    for (const stem of stems) {
      const resp = await fetch(stem.url);
      const arrayBuf = await resp.arrayBuffer();
      const audioBuf = await ctx.decodeAudioData(arrayBuf);

      const gain = ctx.createGain();
      gain.connect(ctx.destination);

      tracksRef.current.set(stem.name, {
        source: null,
        gain,
        buffer: audioBuf,
      });
    }

    const maxDur = Math.max(
      ...Array.from(tracksRef.current.values()).map(
        (t) => t.buffer?.duration ?? 0,
      ),
    );
    setDuration(maxDur);
  }, [stems, getContext, setDuration]);

  useEffect(() => {
    if (stems.length > 0) {
      loadStems();
    }
    return () => {
      stopAll();
    };
  }, [stems]);

  const updateGains = useCallback(() => {
    const hasSolo = Object.values(stemStates).some((s) => s.soloed);
    for (const [name, track] of tracksRef.current.entries()) {
      const state = stemStates[name];
      if (!state) continue;
      let vol = state.volume;
      if (state.muted) vol = 0;
      if (hasSolo && !state.soloed) vol = 0;
      track.gain.gain.setValueAtTime(vol, ctxRef.current?.currentTime ?? 0);
    }
  }, [stemStates]);

  useEffect(() => {
    updateGains();
  }, [updateGains]);

  const stopAll = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    for (const track of tracksRef.current.values()) {
      try {
        track.source?.stop();
      } catch {
        /* already stopped */
      }
      track.source = null;
    }
  }, []);

  const play = useCallback(
    (fromTime?: number) => {
      const ctx = getContext();
      if (ctx.state === "suspended") ctx.resume();

      stopAll();

      const offset = fromTime ?? offsetRef.current;
      startTimeRef.current = ctx.currentTime - offset;

      for (const [, track] of tracksRef.current.entries()) {
        if (!track.buffer) continue;
        const source = ctx.createBufferSource();
        source.buffer = track.buffer;
        source.connect(track.gain);
        source.start(0, offset);
        track.source = source;
      }

      updateGains();
      setIsPlaying(true);

      const tick = () => {
        const elapsed = ctx.currentTime - startTimeRef.current;
        setCurrentTime(elapsed);
        offsetRef.current = elapsed;

        const maxDur = Math.max(
          ...Array.from(tracksRef.current.values()).map(
            (t) => t.buffer?.duration ?? 0,
          ),
        );
        if (elapsed >= maxDur) {
          stopAll();
          setIsPlaying(false);
          offsetRef.current = 0;
          setCurrentTime(0);
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [getContext, stopAll, updateGains, setIsPlaying, setCurrentTime],
  );

  const pause = useCallback(() => {
    const ctx = ctxRef.current;
    if (ctx) {
      offsetRef.current = ctx.currentTime - startTimeRef.current;
    }
    stopAll();
    setIsPlaying(false);
  }, [stopAll, setIsPlaying]);

  const seek = useCallback(
    (time: number) => {
      offsetRef.current = time;
      setCurrentTime(time);
      if (isPlaying) {
        play(time);
      }
    },
    [isPlaying, play, setCurrentTime],
  );

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, pause, play]);

  return { play, pause, seek, togglePlayPause, loadStems };
}
