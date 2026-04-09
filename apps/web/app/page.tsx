"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { createTransferCheckedInstruction, getAssociatedTokenAddress } from "@solana/spl-token";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WalletButton } from "./WalletButton";
import * as z from "zod";

const formSchema = z.object({
  prompt: z
    .string()
    .min(10, "Minimum 10 characters")
    .max(500, "Maximum 500 characters"),
});

const TREASURY_PUBKEY = new PublicKey("ESki1JC3S2TV6kV3yY9YgAtH82HXiCSTw2CLpayU3tAR");
const SOL_COST_LAMPORTS = 20_000_000;
const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const USDC_DECIMALS = 6;
const USDC_AMOUNT = 1_000_000;

type FormValues = z.infer<typeof formSchema>;

export default function Home() {
  const [aiAnswer, setAiAnswer] = useState<string[]>([]);
  const [submittedPrompt, setSubmittedPrompt] = useState<string[]>([]);
  const [isPaymentMethodOpen, setIsPaymentMethodOpen] = useState(false);
  const { connected, sendTransaction, publicKey } = useWallet();
  const { connection } = useConnection();

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

    const dbResult = (await response.json()) as {
      record?: {
        aiResponse?: string;
      };
    };

    setSubmittedPrompt((prev) => [...prev, values.prompt]);
    setAiAnswer((prev) => [...prev, dbResult.record?.aiResponse ?? "No AI answer was returned."]);
  };

  const onChoosePaymentMethod = () => {
    setIsPaymentMethodOpen(true);
  };

  const onUsdcSelect = async (values: FormValues) => {
    if (!connected) {
      alert("Please connect your wallet first.");
      return;
    }
    try {
      const payerPublicKey = publicKey;

      if (!payerPublicKey) {
        alert("Unable to retrieve your wallet address.");
        return;
      }

      const userUsdcAddress = await getAssociatedTokenAddress(
        USDC_MINT,
        payerPublicKey
      );
      const treasuryUsdcAddress = await getAssociatedTokenAddress(
        USDC_MINT,
        TREASURY_PUBKEY
      );

      const transaction = new Transaction().add(
        createTransferCheckedInstruction(
          userUsdcAddress,
          USDC_MINT,
          treasuryUsdcAddress,
          payerPublicKey,
          USDC_AMOUNT,
          USDC_DECIMALS
        )
      );

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "confirmed");
      await submitPromptRecord(values, signature, payerPublicKey);
    } catch (error) {
      console.error("Transaction failed:", error);
      alert("Transaction failed. Please try again.");
    }
  };

  const onSolSelect = async (values: FormValues) => {
    if (!connected) {
      alert("Please connect your wallet first.");
      return;
    }

    try {
      const payerPublicKey = publicKey;

      if (!payerPublicKey) {
        alert("Unable to retrieve your wallet address.");
        return;
      }

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: payerPublicKey,
          toPubkey: TREASURY_PUBKEY,
          lamports: SOL_COST_LAMPORTS,
        })
      );

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "confirmed");
      await submitPromptRecord(values, signature, payerPublicKey);
    } catch (error) {
      console.error("Transaction failed:", error);
      alert("Transaction failed. Please try again.");
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] px-4 py-6 text-zinc-100 sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.1),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-size-[34px_34px] opacity-50" />

      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-6 sm:gap-8">
        <header className="animate-in fade-in slide-in-from-top-3 duration-700 flex flex-col gap-4 rounded-3xl border border-white/15 bg-black/75 p-4 shadow-[0_24px_70px_-42px_rgba(0,0,0,0.85)] backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="w-fit rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-zinc-400">
              Solana Devnet
            </p>
            <h1 className="mt-3 font-heading text-3xl leading-tight text-white sm:text-4xl">
              Solana AI Agent
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
          {submittedPrompt.map((prompt, index) => (
            <article className="animate-in fade-in slide-in-from-bottom-3 duration-700 rounded-3xl border border-white/12 bg-black/70 p-4 text-zinc-100 backdrop-blur-md" key={index}>
              <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">
                Submitted Prompt
              </p>
              <p className="mt-2 whitespace-pre-wrap wrap-break-word text-sm text-zinc-300 sm:text-base">
                {prompt}
              </p>
            </article>
          ))}

          {aiAnswer.map((answer, index) => (
            <article
              className={`animate-in fade-in slide-in-from-bottom-3 duration-700 delay-100 rounded-3xl border border-white/12 bg-black/70 p-4 text-zinc-100 backdrop-blur-md ${submittedPrompt ? "lg:col-span-1" : "lg:col-span-2"}`}
              key={index}
            >
              <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">
                AI Answer
              </p>
              <p className="mt-2 whitespace-pre-wrap wrap-break-word text-sm text-zinc-300 sm:text-base">
                {answer}
              </p>
            </article>
          ) )}
        </section>
      </div>
    </main>
  );
}