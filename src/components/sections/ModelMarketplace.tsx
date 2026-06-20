"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Cpu,
  Image as ImageIcon,
  Mic,
  Eye,
  Code2,
  Boxes,
  Loader2,
  Play,
  Star,
  TrendingUp,
  Sparkles,
  ExternalLink,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { SectionHeading } from "@/components/SectionHeading";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatCompact, formatFull, truncateAddress } from "@/lib/format";
import { genAddress, genTxHash, mulberry32 } from "@/lib/mock-data";
import { BASE_EXPLORER } from "@/lib/wagmi";

// --- Types & constants ------------------------------------------------------

type Category = "Text" | "Image" | "Voice" | "Vision" | "Code" | "Embeddings";

const CATEGORY_ICON: Record<Category, typeof Cpu> = {
  Text: Cpu,
  Image: ImageIcon,
  Voice: Mic,
  Vision: Eye,
  Code: Code2,
  Embeddings: Boxes,
};

const CATEGORY_COLOR: Record<Category, string> = {
  Text: "#8B5CF6",
  Image: "#F472B6",
  Voice: "#FBBF24",
  Vision: "#22D3EE",
  Code: "#34D399",
  Embeddings: "#94A3B8",
};

const CATEGORIES: ("All" | Category)[] = [
  "All",
  "Text",
  "Image",
  "Voice",
  "Vision",
  "Code",
  "Embeddings",
];

interface Model {
  id: string;
  name: string;
  category: Category;
  provider: string;
  pulsarPerCall: number;
  latencyMs: number;
  contextOrRes: string; // e.g. "128K ctx" or "1024×1024"
  rating: number;
  weeklyCalls: number;
  weeklyEarned: number;
  prompt: string;
}

