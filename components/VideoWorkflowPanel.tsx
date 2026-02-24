"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  processVideoAction,
  type ProcessVideoResult,
} from "@/app/actions/process-video";
import { VibePlayer } from "./VibePlayer";
import { Watermark } from "./Watermark";

/* ═══════════════════════════  Types  ═══════════════════════════════ */

type FormInput = {
  sourceVideoUrl: string;
  productDescription: string;
  productImageUrl: string;
  buyUrl: string;
};

type FrameSample = {
  dataUrl: string;
  timestamp: number;
  width: number;
  height: number;
};

/* ═══════════════════════════  Config  ══════════════════════════════ */

const NUM_SAMPLES = 12; // frames to sample for Director — more = better coverage
const MAX_VIDEO_SECONDS = 30;

const DEMO_PRODUCT_DESCRIPTION = `Nike offers a wide range of high-quality shoes, from performance running sneakers to stylish lifestyle options like Air Force 1 and Dunks.

Popular Models
Iconic lines include Air Max for cushioning, Dunk Low for streetwear, and Air Force 1 for everyday versatility. These models feature advanced tech like springy foam midsoles and breathable materials for comfort during workouts or casual wear`;

const DEMO_BUY_URL = "https://www.nike.com/t/reactx-rejuven8-big-kids-shoes-xplp2HHG/IF1746-300";

const defaultInput: FormInput = {
  sourceVideoUrl: "",
  productDescription: "",
  productImageUrl: "",
  buyUrl: "",
};

/* ═══════════════  Frame sampling utility  ═════════════════════════ */

function extractFrameAtTime(
  video: HTMLVideoElement,
  timestamp: number,
  maxDim = 768,
): Promise<FrameSample | null> {
  return new Promise((resolve) => {
    const handler = () => {
      video.removeEventListener("seeked", handler);
      try {
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        if (!vw || !vh) { resolve(null); return; }

        const scale = Math.min(maxDim / vw, maxDim / vh, 1);
        const cw = Math.round(vw * scale);
        const ch = Math.round(vh * scale);

        const canvas = document.createElement("canvas");
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(video, 0, 0, cw, ch);

        resolve({
          dataUrl: canvas.toDataURL("image/jpeg", 0.75),
          timestamp,
          width: cw,
          height: ch,
        });
      } catch {
        resolve(null);
      }
    };

    video.addEventListener("seeked", handler);
    video.currentTime = timestamp;
  });
}

async function sampleFrames(
  videoUrl: string,
  numSamples: number = NUM_SAMPLES,
): Promise<FrameSample[]> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    video.onloadedmetadata = async () => {
      const duration = video.duration;
      if (!duration || !isFinite(duration)) { resolve([]); return; }

      const frames: FrameSample[] = [];
      // Sample evenly across the video (skip very start and very end)
      const start = Math.max(0.5, duration * 0.05);
      const end = duration * 0.95;
      const step = (end - start) / Math.max(numSamples - 1, 1);

      for (let i = 0; i < numSamples; i++) {
        const ts = start + step * i;
        const frame = await extractFrameAtTime(video, ts);
        if (frame) frames.push(frame);
      }

      resolve(frames);
    };

    video.onerror = () => resolve([]);
    video.src = videoUrl;
    video.load();
  });
}

function isYoutubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/i.test(url);
}

function isMp4Url(url: string): boolean {
  return /\.mp4($|\?|#)/i.test(url) || /^blob:/i.test(url);
}

function isImageUrl(url: string): boolean {
  return /^https?:\/\/.+\.(png|jpe?g|webp|avif)($|\?|#)/i.test(url) || /^blob:/i.test(url);
}

async function getVideoDuration(videoUrl: string): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";

    video.onloadedmetadata = () => {
      const duration = video.duration;
      resolve(isFinite(duration) ? duration : null);
    };

    video.onerror = () => resolve(null);
    video.src = videoUrl;
    video.load();
  });
}

/* ═══════════════════════════  Component  ═══════════════════════════ */

