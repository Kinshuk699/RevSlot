"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  processVideoAction,
  type ProcessVideoResult,
} from "@/app/actions/process-video";
import { VibePlayer } from "@/components/VibePlayer";

/* ═══════════════════════════  Types  ═══════════════════════════════ */

type WorkflowInput = {
  sourceVideoUrl: string;
  brand: string;
  productDescription: string;
  buyUrl: string;
  productImageUrl: string;
};

const defaultInput: WorkflowInput = {
  sourceVideoUrl:
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  brand: "Red Bull",
  productDescription: "a silver and blue Red Bull energy drink can",
  buyUrl: "https://stripe.com",
  productImageUrl: "",
};

const AD_TIMESTAMP = 3;

/* ═══════  Frame extraction (runs in browser via Canvas)  ══════════ */

function extractFrame(
  videoUrl: string,
  timestamp: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    const cleanup = () => video.remove();

    video.addEventListener(
      "seeked",
      () => {
        try {
          const canvas = document.createElement("canvas");
          const maxDim = 1024;
          const scale = Math.min(
            maxDim / video.videoWidth,
            maxDim / video.videoHeight,
            1,
          );
          canvas.width = Math.round(video.videoWidth * scale);
          canvas.height = Math.round(video.videoHeight * scale);

          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas not available");
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          cleanup();
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        } catch (err) {
          cleanup();
          reject(err);
        }
      },
      { once: true },
    );

    video.addEventListener(
      "error",
      () => {
        cleanup();
        reject(
          new Error(
            "Could not load video — make sure the URL is direct (not YouTube) and supports CORS.",
          ),
        );
      },
      { once: true },
    );

    video.addEventListener(
      "loadeddata",
      () => {
        video.currentTime = Math.min(timestamp, video.duration - 0.1);
      },
      { once: true },
    );

    video.src = videoUrl;
    video.load();
  });
}

/* ═══════════════════════  Component  ══════════════════════════════ */