const MODELS: Model[] = [
  {
    id: "llama-3.1-70b",
    name: "Llama 3.1 70B",
    category: "Text",
    provider: "Meta",
    pulsarPerCall: 4.2,
    latencyMs: 820,
    contextOrRes: "128K ctx",
    rating: 4.7,
    weeklyCalls: 184_320,
    weeklyEarned: 774_144,
    prompt: "Explain how a decentralized AI compute network settles payments in real time.",
  },
  {
    id: "mistral-large-2",
    name: "Mistral Large 2",
    category: "Text",
    provider: "Mistral AI",
    pulsarPerCall: 5.8,
    latencyMs: 740,
    contextOrRes: "128K ctx",
    rating: 4.6,
    weeklyCalls: 142_180,
    weeklyEarned: 824_644,
    prompt: "Draft a 3-paragraph product brief for a deflationary utility token on Base.",
  },
  {
    id: "qwen-2.5-72b",
    name: "Qwen 2.5 72B",
    category: "Text",
    provider: "Alibaba",
    pulsarPerCall: 3.9,
    latencyMs: 910,
    contextOrRes: "128K ctx",
    rating: 4.5,
    weeklyCalls: 98_740,
    weeklyEarned: 385_086,
    prompt: "Summarize the security trade-offs between on-chain settlement and off-chain compute.",
  },
  {
    id: "deepseek-coder-v2",
    name: "DeepSeek Coder V2",
    category: "Code",
    provider: "DeepSeek",
    pulsarPerCall: 6.4,
    latencyMs: 1100,
    contextOrRes: "128K ctx",
    rating: 4.8,
    weeklyCalls: 76_420,
    weeklyEarned: 489_088,
    prompt: "Write a Solidity function that burns tokens and emits an event with the caller's address.",
  },
  {
    id: "starcoder-2",
    name: "StarCoder 2",
    category: "Code",
    provider: "BigCode",
    pulsarPerCall: 2.1,
    latencyMs: 540,
    contextOrRes: "16K ctx",
    rating: 4.3,
    weeklyCalls: 64_180,
    weeklyEarned: 134_778,
    prompt: "Generate a TypeScript snippet to read a staking contract's earned rewards via wagmi.",
  },
  {
    id: "sdxl",
    name: "Stable Diffusion XL",
    category: "Image",
    provider: "Stability AI",
    pulsarPerCall: 12.0,
    latencyMs: 2400,
    contextOrRes: "1024×1024",
    rating: 4.5,
    weeklyCalls: 38_900,
    weeklyEarned: 466_800,
    prompt: "A neon-lit cosmic nebula with a pulsar at its center, deep violet and cyan, ultra-detailed.",
  },
  {
    id: "flux-schnell",
    name: "FLUX.1 [schnell]",
    category: "Image",
    provider: "Black Forest Labs",
    pulsarPerCall: 9.5,
    latencyMs: 1800,
    contextOrRes: "1024×1024",
    rating: 4.8,
    weeklyCalls: 51_240,
    weeklyEarned: 486_780,
    prompt: "An abstract data stream flowing through a crystalline lattice, sharp focus, digital art.",
  },
  {
    id: "whisper-v3",
    name: "Whisper Large v3",
    category: "Voice",
    provider: "OpenAI (open weights)",
    pulsarPerCall: 2.8,
    latencyMs: 1300,
    contextOrRes: "30s audio",
    rating: 4.7,
    weeklyCalls: 89_400,
    weeklyEarned: 250_320,
    prompt: "Transcribe and translate to English a 15-second Spanish voice memo about blockchain.",
  },
  {
    id: "bark",
    name: "Bark",
    category: "Voice",
    provider: "Suno",
    pulsarPerCall: 7.2,
    latencyMs: 2100,
    contextOrRes: "14s audio",
    rating: 4.2,
    weeklyCalls: 22_860,
    weeklyEarned: 164_592,
    prompt: "Generate a calm narrator voice saying: 'Welcome to the Pulsar compute network.'",
  },
  {
    id: "llava-1.6-34b",
    name: "LLaVA 1.6 34B",
    category: "Vision",
    provider: "LLaVA Team",
    pulsarPerCall: 5.4,
    latencyMs: 1500,
    contextOrRes: "Image + 32K ctx",
    rating: 4.4,
    weeklyCalls: 31_280,
    weeklyEarned: 168_912,
    prompt: "Describe this image of a glowing purple orb surrounded by orbiting particles in detail.",
  },
  {
    id: "qwen-vl-max",
    name: "Qwen-VL Max",
    category: "Vision",
    provider: "Alibaba",
    pulsarPerCall: 6.0,
    latencyMs: 1650,
    contextOrRes: "Image + 32K ctx",
    rating: 4.6,
    weeklyCalls: 28_940,
    weeklyEarned: 173_640,
    prompt: "Identify the brand colors in this logo and suggest complementary accent hues.",
  },
  {
    id: "bge-embeddings",
    name: "BGE Embeddings",
    category: "Embeddings",
    provider: "BAAI",
    pulsarPerCall: 0.4,
    latencyMs: 220,
    contextOrRes: "8K ctx · 1024 dim",
    rating: 4.5,
    weeklyCalls: 412_800,
    weeklyEarned: 165_120,
    prompt: "Encode this sentence into a vector: 'Decentralized compute settles trustlessly.'",
  },
];

