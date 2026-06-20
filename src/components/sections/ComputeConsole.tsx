"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cpu,
  Play,
  Loader2,
  CheckCircle2,
  CircleDot,
  Clock,
  Hash,
  ArrowRight,
  Terminal,
  Image as ImageIcon,
  Sparkles,
  Gauge,
  Thermometer,
  SlidersHorizontal,
  History,
  ExternalLink,
  Receipt,
} from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  genAddress,
  genJobId,
  genTxHash,
  formatClock,
  mulberry32,
} from "@/lib/mock-data";
import { truncateAddress } from "@/lib/format";
import { BASE_EXPLORER } from "@/lib/wagmi";

type IconType = React.ComponentType<{ className?: string }>;

// ---------------------------------------------------------------------------
// Model catalog
// ---------------------------------------------------------------------------

type ModelKind = "text" | "image" | "voice" | "vision";

interface Model {
  id: string;
  name: string;
  kind: ModelKind;
  costPul: number; // $PULSAR per call (baseline)
  blurb: string;
}

const MODELS: Model[] = [
  { id: "llama70b", name: "Llama 3.1 70B", kind: "text", costPul: 0.5, blurb: "Open-weights chat, 128k context" },
  { id: "mistral-lg", name: "Mistral Large", kind: "text", costPul: 0.7, blurb: "Mistral AI flagship reasoning" },
  { id: "qwen72b", name: "Qwen 2.5 72B", kind: "text", costPul: 0.45, blurb: "Multilingual LLM, code-strong" },
  { id: "sdxl", name: "Stable Diffusion XL", kind: "image", costPul: 2.0, blurb: "1024×1024 photoreal diffusion" },
  { id: "whisper-v3", name: "Whisper Large v3", kind: "voice", costPul: 1.2, blurb: "Speech-to-text, 99 langs" },
  { id: "llava16", name: "LLaVA 1.6", kind: "vision", costPul: 0.9, blurb: "Vision-language reasoning" },
];

const PROMPT_PLACEHOLDERS: Record<ModelKind, string> = {
  text: "Describe what you want the model to generate — a tweet, a SQL query, a one-paragraph summary…",
  image: "Describe the image to generate, e.g. 'a neon pulsar over a dark ocean, cinematic, 35mm'",
  voice: "Paste the transcript you want synthesized back to speech, or describe the audio to transcribe.",
  vision: "Paste a URL to the image you want analyzed, and the question you want answered about it.",
};

const STAGES = ["Queued", "Routed to supplier", "Computing", "Settled"] as const;
type Stage = (typeof STAGES)[number];

// Pre-baked "AI output" tokens per model — typed to feel authentic.
const PRE_BAKED: Record<string, string> = {
  llama70b:
    "Across decentralized networks, compute is the new commodity. Pulsar routes your prompt to the lowest-cost verified GPU supplier, settles payment in $PULSAR on Base, and streams the response back to your wallet. Every job is a pulse of intelligence. Suppliers stake collateral, oracle verifies output, and a 1% protocol fee funds buyback-and-burn — making the token deflationary as usage scales.",
  "mistral-lg":
    "Reasoning: the prompt implies a comparison between centralized cloud GPU and decentralized compute. Step 1 — model loads onto supplier GPU. Step 2 — input is tokenized. Step 3 — autoregressive decoding produces ~50 tokens. Step 4 — output hash is committed on-chain. Step 5 — payment releases from escrow to supplier. The Pulsar protocol guarantees all five steps for every job.",
  qwen72b:
    "在你提交的提示词上，Pulsar 网络会执行以下流程：路由 → 验证 → 计算 → 结算。每个步骤在链上可验证。供应商通过质押 $PULSAR 加入网络，并根据其贡献的 TFLOPS 获得奖励。协议费 1% 用于回购与销毁，使 $PULSAR 随着网络使用量增长而变得稀缺。Every job is a verifiable pulse of compute.",
  sdxl:
    "Image generated: 'neon pulsar over a dark ocean, cinematic, 35mm'. Seed: 7Q3F9X · Steps: 30 · CFG: 7.5 · Sampler: DPM++ 2M Karras · Resolution: 1024×1024. Supplier: RTX 4090 cluster in EU-Central. Render time: 4.2s. Output CID pinned to IPFS, hash committed to Base.",
  "whisper-v3":
    "Transcription: 'The quick brown fox jumps over the lazy dog.' Detected language: English (98.7% confidence). Speaker count: 1. Avg WER: 2.1%. Audio length: 0:04. Supplier: A100 80GB in US-West. Compute time: 0.8s. Result hash committed on-chain; payment released in $PULSAR.",
  llava16:
    "Image analysis: the submitted image contains a starfield with a central violet pulsar, surrounded by an accretion disk in cyan. Detected objects: 'nebula', 'star', 'glow'. Confidence: 94.2%. Caption: 'A cosmic pulsar radiating violet and cyan energy against deep space.' Supplier: H100 80GB in Asia-Pacific. Vision encoder + LLM head, total 1.6s.",
};

