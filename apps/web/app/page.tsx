"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useAnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { PublicKey } from "@solana/web3.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WalletButton } from "./WalletButton";
import * as z from "zod";
import * as anchor from "@coral-xyz/anchor";
import idl from "../anchor/ai_payment_vault.json";


const formSchema = z.object({
  prompt: z
    .string()
    .min(10, "Minimum 10 characters")
    .max(500, "Maximum 500 characters"),
});



type FormValues = z.infer<typeof formSchema>;

type HistoryItem = {
  id: number;
  promptText: string;
  aiResponse: string;
  txSignature: string;
  createdAt: string;
};
const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");


export default function Home() {
  const [aiAnswer, setAiAnswer] = useState("");
  const [submittedPrompt, setSubmittedPrompt] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isHistoryClearing, setIsHistoryClearing] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [isPaymentMethodOpen, setIsPaymentMethodOpen] = useState(false);
  const { connected, publicKey } = useWallet();
  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();

const program = useMemo(() => {
  if (!anchorWallet || !connection) return null;

  const provider = new anchor.AnchorProvider(
    connection,
    anchorWallet,
    { commitment: "confirmed" }
  );

  return new anchor.Program(idl as anchor.Idl, provider);
}, [anchorWallet, connection]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      prompt: "",
    },
    resolver: zodResolver(formSchema),
    mode: "onSubmit",
  });
  const promptLength = watch("prompt", "").length;

  const submitPromptRecord = async (
    values: FormValues,
    signature: string,
    payerPublicKey: PublicKey
  ) => {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: values.prompt,
        txSignature: signature,
        payerPublicKey: payerPublicKey.toString(),
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to save prompt to database");
    }

    const dbResult = (await response.json()) as { record?: HistoryItem };
    const latestPrompt = dbResult.record?.promptText ?? values.prompt;
    const latestAnswer = dbResult.record?.aiResponse ?? "No AI answer was returned.";

    setSubmittedPrompt(latestPrompt);
    setAiAnswer(latestAnswer);

    if (dbResult.record) {
      setHistory((prev) => [
        dbResult.record as HistoryItem,
        ...prev.filter((item) => item.id !== dbResult.record?.id),
      ]);
    }
  };

  const onChoosePaymentMethod = () => {
    setIsPaymentMethodOpen(true);
  };

  const loadHistory = useCallback(async (wallet: PublicKey) => {
    setIsHistoryLoading(true);
    setHistoryError("");

    try {
      const response = await fetch(
        `/api/history?wallet=${encodeURIComponent(wallet.toString())}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load history");
      }

      const data = (await response.json()) as { history?: HistoryItem[] };
      setHistory(data.history ?? []);
    } catch (error) {
      console.error("Failed to load history:", error);
      setHistoryError("Unable to load your history right now.");
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!connected || !publicKey) {
      setHistory([]);
      setHistoryError("");
      return;
    }

    void loadHistory(publicKey);
  }, [connected, loadHistory, publicKey]);

  const formatHistoryDate = (dateValue: string) => {
    const parsedDate = new Date(dateValue);

    if (Number.isNaN(parsedDate.getTime())) {
      return dateValue;
    }

    return parsedDate.toLocaleString();
  };

  const clearHistory = useCallback(async (wallet: PublicKey) => {
    const shouldClear = window.confirm(
      "Clear your full prompt history for this wallet? This action cannot be undone."
    );

    if (!shouldClear) {
      return;
    }

    setIsHistoryClearing(true);
    setHistoryError("");

    try {
      const response = await fetch(
        `/api/history?wallet=${encodeURIComponent(wallet.toString())}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to clear history");
      }

      setHistory([]);
      setSubmittedPrompt("");
      setAiAnswer("");
    } catch (error) {
      console.error("Failed to clear history:", error);
      setHistoryError("Unable to clear your history right now.");
    } finally {
      setIsHistoryClearing(false);
    }
  }, []);

  const onUsdcSelect = async (values: FormValues) => {
    if (!connected || !publicKey) {
      alert("Please connect your wallet first.");
      return;
    }
    try{
      if(!program){
        throw new Error("Program not initialized");
      } 
      
       const tx = await program.methods
      .payForPromptUsdc(new anchor.BN(1_000_000)) // 1 USDC
      .accounts({
        user: publicKey,
        mint: USDC_MINT,
      })
      .rpc();
      await connection.confirmTransaction(tx, "confirmed");

    await submitPromptRecord(values, tx, publicKey);

    console.log("✅ USDC payment confirmed on-chain:", tx);
  } catch (error) {
    console.error("USDC payment failed:", error);
    alert("Transaction failed. Please try again.");
  }    
  };

  const onSolSelect = async (values: FormValues) => {
    if (!connected || !publicKey) {
      alert("Please connect your wallet first.");
      return;
    }
    try {
      if(!program){
        throw new Error("Program not initialized");
      }

    const tx = await program.methods
      .payForPrompt(new anchor.BN(20_000_000)) // 0.02 SOL
      .accounts({
        user: publicKey,
      })
      .rpc();
    await connection.confirmTransaction(tx, "confirmed");

    await submitPromptRecord(values, tx, publicKey);
  console.log("✅ SOL payment confirmed on-chain:", tx);

  } 
  catch (error) {
    console.error("SOL payment failed:", error);
    alert("Transaction failed. Please try again.");
  } 
 };