// Pre-baked outputs per category (deterministic)
function bakeOutput(m: Model): { text?: string; image?: boolean; voice?: boolean; embedding?: number[] } {
  if (m.category === "Image") return { image: true };
  if (m.category === "Voice") return { voice: true };
  if (m.category === "Embeddings") {
    const rng = mulberry32(m.id.length * 17);
    return { embedding: Array.from({ length: 8 }, () => Math.round((rng() - 0.5) * 1000) / 1000) };
  }
  // Text / Code / Vision → 3-sentence response
  const responses: Record<string, string> = {
    "llama-3.1-70b":
      "A decentralized AI compute network settles payments by routing inference requests through a peer-to-peer supplier graph, where each job carries a cryptographic commitment. When the consumer signs the request, the protocol locks the agreed $PULSAR fee in a non-custodial escrow that the supplier can claim only after producing a verifiable output. Settlement finality happens on Base within seconds, with the supplier's stake slashed if the result fails validation — making every payment trustless and auditable on-chain.",
    "mistral-large-2":
      "PULSAR is a deflationary utility token on Base that powers a decentralized compute marketplace for open-weight AI models. Its fixed 1B supply is reduced through quarterly buyback-and-burn events funded by protocol fees, creating sustained scarcity as usage grows. The product brief should emphasize transparency (on-chain vesting, locked liquidity), real revenue (compute jobs settled in $PULSAR), and a clear roadmap from DEX launch to a full model marketplace.",
    "qwen-2.5-72b":
      "On-chain settlement guarantees trustless, auditable payments but adds gas and finality latency to every job. Off-chain compute is dramatically faster and cheaper but requires staking or reputation collateral to deter malicious suppliers. The strongest design hybridizes both: off-chain execution with on-chain escrow and slashing, giving developers speed without sacrificing verifiability.",
    "deepseek-coder-v2":
      "function burnFrom(uint256 amount) external {\n    require(msg.sender == treasury, 'only treasury');\n    require(amount <= balances[msg.sender], 'insufficient');\n    balances[msg.sender] -= amount;\n    totalSupply -= amount;\n    emit Burn(msg.sender, amount);\n}\n\nevent Burn(address indexed burner, uint256 amount);",
    "starcoder-2":
      "import { useReadContract } from 'wagmi';\nimport { stakingAbi, PULSAR } from '@/lib/contracts';\n\nexport function useEarned(addr) {\n  return useReadContract({\n    address: PULSAR.staking,\n    abi: stakingAbi,\n    functionName: 'earned',\n    args: [addr],\n  });\n}",
    "llava-1.6-34b":
      "The image shows a radiant violet orb centered against a deep cosmic background, with a halo of cyan particles orbiting in concentric rings. Bright streaks of light appear to emit from the orb's poles, suggesting energy jets, while smaller glowing nodes drift along the orbital paths. The overall composition evokes a pulsar or neutron star — a dense, high-energy core broadcasting signals across space.",
    "qwen-vl-max":
      "The logo's primary brand color is a vivid violet (#8B5CF6) paired with a cyan accent (#22D3EE) on a near-black backdrop. Complementary accent hues that would expand the palette include a warm amber (#FBBF24) for calls-to-action, a soft pink (#F472B6) for tertiary highlights, and a green (#34D399) for success states. These additions preserve the cosmic feel while improving contrast and accessibility for UI elements.",
  };
  return { text: responses[m.id] ?? "Generated response." };
}

// --- Featured provider (rotates weekly — deterministic by ISO week) --------

const PROVIDERS = [
  {
    name: "Meta",
    models: 2,
    jobsServed: 283_000,
    rating: 4.7,
    color: "#8B5CF6",
    blurb: "Open-weight frontier LLMs powering the largest share of Pulsar text jobs.",
  },
  {
    name: "Stability AI",
    models: 1,
    jobsServed: 38_900,
    rating: 4.5,
    color: "#F472B6",
    blurb: "Best-in-class open image generation models for creators.",
  },
  {
    name: "Black Forest Labs",
    models: 1,
    jobsServed: 51_240,
    rating: 4.8,
    color: "#FBBF24",
    blurb: "FLUX.1 sets the state-of-the-art for fast, high-fidelity image synthesis.",
  },
];

function featuredProvider() {
  // pick based on ISO week so it actually rotates
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const week = Math.floor(((now.getTime() - start.getTime()) / MS_PER_DAY + start.getDay() + 1) / 7);
  return PROVIDERS[week % PROVIDERS.length]!;
}

const MS_PER_DAY = 86400000;

// --- Model card -------------------------------------------------------------