// ---------------------------------------------------------------------------
// Job record
// ---------------------------------------------------------------------------

interface JobRecord {
  id: string;
  modelId: string;
  modelName: string;
  modelKind: ModelKind;
  prompt: string;
  costPul: number;
  supplier: `0x${string}`;
  txHash: `0x${string}`;
  gasEth: number;
  startedAt: number;
  settledAt: number;
}

const STAGE_MS = 800;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ParamSlider({
  icon: Icon,
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
  disabled,
}: {
  icon: IconType;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className={disabled ? "opacity-60" : ""}>
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Icon className="size-3.5" /> {label}
        </span>
        <span className="font-mono text-xs text-foreground">
          {value}
          <span className="text-muted-foreground">{suffix}</span>
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0])}
        disabled={disabled}
        className="[&_[data-slot=slider-range]]:bg-gradient-to-r [&_[data-slot=slider-range]]:from-pulsar-violet [&_[data-slot=slider-range]]:to-pulsar-cyan [&_[data-slot=slider-thumb]]:border-pulsar-violet"
      />
    </div>
  );
}

function PipelineStage({
  label,
  index,
  active,
  done,
}: {
  label: string;
  index: number;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2 text-center">
      <motion.div
        initial={false}
        animate={{
          scale: active ? 1.08 : 1,
          backgroundColor: done
            ? "rgba(52, 211, 153, 0.18)"
            : active
              ? "rgba(139, 92, 246, 0.20)"
              : "rgba(255,255,255,0.04)",
          borderColor: done
            ? "rgba(52, 211, 153, 0.55)"
            : active
              ? "rgba(139, 92, 246, 0.65)"
              : "rgba(255,255,255,0.10)",
        }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex size-10 items-center justify-center rounded-full border"
      >
        {active && (
          <motion.span
            className="absolute inset-0 rounded-full border border-pulsar-violet/60"
            animate={{ scale: [1, 1.6], opacity: [0.7, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        {done ? (
          <CheckCircle2 className="size-5 text-emerald-300" />
        ) : active ? (
          <Loader2 className="size-5 animate-spin text-pulsar" />
        ) : (
          <CircleDot className="size-5 text-muted-foreground" />
        )}
      </motion.div>
      <span
        className={`text-[10px] font-mono uppercase tracking-wider ${
          done ? "text-emerald-300" : active ? "text-pulsar" : "text-muted-foreground"
        }`}
      >
        {String(index + 1).padStart(2, "0")} · {label}
      </span>
    </div>
  );
}

function Connector({ active }: { active: boolean }) {
  return (
    <div className="relative mx-1 mt-5 hidden h-px flex-1 bg-white/10 sm:block">
      <motion.div
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-pulsar-violet to-pulsar-cyan"
        initial={false}
        animate={{ width: active ? "100%" : "0%" }}
        transition={{ duration: 0.4 }}
      />
    </div>
  );
}

function ReceiptChip({ job }: { job: JobRecord }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-2 text-xs">
      <div
        className={`flex size-7 shrink-0 items-center justify-center rounded-md ${
          job.modelKind === "image"
            ? "bg-pulsar-cyan/15 text-pulsar-cyan"
            : job.modelKind === "voice"
              ? "bg-amber-400/15 text-amber-300"
              : job.modelKind === "vision"
                ? "bg-pink-400/15 text-pink-300"
                : "bg-pulsar-violet/15 text-pulsar-violet"
        }`}
      >
        {job.modelKind === "image" ? (
          <ImageIcon className="size-3.5" />
        ) : job.modelKind === "voice" ? (
          <Sparkles className="size-3.5" />
        ) : job.modelKind === "vision" ? (
          <Cpu className="size-3.5" />
        ) : (
          <Terminal className="size-3.5" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-mono font-semibold text-foreground">{job.id}</span>
          <Badge className="border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0 text-[9px] text-emerald-300">
            settled
          </Badge>
        </div>
        <div className="truncate text-[10px] text-muted-foreground">{job.modelName}</div>
      </div>
      <div className="text-right">
        <div className="font-mono font-semibold text-pulsar-cyan">{job.costPul} PUL</div>
        <div className="text-[10px] text-muted-foreground">{formatClock(new Date(job.settledAt))}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ComputeConsole() {
  const { toast } = useToast();

  const [modelId, setModelId] = useState<string>("llama70b");
  const [prompt, setPrompt] = useState<string>("");
  const [maxTokens, setMaxTokens] = useState<number>(512);
  const [temperature, setTemperature] = useState<number>(0.7);
  const [topP, setTopP] = useState<number>(0.9);

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [stage, setStage] = useState<number>(-1); // -1 idle, 0..3 pipeline
  const [streamed, setStreamed] = useState<string>("");
  const [currentJob, setCurrentJob] = useState<JobRecord | null>(null);
  const [history, setHistory] = useState<JobRecord[]>([]);
  const [jobCounter, setJobCounter] = useState<number>(1);

  const streamTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stageTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const model = useMemo<Model>(
    () => MODELS.find((m) => m.id === modelId) ?? MODELS[0],
    [modelId]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamTimer.current) clearTimeout(streamTimer.current);
      stageTimers.current.forEach(clearTimeout);
    };
  }, []);

  const gasEth = 0.0001;
  const totalCost = model.costPul; // $PULSAR settled cost

  const runInference = useCallback(() => {
    if (isRunning) return;
    if (!prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Type a prompt before running inference.",
        variant: "destructive",
      });
      return;
    }
    setIsRunning(true);
    setStreamed("");
    setStage(0);

    const seed = Date.now() + jobCounter;
    const supplier = genAddress(mulberry32(seed));
    const txHash = genTxHash(mulberry32(seed + 1));
    const id = genJobId("PLSR");
    const startedAt = Date.now();

    const pendingJob: JobRecord = {
      id,
      modelId: model.id,
      modelName: model.name,
      modelKind: model.kind,
      prompt: prompt.slice(0, 240),
      costPul: model.costPul,
      supplier,
      txHash,
      gasEth,
      startedAt,
      settledAt: 0,
    };

    // Walk through stages
    stageTimers.current.forEach(clearTimeout);
    stageTimers.current = [];
    for (let i = 1; i <= 3; i++) {
      const t = setTimeout(() => setStage(i), i * STAGE_MS);
      stageTimers.current.push(t);
    }

    // Begin streaming output after stage 2 (Computing) starts
    streamTimer.current = setTimeout(() => {
      const fullText = PRE_BAKED[model.id] ?? "Output generated on the Pulsar network.";
      // For image / voice / vision, "stream" appears instantly with a label
      if (model.kind !== "text") {
        setStreamed(fullText);
      } else {
        const tokens = fullText.split(" ");
        let i = 0;
        const tick = () => {
          if (i >= tokens.length) return;
          setStreamed((prev) => (prev ? prev + " " : "") + tokens[i]);
          i++;
          streamTimer.current = setTimeout(tick, 38);
        };
        tick();
      }
    }, 2 * STAGE_MS);

    // Settle the job
    const settle = setTimeout(() => {
      const settledAt = Date.now();
      const settled: JobRecord = { ...pendingJob, settledAt };
      setCurrentJob(settled);
      setHistory((h) => [settled, ...h].slice(0, 5));
      setJobCounter((c) => c + 1);
      setIsRunning(false);
      setStage(-1);
      toast({
        title: "Job settled on-chain",
        description: `${id} · ${model.costPul} $PULSAR paid to ${truncateAddress(supplier)}`,
      });
    }, 4 * STAGE_MS + 600);
    stageTimers.current.push(settle);

  }, [isRunning, prompt, jobCounter, model, toast, gasEth]);

  const reset = useCallback(() => {
    setStreamed("");
    setCurrentJob(null);
    setStage(-1);
    setIsRunning(false);
    stageTimers.current.forEach(clearTimeout);
    if (streamTimer.current) clearTimeout(streamTimer.current);
  }, []);

  return (
    <section
      id="console"
      className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 md:py-32 lg:px-8"
    >
      <SectionHeading
        eyebrow="Compute Console"
        title="Pay $PULSAR, run AI inference"
        subtitle="A live preview of the consumer side of the Pulsar network."
      />

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto mt-6 max-w-3xl text-center text-sm leading-relaxed text-muted-foreground md:text-base"
      >
        This is a preview of the Pulsar compute console. In production, your prompt
        is routed to the lowest-cost supplier on the network, settled on-chain in
        $PULSAR, and the output streamed back to your wallet. Every job is a pulse
        of intelligence across the network.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mt-12 grid gap-6 lg:grid-cols-2"
      >
        {/* ---------------- CONSOLE (LEFT) ---------------- */}
        <div className="glass glass-hover rounded-2xl p-5 md:p-7">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-pulsar-violet/15 text-pulsar-violet ring-1 ring-pulsar-violet/30">
                <Terminal className="size-4.5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold">Inference Console</h3>
                <p className="text-[11px] text-muted-foreground">Configure a job and run it</p>
              </div>
            </div>
            <Badge className="border-pulsar-cyan/30 bg-pulsar-cyan/10 text-pulsar-cyan">
              <span className="size-1.5 rounded-full bg-pulsar-cyan" /> live preview
            </Badge>
          </div>

          {/* Model selector */}
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Model
          </label>
          <Select value={modelId} onValueChange={setModelId} disabled={isRunning}>
            <SelectTrigger className="h-10 w-full bg-white/5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODELS.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <div className="flex w-full items-center justify-between gap-3">
                    <span className="font-medium">{m.name}</span>
                    <span className="font-mono text-[11px] text-pulsar-cyan">
                      {m.costPul} PUL
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1.5 text-[11px] text-muted-foreground">{model.blurb}</p>

          {/* Prompt */}
          <label className="mb-1.5 mt-5 block text-xs font-medium text-muted-foreground">
            Prompt
          </label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={PROMPT_PLACEHOLDERS[model.kind]}
            disabled={isRunning}
            className="min-h-24 resize-y bg-white/5 font-mono text-[13px] leading-relaxed"
          />

          {/* Params */}
          <div className="mt-5 mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <SlidersHorizontal className="size-3.5" /> Inference parameters
          </div>
          <div className="grid gap-4 rounded-xl border border-white/8 bg-white/[0.02] p-4 sm:grid-cols-3">
            <ParamSlider
              icon={Hash}
              label="Max tokens"
              value={maxTokens}
              min={100}
              max={4000}
              step={50}
              suffix=""
              onChange={setMaxTokens}
              disabled={isRunning}
            />
            <ParamSlider
              icon={Thermometer}
              label="Temperature"
              value={temperature}
              min={0}
              max={2}
              step={0.05}
              suffix=""
              onChange={setTemperature}
              disabled={isRunning}
            />
            <ParamSlider
              icon={Gauge}
              label="Top-p"
              value={topP}
              min={0}
              max={1}
              step={0.05}
              suffix=""
              onChange={setTopP}
              disabled={isRunning}
            />
          </div>

          {/* Run button */}
          <Button
            type="button"
            onClick={runInference}
            disabled={isRunning}
            className="mt-5 h-12 w-full bg-gradient-to-r from-pulsar-violet to-pulsar-cyan animate-gradient text-base font-semibold text-white transition-transform hover:scale-[1.01] disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Running…
              </>
            ) : (
              <>
                <Play className="size-4" />
                Run inference
              </>
            )}
          </Button>

          {/* Cost breakdown */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2.5 text-[12px]">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Cpu className="size-3.5" />
              Base cost:
              <span className="font-mono font-semibold text-foreground">{model.costPul} $PULSAR</span>
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              Gas: <span className="font-mono font-semibold text-foreground">{gasEth} ETH</span>
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              Total:{" "}
              <span className="font-mono font-semibold text-pulsar-cyan">
                {totalCost} $PULSAR
              </span>
            </span>
          </div>
        </div>

        {/* ---------------- LIVE JOB MONITOR (RIGHT) ---------------- */}
        <div className="glass glass-hover flex flex-col rounded-2xl p-5 md:p-7">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-pulsar-cyan/15 text-pulsar-cyan ring-1 ring-pulsar-cyan/30">
                <ActivityDots />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold">Live Job Monitor</h3>
                <p className="text-[11px] text-muted-foreground">
                  Routing · compute · settlement
                </p>
              </div>
            </div>
            {currentJob && (
              <Button
                variant="ghost"
                size="sm"
                onClick={reset}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                Reset
              </Button>
            )}
          </div>

          {/* Pipeline */}
          <div className="flex items-start gap-1">
            {STAGES.map((s, i) => (
              <div key={s} className="flex flex-1 items-start">
                <PipelineStage
                  label={s}
                  index={i}
                  active={isRunning && stage === i}
                  done={stage > i || (!!currentJob && i <= 3)}
                />
                {i < STAGES.length - 1 && (
                  <Connector active={isRunning && stage > i} />
                )}
              </div>
            ))}
          </div>

          {/* Output area */}
          <div className="mt-6 min-h-[180px] flex-1 rounded-xl border border-white/8 bg-cosmos/60 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {model.kind === "image"
                  ? "Generated image"
                  : model.kind === "voice"
                    ? "Audio output"
                    : model.kind === "vision"
                      ? "Vision analysis"
                      : "Streaming output"}
              </span>
              {streamed && (
                <span className="font-mono text-[10px] text-emerald-300">
                  ● live
                </span>
              )}
            </div>

            {!streamed && !isRunning && (
              <div className="flex h-[140px] flex-col items-center justify-center text-center text-xs text-muted-foreground">
                <Terminal className="mb-2 size-5 opacity-40" />
                Run a job to see live streaming output
              </div>
            )}

            {!streamed && isRunning && (
              <div className="flex h-[140px] flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-5 animate-spin text-pulsar" />
                {stage < 2 ? "Routed to supplier, warming model…" : "Computing…"}
              </div>
            )}

            {streamed && model.kind === "image" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="relative h-[160px] overflow-hidden rounded-lg"
                style={{
                  background:
                    "linear-gradient(135deg, #7C3AED 0%, #22D3EE 50%, #06070F 100%)",
                }}
              >
                <div
                  className="absolute inset-0 opacity-50"
                  style={{
                    background:
                      "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent 40%), radial-gradient(circle at 70% 70%, rgba(124,58,237,0.5), transparent 50%)",
                  }}
                />
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-mono text-white/80">
                  <span>1024×1024 · seed 7Q3F9X</span>
                  <ImageIcon className="size-3.5" />
                </div>
              </motion.div>
            )}

            {streamed && model.kind !== "image" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="whitespace-pre-wrap font-mono text-[12.5px] leading-relaxed text-foreground/90"
              >
                {streamed}
                {isRunning && model.kind === "text" && (
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                    className="ml-0.5 inline-block size-2 bg-pulsar-cyan align-middle"
                  />
                )}
              </motion.div>
            )}
          </div>

          {/* Settlement receipt */}
          <AnimatePresence mode="wait">
            {currentJob && (
              <motion.div
                key={currentJob.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4 }}
                className="mt-4 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.04] p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                    <Receipt className="size-3.5" /> Settlement receipt
                  </span>
                  <CheckCircle2 className="size-4 text-emerald-300" />
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Job ID</dt>
                    <dd className="font-semibold text-foreground">{currentJob.id}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Supplier</dt>
                    <dd className="font-semibold text-foreground">
                      {truncateAddress(currentJob.supplier)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">$PULSAR paid</dt>
                    <dd className="font-semibold text-pulsar-cyan">
                      {currentJob.costPul}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Gas used</dt>
                    <dd className="font-semibold text-foreground">
                      {currentJob.gasEth} ETH
                    </dd>
                  </div>
                  <div className="col-span-2 flex justify-between">
                    <dt className="text-muted-foreground">Tx hash</dt>
                    <dd className="truncate font-semibold text-foreground">
                      {currentJob.txHash.slice(0, 18)}…
                    </dd>
                  </div>
                  <div className="col-span-2 flex justify-between">
                    <dt className="text-muted-foreground">Settled at</dt>
                    <dd className="font-semibold text-foreground">
                      {formatClock(new Date(currentJob.settledAt))}
                    </dd>
                  </div>
                </dl>
                <a
                  href={`${BASE_EXPLORER}/tx/${currentJob.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-pulsar-cyan hover:underline"
                >
                  View on Basescan
                  <ExternalLink className="size-3" />
                </a>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ---------------- JOB HISTORY ---------------- */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mt-6 glass rounded-2xl p-5 md:p-7"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="size-4.5 text-pulsar-violet" />
            <h3 className="font-display text-lg font-bold">Job history</h3>
            <span className="text-xs text-muted-foreground">last 5 jobs</span>
          </div>
          <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
            <Clock className="mr-1 inline size-3" />
            {history.length} settled
          </span>
        </div>

        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-xs text-muted-foreground">
            <Terminal className="size-5 opacity-40" />
            No jobs yet — run your first inference above.
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence initial={false}>
              {history.map((job) => (
                <motion.div
                  key={job.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                >
                  <ReceiptChip job={job} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        <div className="mt-4 flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground">
          <ArrowRight className="size-3" />
          All jobs settle on Base L2 — final in ~2 seconds.
        </div>
      </motion.div>
    </section>
  );
}

// Small inline icon-like component for the monitor header (kept local to avoid
// adding more lucide imports) — three pulsing dots to suggest activity.
function ActivityDots() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-pulsar-cyan"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}
