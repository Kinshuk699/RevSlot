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

const defaultInput: FormInput = {
  sourceVideoUrl:
    "https://videos.pexels.com/video-files/4828605/4828605-hd_1920_1080_25fps.mp4",
  productDescription: "Red Bull Energy Drink — a premium energy drink for active, adventurous lifestyles. Slim 250ml aluminium can, blue & silver with the iconic two-red-bulls logo. Place it naturally on a surface where someone might grab one — a desk, counter, or table. The vibe should feel youthful and high-energy.",
  productImageUrl:
    "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=700&q=80",
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
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

  const setSourceVideoUrl = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (uploadedBlobUrlRef.current) {
      URL.revokeObjectURL(uploadedBlobUrlRef.current);
      uploadedBlobUrlRef.current = null;
    }
    uploadedVideoFileRef.current = null;
    setUploadedFileName("");
    setInput((p) => ({ ...p, sourceVideoUrl: e.target.value }));
  };

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
  const hasTypedUrl = !isUpload && input.sourceVideoUrl.length > 0 && !input.sourceVideoUrl.startsWith("blob:");

  /* ── Image upload helpers ── */
  const setProductImageUrl = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (uploadedImageBlobUrlRef.current) {
      URL.revokeObjectURL(uploadedImageBlobUrlRef.current);
      uploadedImageBlobUrlRef.current = null;
    }
    setUploadedImageName("");
    setInput((p) => ({ ...p, productImageUrl: e.target.value }));
  };

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
  const hasTypedImageUrl = !isImageUpload && input.productImageUrl.length > 0 && !input.productImageUrl.startsWith("blob:");

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
    if (isYoutubeUrl(input.sourceVideoUrl)) {
      setError("YouTube links are not supported yet. Please paste a direct .mp4 URL.");
      return;
    }
    if (!isMp4Url(input.sourceVideoUrl)) {
      setError("Please use a direct .mp4 URL.");
      return;
    }

    if (!input.productDescription?.trim()) {
      setError("Product description is required — the AI Director needs to know what to place!");
      return;
    }
    if (!input.productImageUrl?.trim()) {
      setError("Reference product image is required for exact visual fidelity.");
      return;
    }
    if (!isImageUrl(input.productImageUrl.trim())) {
      setError("Please provide a direct public image URL (.png, .jpg, .jpeg, .webp, or .avif).");
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
    setElapsedSec(0);
    setProgressMsg("Starting pipeline …");

    // Start elapsed timer
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

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

      setProgressMsg("📤 Sending to AI Director (GPT-4o) …");
      addLog("📤 Sending frames + product brief to AI Director (GPT-4o) …");
      addLog("⏳ Director analyses video → picks placement → writes prompts");
      addLog("⏳ Then SDXL composites → Kling generates video (3-8 min)");

      // Upload local video file to Supabase storage for persistent URL
      let persistentVideoUrl = input.sourceVideoUrl;
      if (uploadedVideoFileRef.current && input.sourceVideoUrl.startsWith("blob:")) {
        addLog("☁️ Uploading video to cloud storage …");
        setProgressMsg("☁️ Uploading video …");
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
        addLog("🎉 Video generated successfully!");
      } else {
        addLog("⚠ Pipeline completed but no video was generated");
      }

      if (res.savedToSupabase) {
        addLog("✓ Saved to your library");
      }
      if (res.saveError) {
        addLog(`⚠ Save error: ${res.saveError}`);
      }

      setResult(res);
      setProgressMsg("✅ Done!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Pipeline failed.";
      addLog(`✗ ERROR: ${msg}`);
      setError(msg);
    } finally {
      if (progressRef.current) clearInterval(progressRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      setLoading(false);
      addLog("Pipeline finished");
    }
  }

  /* ═══════════════════  Render  ════════════════════════════════════ */

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* ── FORM ── */}
      <div className="bg-white/60 rounded-2xl p-6 space-y-5 border border-black/10">
        <h2 className="text-xl font-['Space_Grotesk'] font-semibold text-black flex items-center gap-2">
          🎬 AI Director Pipeline
        </h2>
        <p className="text-sm text-black/50">
          Enter your video and product details — the AI Director will decide the
          perfect moment and position for natural product placement.
        </p>

        {/* One-click demo banner */}
        <div className="rounded-xl border border-[#36A64F]/30 bg-[#36A64F]/5 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#36A64F]">🎯 Try a One-Click Demo</p>
            <p className="text-xs text-[#36A64F]/60 mt-0.5">
              Pre-loads a sample video + Red Bull product brief. Just hit the green button to watch the full AI pipeline run.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              // Reset to defaults
              if (uploadedBlobUrlRef.current) { URL.revokeObjectURL(uploadedBlobUrlRef.current); uploadedBlobUrlRef.current = null; }
              if (uploadedImageBlobUrlRef.current) { URL.revokeObjectURL(uploadedImageBlobUrlRef.current); uploadedImageBlobUrlRef.current = null; }
              uploadedVideoFileRef.current = null;
              setUploadedFileName("");
              setUploadedImageName("");
              setSampledFrames([]);
              lastSampledUrl.current = "";
              setError(null);
              setResult(null);
              setInput({ ...defaultInput });
            }}
            disabled={loading}
            className="shrink-0 rounded-lg bg-[#36A64F] px-4 py-2 font-['Space_Mono'] text-xs font-bold uppercase tracking-wider text-white hover:bg-[#36A64F]/90 disabled:opacity-40 transition"
          >
            Load Demo
          </button>
        </div>

        {/* VIDEO URL */}
        <div>
          <label className="block text-sm font-medium text-black/70 mb-1">
            Video URL
          </label>
          <input
            type="text"
            value={isUpload ? "" : input.sourceVideoUrl}
            onChange={setSourceVideoUrl}
            disabled={isUpload}
            className={`w-full rounded-lg bg-white border border-black/10 px-4 py-2.5 text-black placeholder-black/30 focus:border-[#36A64F] focus:ring-1 focus:ring-[#36A64F] transition ${
              isUpload ? "opacity-40 cursor-not-allowed" : ""
            }`}
            placeholder={isUpload ? "Upload active — remove file to use a URL" : "https://example.com/video.mp4 (max 30s)"}
          />
          <p className="text-xs text-black/40 mt-1">
            Supports direct public <span className="text-black/60">.mp4</span> URLs only (max {MAX_VIDEO_SECONDS}s). YouTube links are not supported yet.
          </p>

          <div className="mt-3 flex items-center gap-3 text-xs text-black/30">
            <div className="flex-1 border-t border-black/10" />
            <span>OR</span>
            <div className="flex-1 border-t border-black/10" />
          </div>

          <div className={`mt-3 rounded-lg border border-black/10 bg-white/50 p-3 ${
            hasTypedUrl ? "opacity-40 pointer-events-none" : ""
          }`}>
            <label className="block text-xs font-medium text-black/60 mb-2">
              Upload .mp4 file (max {MAX_VIDEO_SECONDS}s)
            </label>

            {!isUpload ? (
              <input
                type="file"
                accept="video/mp4,.mp4"
                onChange={handleMp4Upload}
                disabled={hasTypedUrl}
                className="block w-full text-xs text-black/60 file:mr-3 file:rounded-md file:border-0 file:bg-black/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-black hover:file:bg-black/20"
              />
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#36A64F]">✅ {uploadedFileName}</span>
                <button
                  type="button"
                  onClick={clearUpload}
                  className="text-xs text-red-400 hover:text-red-300 underline underline-offset-2 transition"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {isSampling && (
            <p className="text-xs text-[#36A64F]/70 mt-1 animate-pulse">
              Sampling frames from video …
            </p>
          )}
          {sampledFrames.length > 0 && !isSampling && (
            <p className="text-xs text-[#36A64F] mt-1">
              ✓ {sampledFrames.length} frames ready for AI Director
            </p>
          )}
        </div>

        {/* PRODUCT BRIEF — the one field that matters */}
        <div className="bg-[#36A64F]/5 rounded-xl p-4 border border-[#36A64F]/20">
          <label className="block text-sm font-semibold text-[#36A64F] mb-1">
            Product Brief *
          </label>
          <textarea
            value={input.productDescription}
            onChange={set("productDescription")}
            rows={4}
            className="w-full rounded-lg bg-white border border-[#36A64F]/20 px-4 py-2.5 text-black placeholder-black/30 focus:border-[#36A64F] focus:ring-1 focus:ring-[#36A64F] transition resize-none"
            placeholder={"Tell the AI Director everything:\n• Brand & product name (e.g. \"Red Bull Energy Drink\")\n• What it looks like (e.g. \"slim 250ml blue & silver aluminium can\")\n• Where it belongs (e.g. \"on a desk, kitchen counter, café table\")\n• The vibe (e.g. \"youthful, high-energy, adventurous\")"}
          />
          <p className="text-xs text-[#36A64F]/50 mt-1">
            This is ALL the AI Director reads. The more you tell it — brand, appearance, mood, where it fits — the more natural the placement.
          </p>
        </div>

        {/* REFERENCE IMAGE — mandatory for exact visual fidelity */}
        <div className="bg-[#FF6363]/5 rounded-xl p-4 border border-[#FF6363]/20">
          <label className="block text-sm font-semibold text-[#FF6363] mb-1">
            Reference Product Image *
          </label>
          <input
            type="text"
            value={isImageUpload ? "" : input.productImageUrl}
            onChange={setProductImageUrl}
            disabled={isImageUpload}
            className={`w-full rounded-lg bg-white border border-[#FF6363]/20 px-4 py-2.5 text-black placeholder-black/30 focus:border-[#FF6363] focus:ring-1 focus:ring-[#FF6363] transition text-sm ${
              isImageUpload ? "opacity-40 cursor-not-allowed" : ""
            }`}
            placeholder={isImageUpload ? "Upload active — remove file to use a URL" : "https://example.com/product.jpg"}
          />
          <p className="text-xs text-[#FF6363]/50 mt-1">
            For exact visual fidelity, a reference product image is still best (used for generation, not as an overlay).
          </p>

          <div className="mt-3 flex items-center gap-3 text-xs text-[#FF6363]/30">
            <div className="flex-1 border-t border-[#FF6363]/15" />
            <span>OR</span>
            <div className="flex-1 border-t border-[#FF6363]/15" />
          </div>

          <div className={`mt-3 rounded-lg border border-[#FF6363]/15 bg-white/50 p-3 ${
            hasTypedImageUrl ? "opacity-40 pointer-events-none" : ""
          }`}>
            <label className="block text-xs font-medium text-[#FF6363]/60 mb-2">
              Upload image file
            </label>

            {!isImageUpload ? (
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif,.png,.jpg,.jpeg,.webp,.avif"
                onChange={handleImageUpload}
                disabled={hasTypedImageUrl}
                className="block w-full text-xs text-black/60 file:mr-3 file:rounded-md file:border-0 file:bg-[#FF6363]/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-[#FF6363] hover:file:bg-[#FF6363]/20"
              />
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#36A64F]">✅ {uploadedImageName}</span>
                <button
                  type="button"
                  onClick={clearImageUpload}
                  className="text-xs text-red-400 hover:text-red-300 underline underline-offset-2 transition"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>

        {/* BUY LINK — the only extra field (it's the shop URL for the CTA bar) */}
        <div>
          <label className="block text-sm font-medium text-black/50 mb-1">
            Buy Link <span className="text-black/30">(optional — shown on the Shop button)</span>
          </label>
          <input
            type="text"
            value={input.buyUrl}
            onChange={set("buyUrl")}
            className="w-full rounded-lg bg-white border border-black/10 px-4 py-2.5 text-black placeholder-black/30 focus:border-[#36A64F] focus:ring-1 focus:ring-[#36A64F] transition text-sm"
            placeholder="https://store.example.com/product"
          />
        </div>

        {/* SAMPLED FRAMES preview */}
        {sampledFrames.length > 0 && (
          <div>
            <p className="text-xs text-black/40 mb-2">
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
          {loading ? "🎬 AI Director is working …" : "🚀 Let AI Director Place Product"}
        </button>
      </div>

      {/* ── LIVE LOG PANEL ── */}
      {(loading || liveLogs.length > 0) && (
        <div className="bg-white/60 rounded-2xl p-5 border border-black/10 space-y-3">
          {/* Header with status + elapsed time */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {loading && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#36A64F] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#36A64F]" />
                </span>
              )}
              <p className="text-sm text-black/70">{progressMsg}</p>
            </div>
            <span className="text-sm font-['Space_Mono'] text-[#36A64F] tabular-nums">
              {Math.floor(elapsedSec / 60)}:{String(elapsedSec % 60).padStart(2, "0")}
            </span>
          </div>

          {/* Indeterminate progress bar while loading */}
          {loading && (
            <div className="w-full bg-black/10 rounded-full h-1.5 overflow-hidden">
              <div className="bg-[#36A64F] h-1.5 rounded-full animate-pulse" style={{ width: "100%" }} />
            </div>
          )}

          {/* Scrollable log list */}
          <div className="max-h-48 overflow-y-auto rounded-lg bg-black/5 border border-black/10 p-3 font-['Space_Mono'] text-xs space-y-0.5">
            {liveLogs.length === 0 && loading && (
              <p className="text-black/30 italic">Waiting for logs …</p>
            )}
            {liveLogs.map((line, i) => (
              <p
                key={i}
                className={
                  line.includes("✗") || line.includes("ERROR")
                    ? "text-[#FF6363]"
                    : line.includes("✓") || line.includes("🎉")
                    ? "text-[#36A64F]"
                    : line.includes("⚠")
                    ? "text-amber-600"
                    : "text-black/50"
                }
              >
                {line}
              </p>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}

      {/* ── ERROR ── */}
      {error && (
        <div className="bg-[#FF6363]/10 border border-[#FF6363]/30 rounded-xl p-4">
          <p className="text-[#FF6363] text-sm">{error}</p>
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