export function VideoWorkflowPanel({ plan = "free" }: { plan?: string }) {
  const [input, setInput] = useState<FormInput>(defaultInput);
  const [result, setResult] = useState<ProcessVideoResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sampledFrames, setSampledFrames] = useState<FrameSample[]>([]);
  const [isSampling, setIsSampling] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadedImageName, setUploadedImageName] = useState("");
  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [friendlyStep, setFriendlyStep] = useState(0);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const friendlyRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logEndRef = useRef<HTMLDivElement | null>(null);
  const uploadedBlobUrlRef = useRef<string | null>(null);
  const uploadedImageBlobUrlRef = useRef<string | null>(null);
  const uploadedVideoFileRef = useRef<File | null>(null);

  /* ── Campo helpers ── */
  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLiveLogs((prev) => [...prev, `[${ts}] ${msg}`]);
    // Auto-scroll
    setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  const set = (key: keyof FormInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setInput((p) => ({ ...p, [key]: e.target.value }));

  const handleMp4Upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isMp4File = file.type === "video/mp4" || /\.mp4$/i.test(file.name);
    if (!isMp4File) {
      setError("Please upload an .mp4 file.");
      return;
    }

    const blobUrl = URL.createObjectURL(file);
    const duration = await getVideoDuration(blobUrl);

    if (!duration) {
      URL.revokeObjectURL(blobUrl);
      setError("Could not read uploaded video metadata.");
      return;
    }

    if (duration > MAX_VIDEO_SECONDS) {
      URL.revokeObjectURL(blobUrl);
      setError(`Uploaded video is ${duration.toFixed(1)}s. Max allowed length is ${MAX_VIDEO_SECONDS}s.`);
      return;
    }

    if (uploadedBlobUrlRef.current) {
      URL.revokeObjectURL(uploadedBlobUrlRef.current);
    }
    uploadedBlobUrlRef.current = blobUrl;
    uploadedVideoFileRef.current = file;
    setUploadedFileName(file.name);
    setError(null);
    setInput((p) => ({ ...p, sourceVideoUrl: blobUrl }));
  };

  const clearUpload = () => {
    if (uploadedBlobUrlRef.current) {
      URL.revokeObjectURL(uploadedBlobUrlRef.current);
      uploadedBlobUrlRef.current = null;
    }
    uploadedVideoFileRef.current = null;
    setUploadedFileName("");
    setSampledFrames([]);
    lastSampledUrl.current = "";
    setInput((p) => ({ ...p, sourceVideoUrl: "" }));
  };

  const isUpload = !!uploadedFileName;

  /* ── Image upload helpers ── */
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isValid = /\.(png|jpe?g|webp|avif)$/i.test(file.name) ||
      ["image/png", "image/jpeg", "image/webp", "image/avif"].includes(file.type);
    if (!isValid) {
      setError("Please upload a .jpg, .png, .webp, or .avif image.");
      return;
    }

    const blobUrl = URL.createObjectURL(file);
    if (uploadedImageBlobUrlRef.current) {
      URL.revokeObjectURL(uploadedImageBlobUrlRef.current);
    }
    uploadedImageBlobUrlRef.current = blobUrl;
    setUploadedImageName(file.name);
    setError(null);
    setInput((p) => ({ ...p, productImageUrl: blobUrl }));
  };

  const clearImageUpload = () => {
    if (uploadedImageBlobUrlRef.current) {
      URL.revokeObjectURL(uploadedImageBlobUrlRef.current);
      uploadedImageBlobUrlRef.current = null;
    }
    setUploadedImageName("");
    setInput((p) => ({ ...p, productImageUrl: "" }));
  };

  const isImageUpload = !!uploadedImageName;

  /* ── Auto-sample frames when video URL changes ── */
  const lastSampledUrl = useRef("");

  const doSampleFrames = useCallback(async (url: string) => {
    if (!url || url === lastSampledUrl.current) return;
    if (isYoutubeUrl(url)) {
      setError("YouTube links are not supported yet. Please use a direct .mp4 URL (max 30 seconds).");
      setSampledFrames([]);
      return;
    }
    if (!isMp4Url(url)) {
      setError("Please use a direct .mp4 URL (YouTube pages and other formats are not supported yet).");
      setSampledFrames([]);
      return;
    }
    lastSampledUrl.current = url;
    setIsSampling(true);
    setSampledFrames([]);
    setError(null);
    try {
      const duration = await getVideoDuration(url);
      if (!duration) {
        setError("Could not read video metadata. Please use a public direct .mp4 URL.");
        return;
      }
      if (duration > MAX_VIDEO_SECONDS) {
        setError(`Video is ${duration.toFixed(1)}s. Max allowed length is ${MAX_VIDEO_SECONDS}s.`);
        return;
      }

      const frames = await sampleFrames(url);
      setSampledFrames(frames);
      console.log(`[UI] Sampled ${frames.length} frames from video`);
    } catch {
      setSampledFrames([]);
    } finally {
      setIsSampling(false);
    }
  }, []);

  // Debounced sampling on URL change
  useEffect(() => {
    if (!input.sourceVideoUrl) return;
    const timer = setTimeout(() => doSampleFrames(input.sourceVideoUrl), 800);
    return () => clearTimeout(timer);
  }, [input.sourceVideoUrl, doSampleFrames]);

  useEffect(() => {
    return () => {
      if (uploadedBlobUrlRef.current) {
        URL.revokeObjectURL(uploadedBlobUrlRef.current);
      }
      if (uploadedImageBlobUrlRef.current) {
        URL.revokeObjectURL(uploadedImageBlobUrlRef.current);
      }
    };
  }, []);

  /* ── Submit ── */
  async function handleSubmit() {
    if (!input.sourceVideoUrl) {
      setError("Please upload a video file first.");
      return;
    }

    if (!input.productDescription?.trim()) {
      setError("Product description is required — the AI Director needs to know what to place!");
      return;
    }
    if (!input.productImageUrl?.trim()) {
      setError("Please upload a reference product image.");
      return;
    }

    const duration = await getVideoDuration(input.sourceVideoUrl);
    if (!duration) {
      setError("Could not read video metadata. Please use a public direct .mp4 URL.");
      return;
    }
    if (duration > MAX_VIDEO_SECONDS) {
      setError(`Video is ${duration.toFixed(1)}s. Max allowed length is ${MAX_VIDEO_SECONDS}s.`);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setLiveLogs([]);
    setElapsedSec(600);
    setFriendlyStep(0);
    setProgressMsg("Starting pipeline …");

    // Start 10-minute countdown timer
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, 600 - elapsed);
      setElapsedSec(remaining);
    }, 1000);

    // Rotate friendly messages every 12 seconds
    friendlyRef.current = setInterval(() => {
      setFriendlyStep((prev) => prev + 1);
    }, 12000);

    addLog("Pipeline started");

    try {
      // If frames haven't been sampled yet, do it now
      let frames = sampledFrames;
      if (frames.length === 0) {
        setProgressMsg("Extracting video frames …");
        addLog("Extracting video frames …");
        frames = await sampleFrames(input.sourceVideoUrl);
        setSampledFrames(frames);
        addLog(`✓ Sampled ${frames.length} frames`);
      }

      // Convert blob image URL to base64 data URL (blob URLs can't be accessed by the server)
      // Also re-encodes as JPEG so OpenAI accepts it (AVIF is not supported by their API)
      let productImageForServer = input.productImageUrl;
      if (productImageForServer.startsWith("blob:")) {
        addLog("Converting uploaded image to JPEG …");
        try {
          productImageForServer = await new Promise<string>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              const canvas = document.createElement("canvas");
              canvas.width = img.naturalWidth;
              canvas.height = img.naturalHeight;
              const ctx = canvas.getContext("2d");
              if (!ctx) { reject(new Error("Canvas context failed")); return; }
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL("image/jpeg", 0.92));
            };
            img.onerror = () => reject(new Error("Image load failed"));
            img.src = productImageForServer;
          });
          addLog("✓ Image converted to JPEG");
        } catch {
          addLog("✗ FAILED to convert uploaded image");
          setError("Failed to read uploaded image. Please try again.");
          return;
        }
      }

      setProgressMsg("Sending to AI Director (GPT-4o) …");
      addLog("Sending frames + product brief to AI Director (GPT-4o) …");
      addLog("Director analyses video → picks placement → writes prompts");
      addLog("Then SDXL composites → Kling generates video (3-8 min)");

      // Upload local video file to Supabase storage for persistent URL
      let persistentVideoUrl = input.sourceVideoUrl;
      if (uploadedVideoFileRef.current && input.sourceVideoUrl.startsWith("blob:")) {
        addLog("Uploading video to cloud storage …");
        setProgressMsg("Uploading video …");
        try {
          const formData = new FormData();
          formData.append("file", uploadedVideoFileRef.current);
          const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
          const uploadData = await uploadRes.json();
          if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed");
          persistentVideoUrl = uploadData.url;
          addLog("✓ Video uploaded to cloud storage");
        } catch (uploadErr) {
          addLog("⚠ Cloud upload failed: " + (uploadErr instanceof Error ? uploadErr.message : "unknown"));
          addLog("Continuing with local reference (video history may not replay)");
        }
      }

      const res = await processVideoAction({
        sourceVideoUrl: persistentVideoUrl,
        productDescription: input.productDescription,
        productImageUrl: productImageForServer,
        buyUrl: input.buyUrl || undefined,
        frameSamples: frames,
      });

      // Log pipeline steps from the server result
      if (res.pipelineSteps?.length) {
        for (const step of res.pipelineSteps) {
          const icon = step.includes("fail") ? "✗" : "✓";
          addLog(`${icon} ${step}`);
        }
      }

      if (res.aiClipUrl) {
        addLog("Video generated successfully!");
      } else {
        addLog("Pipeline completed but no video was generated");
      }

      if (res.savedToSupabase) {
        addLog("✓ Saved to your library");
      }
      if (res.saveError) {
        addLog(`⚠ Save error: ${res.saveError}`);
      }

      setResult(res);
      setProgressMsg("Done!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Pipeline failed.";
      addLog(`✗ ERROR: ${msg}`);
      setError(msg);
    } finally {
      if (progressRef.current) clearInterval(progressRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (friendlyRef.current) clearInterval(friendlyRef.current);
      setLoading(false);
      addLog("Pipeline finished");
    }
  }

  /* ═══════════════════  Render  ════════════════════════════════════ */

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* ── FORM ── */}
      <div className="bg-white/60 rounded-2xl p-6 space-y-5 border border-black/10">
        <h2 className="text-xl font-['Space_Grotesk'] font-bold text-black flex items-center gap-2">
          AI DIRECTOR PIPELINE
        </h2>
        <p className="text-sm font-['Inter'] text-black/50">
          Upload your video and product details — the AI Director will decide the
          perfect moment and position for natural product placement.
        </p>

        {/* One-click demo banner */}
        <div className="rounded-xl border border-[#36A64F]/30 bg-[#36A64F]/5 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-['Space_Grotesk'] font-bold text-[#36A64F]">Try a One-Click Demo</p>
            <p className="text-xs font-['Inter'] text-[#36A64F]/60 mt-0.5">
              Loads a sample video + product brief + product (Nike Shoes) image + link to the shoe. Just hit the green button to watch the full AI pipeline run!
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              // Reset previous state
              if (uploadedBlobUrlRef.current) { URL.revokeObjectURL(uploadedBlobUrlRef.current); uploadedBlobUrlRef.current = null; }
              if (uploadedImageBlobUrlRef.current) { URL.revokeObjectURL(uploadedImageBlobUrlRef.current); uploadedImageBlobUrlRef.current = null; }
              uploadedVideoFileRef.current = null;
              setUploadedFileName("");
              setUploadedImageName("");
              setSampledFrames([]);
              lastSampledUrl.current = "";
              setError(null);
              setResult(null);

              try {
                // Fetch demo video as a File
                const videoRes = await fetch("/loaddemo/demo.mp4");
                const videoBlob = await videoRes.blob();
                const videoFile = new File([videoBlob], "demo.mp4", { type: "video/mp4" });
                const videoBlobUrl = URL.createObjectURL(videoFile);
                uploadedBlobUrlRef.current = videoBlobUrl;
                uploadedVideoFileRef.current = videoFile;
                setUploadedFileName("demo.mp4");

                // Fetch demo image as a File
                const imageRes = await fetch("/loaddemo/nike.png");
                const imageBlob = await imageRes.blob();
                const imageBlobUrl = URL.createObjectURL(imageBlob);
                uploadedImageBlobUrlRef.current = imageBlobUrl;
                setUploadedImageName("nike.png");

                setInput({
                  sourceVideoUrl: videoBlobUrl,
                  productDescription: DEMO_PRODUCT_DESCRIPTION,
                  productImageUrl: imageBlobUrl,
                  buyUrl: DEMO_BUY_URL,
                });
              } catch {
                setError("Failed to load demo files. Please try again.");
              }
            }}
            disabled={loading}
            className="shrink-0 rounded-lg bg-[#36A64F] px-4 py-2 font-['Space_Mono'] text-xs font-bold uppercase tracking-wider text-white hover:bg-[#36A64F]/90 disabled:opacity-40 transition"
          >
            Load Demo
          </button>
        </div>

        {/* VIDEO UPLOAD */}
        <div>
          <label className="block text-sm font-['Space_Mono'] font-medium uppercase tracking-wider text-black/70 mb-2">
            Video *
          </label>

          <div className="rounded-lg border border-black/10 bg-white/50 p-3">
            <p className="text-xs font-['Inter'] text-black/40 mb-2">
              Upload an .mp4 file (max {MAX_VIDEO_SECONDS}s)
            </p>

            {!isUpload ? (
              <input
                type="file"
                accept="video/mp4,.mp4"
                onChange={handleMp4Upload}
                className="block w-full text-xs font-['Inter'] text-black/60 file:mr-3 file:rounded-md file:border-0 file:bg-black/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-black hover:file:bg-black/20"
              />
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-xs font-['Inter'] text-[#36A64F]">Uploaded: {uploadedFileName}</span>
                <button
                  type="button"
                  onClick={clearUpload}
                  className="text-xs font-['Inter'] text-black/40 hover:text-black/60 underline underline-offset-2 transition"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {isSampling && (
            <p className="text-xs font-['Inter'] text-[#36A64F]/70 mt-1 animate-pulse">
              Sampling frames from video …
            </p>
          )}
          {sampledFrames.length > 0 && !isSampling && (
            <p className="text-xs font-['Inter'] text-[#36A64F] mt-1">
              ✓ {sampledFrames.length} frames ready for AI Director
            </p>
          )}
        </div>

        {/* PRODUCT BRIEF */}
        <div>
          <label className="block text-sm font-['Space_Mono'] font-medium uppercase tracking-wider text-black/70 mb-2">
            Product Brief *
          </label>
          <textarea
            value={input.productDescription}
            onChange={set("productDescription")}
            rows={4}
            className="w-full rounded-lg bg-white border border-black/10 px-4 py-2.5 text-sm font-['Inter'] text-black placeholder-black/30 focus:border-[#36A64F] focus:ring-1 focus:ring-[#36A64F] transition resize-none"
            placeholder={"Tell the AI Director everything:\n• Brand & product name (e.g. \"Nike Air Max\")\n• What it looks like (e.g. \"green and white sneakers\")\n• Where it belongs (e.g. \"on someone's feet\")\n• The vibe (e.g. \"sporty, youthful, streetwear\")"}
          />
          <p className="text-xs font-['Inter'] text-black/40 mt-1">
            This is what the AI Director reads. The more you tell it — brand, appearance, mood, where it fits — the more natural the placement.
          </p>
        </div>

        {/* REFERENCE IMAGE */}
        <div>
          <label className="block text-sm font-['Space_Mono'] font-medium uppercase tracking-wider text-black/70 mb-2">
            Product Image *
          </label>

          <div className="rounded-lg border border-black/10 bg-white/50 p-3">
            <p className="text-xs font-['Inter'] text-black/40 mb-2">
              Upload a reference image of the product (.png, .jpg, .webp)
            </p>

            {!isImageUpload ? (
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif,.png,.jpg,.jpeg,.webp,.avif"
                onChange={handleImageUpload}
                className="block w-full text-xs font-['Inter'] text-black/60 file:mr-3 file:rounded-md file:border-0 file:bg-black/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-black hover:file:bg-black/20"
              />
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-xs font-['Inter'] text-[#36A64F]">Uploaded: {uploadedImageName}</span>
                <button
                  type="button"
                  onClick={clearImageUpload}
                  className="text-xs font-['Inter'] text-black/40 hover:text-black/60 underline underline-offset-2 transition"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>

        {/* BUY LINK */}
        <div>
          <label className="block text-sm font-['Space_Mono'] font-medium uppercase tracking-wider text-black/50 mb-2">
            Buy Link <span className="text-black/30 normal-case tracking-normal font-['Inter'] font-normal">(optional — shown on Shop button)</span>
          </label>
          <input
            type="text"
            value={input.buyUrl}
            onChange={set("buyUrl")}
            className="w-full rounded-lg bg-white border border-black/10 px-4 py-2.5 text-sm font-['Inter'] text-black placeholder-black/30 focus:border-[#36A64F] focus:ring-1 focus:ring-[#36A64F] transition"
            placeholder="https://store.example.com/product"
          />
        </div>

        {/* SAMPLED FRAMES preview */}
        {sampledFrames.length > 0 && (
          <div>
            <p className="text-xs font-['Inter'] text-black/40 mb-2">
              Frames sampled for AI Director — it will choose the best one:
            </p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {sampledFrames.map((f, i) => (
                <div key={i} className="shrink-0 relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={f.dataUrl}
                    alt={`Frame ${i + 1}`}
                    className="h-16 rounded-md border border-black/10 object-cover"
                  />
                  <span className="absolute bottom-0 left-0 text-[10px] bg-black/70 text-white px-1 rounded-tr">
                    {f.timestamp.toFixed(1)}s
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBMIT */}
        <button
          onClick={handleSubmit}
          disabled={
            loading ||
            !input.sourceVideoUrl ||
            !input.productDescription?.trim() ||
            !input.productImageUrl?.trim()
          }
          className="w-full py-3 rounded-xl font-['Space_Mono'] text-sm font-bold uppercase tracking-wider text-white bg-[#36A64F] hover:bg-[#36A64F]/90 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {loading ? "AI Director is working …" : "Let AI Director Place Product"}
        </button>
      </div>

      {/* ── LIVE LOG PANEL ── */}
      {(loading || liveLogs.length > 0) && (() => {
        const FRIENDLY_MESSAGES = [
          "Cooking something up for you …",
          "Director is analyzing your video frame by frame …",
          "Finding the perfect moment for product placement …",
          "AI is brainstorming creative placements …",
          "Crafting a seamless product integration …",
          "Snipping the best frames for your product …",
          "Our AI director is setting up the shot …",
          "Inserting your product into the scene …",
          "Figuring out the most natural-looking placement …",
          "Stitching everything together beautifully …",
          "Almost there, adding the finishing touches …",
          "Patience pays off — this is going to look great …",
          "The AI is working its magic …",
          "Fine-tuning the placement for perfection …",
          "Wrapping up — your video is nearly ready …",
        ];
        const currentMsg = FRIENDLY_MESSAGES[friendlyStep % FRIENDLY_MESSAGES.length];
        const minutes = Math.floor(elapsedSec / 60);
        const seconds = elapsedSec % 60;

        return (
          <div className="bg-white/60 rounded-2xl p-6 border border-black/10 space-y-5">
            {/* Countdown timer */}
            {loading && (
              <div className="text-center space-y-1">
                <p className="text-xs font-['Space_Mono'] uppercase tracking-widest text-black/40">
                  Estimated time remaining
                </p>
                <p className="text-4xl font-['Space_Mono'] font-bold text-[#36A64F] tabular-nums">
                  {minutes}:{String(seconds).padStart(2, "0")}
                </p>
              </div>
            )}

            {/* Animated progress bar */}
            {loading && (
              <div className="w-full bg-black/10 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#36A64F] h-1.5 rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${Math.max(2, ((600 - elapsedSec) / 600) * 100)}%` }}
                />
              </div>
            )}

            {/* Friendly rotating message */}
            {loading && (
              <div className="text-center py-3">
                <p
                  key={friendlyStep}
                  className="text-lg font-['Space_Grotesk'] font-medium text-black/70 animate-fade-in"
                >
                  {currentMsg}
                </p>
              </div>
            )}

            {/* Completion status (when done) */}
            {!loading && liveLogs.length > 0 && (
              <div className="text-center py-2">
                <p className="text-sm font-['Space_Mono'] text-black/50">
                  {liveLogs.some((l) => l.includes("✗") || l.includes("ERROR"))
                    ? "Something went wrong — check the error below"
                    : "All done! Your video is ready below"}
                </p>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── ERROR ── */}
      {error && (
        <div className="bg-black/5 border border-black/10 rounded-xl p-4">
          <p className="text-sm font-['Inter'] text-black/60">{error}</p>
        </div>
      )}

      {/* ── RESULTS ── */}
      {result && (
        <div className="space-y-6">
          {/* Director's Decision */}
          {result.directorDecision && (
            <div className="bg-white/60 rounded-2xl p-6 border border-black/10 space-y-3">
              <h3 className="text-lg font-['Space_Grotesk'] font-semibold text-black flex items-center gap-2">
                🎯 AI Director&apos;s Decision
              </h3>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-black/50">Scene: </span>
                  <span className="text-black/80">
                    {result.directorDecision.sceneDescription}
                  </span>
                </div>
                <div>
                  <span className="text-black/50">Why this placement: </span>
                  <span className="text-black/80">
                    {result.directorDecision.placementRationale}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-black/40 font-['Space_Mono']">
                  <span>
                    Frame: #{result.directorDecision.chosenFrameIndex + 1} at{" "}
                    {result.directorDecision.chosenTimestamp.toFixed(1)}s
                  </span>
                  <span>
                    Region: ({(result.directorDecision.maskRegion.x * 100).toFixed(0)}%,{" "}
                    {(result.directorDecision.maskRegion.y * 100).toFixed(0)}%) →{" "}
                    {(result.directorDecision.maskRegion.w * 100).toFixed(0)}% ×{" "}
                    {(result.directorDecision.maskRegion.h * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Video Player */}
          {result.aiClipUrl && (
            <div className="relative">
              <VibePlayer
                originalVideoUrl={result.originalVideoUrl}
                aiClipUrl={result.aiClipUrl}
                insertAtTimestamp={result.insertAtTimestamp}
                adSlot={result.adSlot}
              />
              <Watermark visible={plan === "free"} />
            </div>
          )}

          {/* Pipeline info */}
          <div className="bg-white/60 rounded-xl p-4 border border-black/10">
            <p className="text-xs font-['Space_Mono'] uppercase tracking-wider text-black/40 mb-2">Pipeline steps</p>
            <div className="flex flex-wrap gap-2">
              {result.pipelineSteps.map((step, i) => (
                <span
                  key={i}
                  className={`text-xs px-2.5 py-1 rounded-full ${
                    step.includes("fail")
                      ? "bg-[#FF6363]/10 text-[#FF6363]"
                      : "bg-[#36A64F]/10 text-[#36A64F]"
                  }`}
                >
                  {step}
                </span>
              ))}
            </div>
            {result.savedToSupabase && (
              <p className="text-xs text-[#36A64F] mt-2">✓ Saved to library</p>
            )}
            {result.saveError && (
              <p className="text-xs text-[#FF6363] mt-2">Save error: {result.saveError}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