useEffect(() => {
  if (!program) return;

  const listener = program.addEventListener("paymentMade", (event) => {
    console.log("Payment confirmed on-chain!", event);
    // You can trigger Framer Motion toast / confetti / success state here
  });

  return () => {
    program.removeEventListener(listener);
  };
}, [program]);


  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] px-4 py-6 text-zinc-100 sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.1),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-size-[34px_34px] opacity-50" />

      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-6 sm:gap-8">
        <header className="animate-in fade-in slide-in-from-top-3 duration-700 flex flex-col gap-4 rounded-3xl border border-white/15 bg-black/75 p-4 shadow-[0_24px_70px_-42px_rgba(0,0,0,0.85)] backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="w-fit rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-zinc-400">
              Blockchain AI Buddy
            </p>
            <h1 className="mt-3 font-heading text-3xl leading-tight text-white sm:text-4xl">
              Blockchain AI Buddy
            </h1>
            <p className="mt-2 max-w-xl text-sm text-zinc-300 sm:text-base">
              Pay on-chain and generate instantly. Minimal flow, provable spend,
              clean output.
            </p>
          </div>

          <div className="self-start sm:self-auto">
            <WalletButton />
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="animate-in fade-in slide-in-from-left-6 duration-700 delay-100 rounded-3xl border border-white/12 bg-black/70 p-6 shadow-[0_20px_50px_-35px_rgba(0,0,0,0.9)] backdrop-blur-md">
            <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">
              Payment Rates
            </p>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-black/55 p-4">
                <p className="text-xs uppercase tracking-widest text-zinc-400">
                  SOL Payment
                </p>
                <p className="mt-1 font-heading text-3xl text-white">0.02 SOL</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/55 p-4">
                <p className="text-xs uppercase tracking-widest text-zinc-400">
                  USDC Payment
                </p>
                <p className="mt-1 font-heading text-3xl text-white">1 USDC</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/55 p-4">
              <p className="font-medium text-zinc-100">Prompt rules</p>
              <ul className="mt-2 space-y-1 text-sm text-zinc-400">
                <li>Minimum 10 characters</li>
                <li>Maximum 500 characters</li>
              </ul>
            </div>
          </article>

          <article className="animate-in fade-in slide-in-from-right-6 duration-700 delay-150 rounded-3xl border border-white/12 bg-black/70 p-6 shadow-[0_20px_50px_-35px_rgba(0,0,0,0.9)] backdrop-blur-md">
            <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">
              Create A Paid Prompt
            </p>
            <form
              className="mt-4 flex w-full flex-col gap-4"
              onSubmit={handleSubmit(onChoosePaymentMethod)}
            >
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-100">Prompt</label>
                <Input
                  type="text"
                  placeholder="Write a precise prompt..."
                  aria-invalid={errors.prompt ? "true" : "false"}
                  {...register("prompt")}
                  className="h-12 rounded-2xl border-white/15 bg-black/45 px-4 text-base text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-white/35 md:text-base"
                />
                <div className="flex items-center justify-between gap-3 text-xs">
                  {errors.prompt ? (
                    <p className="text-red-300/90">{errors.prompt.message}</p>
                  ) : (
                    <p className="text-zinc-500">
                      Your prompt is validated before any payment request.
                    </p>
                  )}
                  <span className="text-zinc-500">{promptLength}/500</span>
                </div>
              </div>

              {!isPaymentMethodOpen ? (
                <Button
                  type="submit"
                  disabled={isSubmitting || !connected}
                  className="mt-2 h-11 rounded-2xl bg-white text-black transition-colors duration-200 hover:bg-zinc-200 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Generating..." : "Choose Payment Method"}
                </Button>
              ) : (
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <Button
                    type="button"
                    onClick={() => void handleSubmit(onUsdcSelect)()}
                    disabled={isSubmitting || !connected}
                    className="h-12 rounded-2xl border border-white/20 bg-black/50 text-zinc-100 transition-colors hover:bg-zinc-900 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Generating..." : "Pay 1 USDC"}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void handleSubmit(onSolSelect)()}
                    disabled={isSubmitting || !connected}
                    className="h-12 rounded-2xl border border-white/20 bg-black/50 text-zinc-100 transition-colors hover:bg-zinc-900 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Generating..." : "Pay 0.02 SOL"}
                  </Button>
                </div>
              )}
            </form>

            {!connected ? (
              <p className="mt-4 rounded-2xl border border-white/12 bg-black/45 px-3 py-2 text-xs text-zinc-300">
                Connect your wallet to unlock on-chain payment.
              </p>
            ) : null}
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          {submittedPrompt ? (
            <article className="animate-in fade-in slide-in-from-bottom-3 duration-700 rounded-3xl border border-white/12 bg-black/70 p-4 text-zinc-100 backdrop-blur-md">
              <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">
                Submitted Prompt
              </p>
              <p className="mt-2 whitespace-pre-wrap wrap-break-word text-sm text-zinc-300 sm:text-base">
                {submittedPrompt}
              </p>
            </article>
          ) : null}

          {aiAnswer ? (
            <article
              className={`animate-in fade-in slide-in-from-bottom-3 duration-700 delay-100 rounded-3xl border border-white/12 bg-black/70 p-4 text-zinc-100 backdrop-blur-md ${submittedPrompt ? "lg:col-span-1" : "lg:col-span-2"}`}
            >
              <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">
                AI Answer
              </p>
              <p className="mt-2 whitespace-pre-wrap wrap-break-word text-sm text-zinc-300 sm:text-base">
                {aiAnswer}
              </p>
            </article>
          ) : null}
        </section>

        <section className="animate-in fade-in slide-in-from-bottom-3 duration-700 delay-150 rounded-3xl border border-white/12 bg-black/70 p-5 backdrop-blur-md sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">
                User History
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                Latest paid prompts for your connected wallet.
              </p>
            </div>
            {connected && publicKey ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => void loadHistory(publicKey)}
                  disabled={isHistoryLoading || isHistoryClearing}
                  className="h-9 rounded-full border border-white/20 bg-black/50 px-4 text-zinc-100 hover:bg-zinc-900 disabled:cursor-not-allowed"
                >
                  {isHistoryLoading ? "Refreshing..." : "Refresh"}
                </Button>
                <Button
                  type="button"
                  onClick={() => void clearHistory(publicKey)}
                  disabled={isHistoryLoading || isHistoryClearing || history.length === 0}
                  className="h-9 rounded-full border border-red-300/35 bg-red-500/10 px-4 text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed"
                >
                  {isHistoryClearing ? "Clearing..." : "Clear History"}
                </Button>
              </div>
            ) : null}
          </div>

          {!connected ? (
            <p className="mt-4 rounded-2xl border border-white/12 bg-black/45 px-3 py-2 text-sm text-zinc-400">
              Connect your wallet to view your history.
            </p>
          ) : null}

          {connected && isHistoryLoading ? (
            <p className="mt-4 text-sm text-zinc-400">Loading history...</p>
          ) : null}

          {connected && historyError ? (
            <p className="mt-4 rounded-2xl border border-red-300/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {historyError}
            </p>
          ) : null}

          {connected && !isHistoryLoading && !historyError && history.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-white/12 bg-black/45 px-3 py-2 text-sm text-zinc-400">
              No history yet. Complete your first paid prompt to create entries.
            </p>
          ) : null}

          {connected && history.length > 0 ? (
            <div className="mt-4 space-y-3">
              {history.map((item) => (
                <article
                  key={`${item.id}-${item.txSignature}`}
                  className="rounded-2xl border border-white/10 bg-black/45 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <span>{formatHistoryDate(item.createdAt)}</span>
                    <span className="text-zinc-700">|</span>
                    <span className="truncate">
                      tx: {item.txSignature.slice(0, 8)}...{item.txSignature.slice(-8)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-200">
                    Prompt: <span className="text-zinc-300">{item.promptText}</span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap wrap-break-word text-sm text-zinc-400">
                    AI: {item.aiResponse}
                  </p>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}