export function VideoWorkflowPanel() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState("");
  const [input, setInput] = useState<WorkflowInput>(defaultInput);
  const [result, setResult] = useState<ProcessVideoResult | null>(null);

  const statusText = useMemo(() => {
    if (isProcessing) return step;
    if (result) {
      if (result.processedVideoUrl !== defaultInput.sourceVideoUrl) {
        return "✓ AI product placement video generated!";
      }
      if (result.inpaintedFrameUrl) {
        return "✓ Product placed in frame (video gen unavailable)";
      }
      return "Ready — using overlay mode";
    }
    return "Idle";
  }, [isProcessing, step, result]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isProcessing) return;

    setIsProcessing(true);
    setResult(null);

    try {
      // ① Extract frame client-side
      setStep("① Extracting video frame at " + AD_TIMESTAMP + "s …");
      let frameDataUrl: string | undefined;

      try {
        frameDataUrl = await extractFrame(input.sourceVideoUrl, AD_TIMESTAMP);
        setStep("② Frame captured! Sending to Fal AI …");
      } catch (err) {
        console.warn("Frame extraction failed:", err);
        setStep("⚠ Frame extraction failed (CORS). Falling back to overlay …");
        toast.warning(
          "Could not extract frame — video may block CORS. Using overlay mode.",
        );
      }

      // ② + ③ Server action: inpaint + video generation
      setStep(
        frameDataUrl
          ? "③ AI is placing your product in the scene & generating video … this takes 1-3 min"
          : "③ Generating product image …",
      );

      const next = await processVideoAction({
        ...input,
        frameDataUrl,
      });

      setResult(next);

      // Toast based on what worked
      if (
        next.inpaintedFrameUrl &&
        next.processedVideoUrl !== input.sourceVideoUrl
      ) {
        toast.success("AI product placement video generated!");
      } else if (next.inpaintedFrameUrl) {
        toast.success(
          "Product placed in frame! Video generation wasn't available.",
        );
      } else {
        toast.info("Using original video with shoppable overlay.");
      }

      if (!next.savedToSupabase) {
        toast.warning(`DB save failed: ${next.saveError ?? "unknown"}`);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Processing failed.",
      );
    } finally {
      setIsProcessing(false);
      setStep("");
    }
  };

  const handleRetry = () => {
    // Re-run with current inputs
    const fakeEvent = {
      preventDefault: () => {},
    } as React.FormEvent<HTMLFormElement>;
    handleSubmit(fakeEvent);
  };

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
      <h2 className="text-xl font-semibold">AI Video Product Placement</h2>
      <p className="mt-2 text-sm text-zinc-400">
        Paste a video URL and describe your product. AI extracts a frame,
        paints your product into the scene, then generates a product
        placement video — like Halftime.
      </p>

      {/* ─── Form ─── */}
      <form
        onSubmit={handleSubmit}
        className="mt-5 grid gap-3 md:grid-cols-2"
      >
        <label className="flex flex-col gap-1 text-sm text-zinc-300 md:col-span-2">
          Video URL
          <input
            value={input.sourceVideoUrl}
            onChange={(e) =>
              setInput((p) => ({ ...p, sourceVideoUrl: e.target.value }))
            }
            className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-500"
            placeholder="https://..."
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          Brand
          <input
            value={input.brand}
            onChange={(e) =>
              setInput((p) => ({ ...p, brand: e.target.value }))
            }
            className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-500"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          Buy URL
          <input
            value={input.buyUrl}
            onChange={(e) =>
              setInput((p) => ({ ...p, buyUrl: e.target.value }))
            }
            className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-500"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-zinc-300 md:col-span-2">
          Product Description
          <input
            value={input.productDescription}
            onChange={(e) =>
              setInput((p) => ({
                ...p,
                productDescription: e.target.value,
              }))
            }
            className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-500"
            placeholder="e.g. red energy drink can, white Nike sneaker, black headphones"
            required
          />
          <span className="text-xs text-zinc-500">
            AI paints this product INTO a video frame, then animates it
          </span>
        </label>

        <label className="flex flex-col gap-1 text-sm text-zinc-300 md:col-span-2">
          Product image URL{" "}
          <span className="text-zinc-600">
            (optional — leave empty to use AI-generated)
          </span>
          <input
            value={input.productImageUrl}
            onChange={(e) =>
              setInput((p) => ({ ...p, productImageUrl: e.target.value }))
            }
            className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-500"
            placeholder="https://... or leave empty"
          />
        </label>

        <div className="mt-1 flex flex-wrap items-center gap-2 md:col-span-2">
          <button
            type="submit"
            disabled={isProcessing}
            className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isProcessing ? "Processing…" : "Process Video"}
          </button>
          <button
            type="button"
            onClick={handleRetry}
            disabled={isProcessing}
            className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Retry
          </button>
          <span className="text-xs text-zinc-400">
            Status: {statusText}
          </span>
        </div>
      </form>

      {/* ─── Progress spinner ─── */}
      {isProcessing && (
        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
            <span className="text-sm text-zinc-300">{step}</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-600"
              style={{
                width: "70%",
                animation: "pulse 2s ease-in-out infinite",
              }}
            />
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Video generation takes 1-3 minutes. Don&apos;t close this tab.
          </p>
        </div>
      )}

      {/* ─── Results ─── */}
      {result && !isProcessing ? (
        <div className="mt-6 space-y-4">
          {/* Inpainted frame preview */}
          {result.inpaintedFrameUrl ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <h3 className="mb-2 text-sm font-semibold text-emerald-400">
                AI-Inpainted Frame (product placed in scene)
              </h3>
              <div className="flex flex-col items-start gap-4 sm:flex-row">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={result.inpaintedFrameUrl}
                  alt="Product in scene"
                  className="w-full max-w-md rounded-lg border border-zinc-700"
                />
                <p className="text-xs text-zinc-500">
                  Fal AI (fast-sdxl-inpainting) painted your product into the
                  video frame. This frame was then sent to Kling image-to-video
                  to generate the clip below.
                </p>
              </div>
            </div>
          ) : null}

          {/* Generated video player */}
          <VibePlayer
            videoUrl={result.processedVideoUrl}
            adSlot={result.adSlot}
          />
        </div>
      ) : null}
    </section>
  );
}
