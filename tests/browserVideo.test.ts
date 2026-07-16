import { afterEach, describe, expect, it, vi } from "vitest";
import { disposeVideoExportResult, exportBrowserVideo, type VideoExportProgress, type VideoExportResult } from "../src/shared/browserVideo";
import { sampleProject } from "../src/shared/sampleProject";

function stubVideoRuntime(options: { recorderConstructorError?: Error } = {}) {
  const track = { stop: vi.fn() };
  const stream = {
    addTrack: vi.fn(),
    getTracks: vi.fn(() => [track])
  };
  const gradient = { addColorStop: vi.fn() };
  const context = {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    createLinearGradient: vi.fn(() => gradient),
    save: vi.fn(),
    restore: vi.fn(),
    setTransform: vi.fn(),
    fillStyle: ""
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => context),
    captureStream: vi.fn(() => stream)
  };
  const destination = {
    connect: vi.fn((node: unknown) => node),
    disconnect: vi.fn(),
    stream: { getAudioTracks: vi.fn(() => []) }
  };
  const silentGain = {
    connect: vi.fn((node: unknown) => node),
    disconnect: vi.fn(),
    gain: { value: 0 }
  };
  const silent = {
    connect: vi.fn((node: unknown) => node),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn()
  };
  const closeAudioContext = vi.fn(async () => undefined);

  class FakeAudioContext {
    currentTime = 0;
    state: AudioContextState = "running";
    createMediaStreamDestination = vi.fn(() => destination);
    createOscillator = vi.fn(() => silent);
    createGain = vi.fn(() => silentGain);
    close = closeAudioContext;
  }

  class FakeMediaRecorder extends EventTarget {
    static isTypeSupported() {
      return true;
    }

    state: RecordingState = "inactive";

    constructor() {
      super();
      if (options.recorderConstructorError) throw options.recorderConstructorError;
    }

    start() {
      this.state = "recording";
    }

    stop() {
      this.state = "inactive";
      this.dispatchEvent(new Event("stop"));
    }
  }

  const times = [0, 0, 200, 200, 250, 250, 300, 300, 100_000, 100_000, 100_000];
  let animationFrameId = 0;
  const browserWindow = {
    requestAnimationFrame: vi.fn((callback: FrameRequestCallback) => {
      const id = ++animationFrameId;
      queueMicrotask(() => callback(times[0] ?? 100_000));
      return id;
    }),
    cancelAnimationFrame: vi.fn(),
    setTimeout: vi.fn((callback: TimerHandler) => {
      queueMicrotask(() => {
        if (typeof callback === "function") callback();
      });
      return 1;
    }),
    clearTimeout: vi.fn()
  };
  const createObjectURL = vi.fn(() => "blob:generated-export");
  const revokeObjectURL = vi.fn();
  vi.stubGlobal("document", { createElement: vi.fn(() => canvas) });
  vi.stubGlobal("AudioContext", FakeAudioContext);
  vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
  vi.stubGlobal("window", browserWindow);
  vi.stubGlobal("performance", { now: vi.fn(() => times.shift() ?? 100_000) });
  vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

  return { browserWindow, canvas, closeAudioContext, createObjectURL, revokeObjectURL, silent, track };
}

describe("browser video export result", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("revokes a legacy object URL at most once", () => {
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { revokeObjectURL });
    const result: VideoExportResult = {
      blob: new Blob(),
      url: "blob:legacy-export",
      extension: "webm",
      mimeType: "video/webm"
    };

    disposeVideoExportResult(result);
    disposeVideoExportResult(result);

    expect(revokeObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith(result.url);
  });

  it("prefers the result-owned disposer and calls it at most once", () => {
    const dispose = vi.fn();
    const result: VideoExportResult = {
      blob: new Blob(),
      url: "blob:disposable-export",
      extension: "mp4",
      mimeType: "video/mp4",
      dispose
    };

    disposeVideoExportResult(result);
    disposeVideoExportResult(result);

    expect(dispose).toHaveBeenCalledOnce();
  });

  it("throttles recording progress and releases runtime resources after success", async () => {
    const runtime = stubVideoRuntime();
    const progress: VideoExportProgress[] = [];
    const project = { ...sampleProject, characters: [], messages: [] };

    const result = await exportBrowserVideo(project, {}, (update) => progress.push(update));

    expect(progress[0]).toEqual({ phase: "preparing", progress: 0 });
    expect(progress.filter((update) => update.phase === "recording")).toHaveLength(2);
    expect(progress.at(-1)).toEqual({ phase: "done", progress: 1 });
    expect(runtime.browserWindow.cancelAnimationFrame).toHaveBeenCalled();
    expect(runtime.track.stop).toHaveBeenCalledOnce();
    expect(runtime.silent.stop).toHaveBeenCalled();
    expect(runtime.closeAudioContext).toHaveBeenCalledOnce();
    expect(runtime.canvas.width).toBe(0);
    expect(runtime.canvas.height).toBe(0);

    result.dispose?.();
    result.dispose?.();
    expect(runtime.revokeObjectURL).toHaveBeenCalledOnce();
  });

  it("releases initialized resources when recorder setup fails", async () => {
    const setupError = new Error("recorder unavailable");
    const runtime = stubVideoRuntime({ recorderConstructorError: setupError });
    const project = { ...sampleProject, characters: [], messages: [] };

    await expect(exportBrowserVideo(project, {})).rejects.toBe(setupError);

    expect(runtime.track.stop).toHaveBeenCalledOnce();
    expect(runtime.silent.stop).toHaveBeenCalled();
    expect(runtime.closeAudioContext).toHaveBeenCalledOnce();
    expect(runtime.createObjectURL).not.toHaveBeenCalled();
  });
});