function ModelCard({ model, onTry }: { model: Model; onTry: (m: Model) => void }) {
  const Icon = CATEGORY_ICON[model.category];
  const color = CATEGORY_COLOR[model.category];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
    >
      <Card className="glass glass-hover group relative h-full overflow-hidden p-5">
        <div
          className="absolute -right-10 -top-10 size-24 rounded-full opacity-30 blur-3xl transition-opacity group-hover:opacity-50"
          style={{ background: color }}
        />
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div
              className="flex size-10 items-center justify-center rounded-xl"
              style={{ background: `${color}22`, color }}
            >
              <Icon className="size-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold leading-tight text-foreground">
                {model.name}
              </h3>
              <p className="text-xs text-muted-foreground">{model.provider}</p>
            </div>
          </div>
          <Badge
            className="shrink-0 border-white/10"
            style={{
              background: `${color}15`,
              color,
              borderColor: `${color}33`,
            }}
          >
            {model.category}
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Cost</div>
            <div className="mt-0.5 font-mono text-sm font-bold" style={{ color }}>
              {model.pulsarPerCall}
            </div>
            <div className="text-[9px] text-muted-foreground">PULSAR/call</div>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Latency</div>
            <div className="mt-0.5 font-mono text-sm font-bold text-foreground">
              {(model.latencyMs / 1000).toFixed(2)}s
            </div>
            <div className="text-[9px] text-muted-foreground">{model.latencyMs}ms</div>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Specs</div>
            <div className="mt-0.5 font-mono text-xs font-bold text-foreground">
              {model.contextOrRes}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Star className="size-3.5 text-amber-400" />
            <span className="font-mono text-foreground">{model.rating}</span>
            <span>·</span>
            <span>{formatCompact(model.weeklyCalls)} calls/wk</span>
          </div>
          <Button
            onClick={() => onTry(model)}
            size="sm"
            className="bg-gradient-to-r from-pulsar-violet to-pulsar-cyan text-white shadow-md shadow-pulsar-violet/20 hover:shadow-pulsar-violet/40"
          >
            <Play className="size-3.5" />
            Try sample
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

// --- Try-sample Dialog ------------------------------------------------------

function OutputRenderer({ model }: { model: Model }) {
  const out = bakeOutput(model);

  if (out.image) {
    return (
      <div className="space-y-2">
        <div
          className="relative aspect-square w-full overflow-hidden rounded-xl border border-white/10"
          style={{
            background:
              "linear-gradient(135deg, #7C3AED 0%, #8B5CF6 30%, #22D3EE 70%, #34D399 100%)",
          }}
        >
          <div className="absolute inset-0 opacity-40 mix-blend-overlay" style={{ background: "radial-gradient(circle at 30% 30%, white 0%, transparent 50%)" }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-lg font-bold text-white/90 drop-shadow-lg">
              Generated by {model.name}
            </span>
          </div>
          <div className="absolute bottom-2 left-2 rounded bg-cosmos/60 px-2 py-0.5 font-mono text-[10px] text-white/80 backdrop-blur-sm">
            1024 × 1024 · 4 steps
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Prompt: &ldquo;{model.prompt}&rdquo;</p>
      </div>
    );
  }

  if (out.voice) {
    // stylized waveform
    const bars = Array.from({ length: 48 }, (_, i) => {
      const rng = mulberry32(i + model.id.length);
      return 0.15 + rng() * 0.85;
    });
    return (
      <div className="space-y-2">
        <div className="flex h-24 items-center gap-0.5 rounded-xl border border-white/10 bg-cosmos/40 p-4">
          {bars.map((h, i) => (
            <motion.div
              key={i}
              className="flex-1 rounded-full bg-gradient-to-t from-pulsar-violet to-pulsar-cyan"
              initial={{ height: 0 }}
              animate={{ height: `${h * 100}%` }}
              transition={{ duration: 0.4, delay: i * 0.015, ease: "easeOut" }}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Generated audio: &ldquo;{model.prompt}&rdquo;</p>
      </div>
    );
  }

  if (out.embedding) {
    return (
      <div className="space-y-2">
        <div className="rounded-xl border border-white/10 bg-cosmos/40 p-4">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            1024-dim embedding (first 8 dims)
          </div>
          <div className="flex flex-wrap gap-1.5">
            {out.embedding.map((v, i) => (
              <span
                key={i}
                className="rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-xs text-pulsar-cyan"
              >
                {v.toFixed(3)}
              </span>
            ))}
            <span className="rounded border border-dashed border-white/10 px-2 py-1 font-mono text-xs text-muted-foreground">
              … + 1016 more
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Encoded: &ldquo;{model.prompt}&rdquo;</p>
      </div>
    );
  }

  // text / code / vision → textual output
  return (
    <div className="space-y-2">
      <pre className="whitespace-pre-wrap rounded-xl border border-white/10 bg-cosmos/40 p-4 font-mono text-sm leading-relaxed text-foreground">
        {out.text}
      </pre>
      <p className="text-xs text-muted-foreground">Prompt: &ldquo;{model.prompt}&rdquo;</p>
    </div>
  );
}

function TryDialog({ model, open, onOpenChange }: {
  model: Model | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { toast } = useToast();
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [receipt, setReceipt] = useState<{
    supplier: `0x${string}`;
    txHash: `0x${string}`;
  } | null>(null);

  const run = () => {
    if (!model) return;
    setPhase("running");
    setReceipt(null);
    setTimeout(() => {
      const rng = mulberry32(Date.now() & 0xffff);
      setReceipt({
        supplier: genAddress(rng),
        txHash: genTxHash(rng),
      });
      setPhase("done");
      toast({
        title: "Inference complete",
        description: `${model.name} · ${model.pulsarPerCall} $PULSAR settled on Base.`,
      });
    }, 1500);
  };

  // reset on close
  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setPhase("idle");
      setReceipt(null);
    }
    onOpenChange(v);
  };

  if (!model) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-cosmos/95 backdrop-blur-xl sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div
              className="flex size-9 items-center justify-center rounded-xl"
              style={{ background: `${CATEGORY_COLOR[model.category]}22`, color: CATEGORY_COLOR[model.category] }}
            >
              {(() => {
                const Icon = CATEGORY_ICON[model.category];
                return <Icon className="size-5" />;
              })()}
            </div>
            <div>
              <DialogTitle className="font-display text-xl font-bold">{model.name}</DialogTitle>
              <DialogDescription>{model.provider} · {model.category} model</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Pre-baked prompt */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Sample prompt
          </div>
          <p className="text-sm text-foreground">{model.prompt}</p>
        </div>

        {/* Run / output */}
        {phase === "idle" && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 bg-cosmos/40 p-8 text-center">
            <Zap className="size-6 text-pulsar-cyan" />
            <p className="text-sm text-muted-foreground">
              Run this sample to simulate a real inference job settled in $PULSAR.
            </p>
            <Button
              onClick={run}
              className="bg-gradient-to-r from-pulsar-violet via-pulsar to-pulsar-cyan text-white shadow-lg shadow-pulsar-violet/20 hover:shadow-pulsar-violet/40"
            >
              <Play className="size-4" />
              Run inference · {model.pulsarPerCall} $PULSAR
            </Button>
          </div>
        )}

        {phase === "running" && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-white/10 bg-cosmos/40 p-8">
            <Loader2 className="size-7 animate-spin text-pulsar-cyan" />
            <p className="text-sm text-muted-foreground">
              Routing to supplier · running {model.name}…
            </p>
            <div className="w-full max-w-xs">
              <div className="mb-1 flex justify-between font-mono text-[10px] text-muted-foreground">
                <span>job dispatched</span>
                <span>settling…</span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
                <motion.div
                  className="h-full bg-gradient-to-r from-pulsar-violet to-pulsar-cyan"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                />
              </div>
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="space-y-3">
            <OutputRenderer model={model} />
            {receipt && (
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="size-3.5 text-emerald-300" />
                  <span className="text-xs font-semibold text-emerald-300">Settlement receipt</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">$PULSAR cost</span>
                    <span className="font-mono font-semibold text-foreground">
                      {model.pulsarPerCall} PULSAR
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Supplier</span>
                    <span className="font-mono text-foreground">{truncateAddress(receipt.supplier)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Latency</span>
                    <span className="font-mono text-foreground">{model.latencyMs} ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tx hash</span>
                    <Link
                      href={`${BASE_EXPLORER}/tx/${receipt.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-pulsar-cyan hover:underline"
                    >
                      {truncateAddress(receipt.txHash)}
                      <ExternalLink className="size-3" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="border-white/10 bg-white/5 text-foreground hover:border-pulsar-cyan/40 hover:bg-pulsar-cyan/[0.05]"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Right sidebar ----------------------------------------------------------

function FeaturedProvider() {
  const p = useMemo(() => featuredProvider(), []);
  return (
    <Card className="glass glass-hover relative overflow-hidden p-5">
      <div
        className="absolute -right-8 -top-8 size-28 rounded-full opacity-25 blur-3xl"
        style={{ background: p.color }}
      />
      <div className="flex items-center justify-between">
        <Badge className="border-pulsar-cyan/30 bg-pulsar-cyan/10 text-pulsar-cyan">
          <Star className="size-3" /> Featured this week
        </Badge>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <div
          className="flex size-12 items-center justify-center rounded-2xl text-lg font-bold"
          style={{ background: `${p.color}22`, color: p.color }}
        >
          {p.name[0]}
        </div>
        <div>
          <h3 className="font-display text-lg font-bold">{p.name}</h3>
          <p className="text-xs text-muted-foreground">{p.models} model{p.models !== 1 ? "s" : ""} on Pulsar</p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.blurb}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Jobs served</div>
          <div className="mt-0.5 font-mono text-sm font-bold text-foreground">
            {formatFull(p.jobsServed)}
          </div>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Avg rating</div>
          <div className="mt-0.5 font-mono text-sm font-bold text-foreground">
            ★ {p.rating.toFixed(1)}
          </div>
        </div>
      </div>
    </Card>
  );
}

function TopModelsLeaderboard() {
  const top = useMemo(
    () => [...MODELS].sort((a, b) => b.weeklyEarned - a.weeklyEarned).slice(0, 5),
    []
  );
  const max = top[0]?.weeklyEarned ?? 1;

  return (
    <Card className="glass p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-bold">Top models this week</h3>
          <p className="text-xs text-muted-foreground">By $PULSAR earned</p>
        </div>
        <TrendingUp className="size-4 text-emerald-400" />
      </div>
      <ol className="space-y-3">
        {top.map((m, i) => {
          const color = CATEGORY_COLOR[m.category];
          return (
            <li key={m.id} className="flex items-center gap-3">
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-md font-mono text-xs font-bold ${
                  i === 0
                    ? "bg-amber-400/20 text-amber-300"
                    : i === 1
                    ? "bg-white/10 text-foreground"
                    : i === 2
                    ? "bg-orange-400/20 text-orange-300"
                    : "bg-white/5 text-muted-foreground"
                }`}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-foreground">{m.name}</span>
                  <span className="shrink-0 font-mono text-xs text-pulsar-cyan">
                    {formatCompact(m.weeklyEarned)}
                  </span>
                </div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/5">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: color }}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(m.weeklyEarned / max) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

// --- Main section -----------------------------------------------------------

export function ModelMarketplace() {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<"All" | Category>("All");
  const [openModel, setOpenModel] = useState<Model | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MODELS.filter((m) => {
      if (cat !== "All" && m.category !== cat) return false;
      if (q && !m.name.toLowerCase().includes(q) && !m.provider.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, cat]);

  const onTry = (m: Model) => {
    setOpenModel(m);
    setOpen(true);
  };

  return (
    <section
      id="marketplace"
      className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 md:py-32 lg:px-8"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <SectionHeading
          eyebrow="Model Marketplace"
          title="Run any open AI model — pay in $PULSAR"
          subtitle="The Pulsar model marketplace aggregates the best open-weight AI models — all payable in $PULSAR, all running on decentralized suppliers. Browse, compare, and run with one click. Below is a preview of the marketplace — try any model for free (simulated)."
        />

        {/* Search + filters */}
        <div className="mt-12 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search models or providers…"
              className="border-white/10 bg-white/[0.03] pl-9 text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const active = cat === c;
              const color = c === "All" ? "#8B5CF6" : CATEGORY_COLOR[c];
              return (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                    active
                      ? "text-white"
                      : "border-white/10 bg-white/[0.02] text-muted-foreground hover:border-white/20 hover:text-foreground"
                  }`}
                  style={active ? { background: `${color}25`, borderColor: `${color}55`, color } : undefined}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid + sidebar */}
        <div className="mt-8 grid gap-6 lg:grid-cols-4">
          <div className="lg:col-span-3">
            {filtered.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((m) => (
                  <ModelCard key={m.id} model={m} onTry={onTry} />
                ))}
              </div>
            ) : (
              <Card className="glass p-10 text-center">
                <p className="text-sm text-muted-foreground">
                  No models match your search. Try a different query or category.
                </p>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <FeaturedProvider />
            <TopModelsLeaderboard />
          </div>
        </div>

        {/* Footer note */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-pulsar-violet/20 bg-gradient-to-br from-pulsar-violet/[0.06] via-transparent to-pulsar-cyan/[0.06] p-5 md:flex-row md:items-center md:p-6"
        >
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pulsar-violet/20 to-pulsar-cyan/20">
              <Boxes className="size-5 text-pulsar-cyan" />
            </div>
            <div>
              <h4 className="font-display text-base font-bold">Open to all model providers</h4>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                Any supplier can list an open-weight model on Pulsar. Pricing is set per-call in
                $PULSAR, with the protocol fee split between treasury, liquidity, and burn.
              </p>
            </div>
          </div>
          <Badge className="shrink-0 border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
            <span className="mr-1 inline-block size-1.5 animate-pulse rounded-full bg-emerald-400" />
            {MODELS.length} models · {new Set(MODELS.map((m) => m.provider)).size} providers
          </Badge>
        </motion.div>
      </motion.div>

      <TryDialog model={openModel} open={open} onOpenChange={setOpen} />
    </section>
  );
}
