"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  processVideoAction,
  type ProcessVideoResult,
} from "@/app/actions/process-video";
import { VibePlayer } from "@/components/VibePlayer";

type WorkflowInput = {
  sourceVideoUrl: string;
  brand: string;
  productDescription: string;
  buyUrl: string;
  productImageUrl: string;
};

const defaultInput: WorkflowInput = {
  sourceVideoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  brand: "Coca-Cola",
  productDescription: "a red Coca-Cola can with water droplets",
  buyUrl: "https://stripe.com",
  productImageUrl:
    "https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=400&q=80",
};

export function VideoWorkflowPanel() {
  const [isPending, startTransition] = useTransition();
  const [input, setInput] = useState<WorkflowInput>(defaultInput);
  const [lastInput, setLastInput] = useState<WorkflowInput>(defaultInput);
  const [result, setResult] = useState<ProcessVideoResult | null>(null);

  const statusText = useMemo(() => {
    if (isPending) {
      return "Processing... running Twelve Labs + Fal workflow";
    }

    if (result) {
      return `Ready · detected ${result.detectionQuery} at ${result.detectionTimestamp.toFixed(1)}s`;
    }

    return "Idle";
  }, [isPending, result]);

  const runProcess = (payload: WorkflowInput) => {
    startTransition(async () => {
      try {
        const next = await processVideoAction(payload);
        setResult(next);
        setLastInput(payload);

        if (next.savedToSupabase) {
          toast.success("Video processed and saved to Supabase.");
        } else {
          toast.warning(`Processed, but save failed: ${next.saveError ?? "Unknown error"}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Processing failed.";
        toast.error(message);
      }
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    runProcess(input);
  };

  const handleRetry = () => {
    runProcess(lastInput);
  };

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
      <h2 className="text-xl font-semibold">AI Video Processing Workflow (Step 4)</h2>
      <p className="mt-2 text-sm text-zinc-400">
        Paste a video URL, describe your product, and let AI handle the rest. The inpainting model auto-matches
        your scene’s lighting &amp; perspective.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-zinc-300 md:col-span-2">
          Video URL
          <input
            value={input.sourceVideoUrl}
            onChange={(event) => setInput((prev) => ({ ...prev, sourceVideoUrl: event.target.value }))}
            className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-500"
            placeholder="https://..."
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          Brand
          <input
            value={input.brand}
            onChange={(event) => setInput((prev) => ({ ...prev, brand: event.target.value }))}
            className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-500"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          Buy URL
          <input
            value={input.buyUrl}
            onChange={(event) => setInput((prev) => ({ ...prev, buyUrl: event.target.value }))}
            className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-500"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-zinc-300 md:col-span-2">
          Product Description
          <input
            value={input.productDescription}
            onChange={(event) => setInput((prev) => ({ ...prev, productDescription: event.target.value }))}
            className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-500"
            placeholder="e.g. red energy drink can, white Nike sneaker, black headphones"
            required
          />
          <span className="text-xs text-zinc-500">Describe what your product looks like — the AI matches it to the video automatically</span>
        </label>

        <label className="flex flex-col gap-1 text-sm text-zinc-300 md:col-span-2">
          Product image URL (bubble)
          <input
            value={input.productImageUrl}
            onChange={(event) => setInput((prev) => ({ ...prev, productImageUrl: event.target.value }))}
            className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-500"
          />
        </label>

        <div className="mt-1 flex flex-wrap items-center gap-2 md:col-span-2">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? "Processing..." : "Process Video"}
          </button>
          <button
            type="button"
            onClick={handleRetry}
            disabled={isPending}
            className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Retry
          </button>
          <span className="text-xs text-zinc-400">Status: {statusText}</span>
        </div>
      </form>

      {result ? (
        <div className="mt-6">
          <VibePlayer videoUrl={result.processedVideoUrl} adSlot={result.adSlot} />
        </div>
      ) : null}
    </section>
  );
}
