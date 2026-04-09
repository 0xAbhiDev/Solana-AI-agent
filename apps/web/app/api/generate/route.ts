import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { prisma } from "../../../lib/prisma";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, txSignature, payerPublicKey } = body;

    if (!prompt || !txSignature || !payerPublicKey) {
      return NextResponse.json(
        { error: "Missing prompt, signature, or wallet" },
        { status: 400 }
      );
    }

    const newRecord = await prisma.agent.create({
      data: {
        userWallet: payerPublicKey,
        txSignature: txSignature,
        promptText: prompt,
        aiResponse : "",
      },
    });

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: "You are a helpful, expert AI assistant. Keep responses concise and formatted in markdown. keep in mind that the user is interacting with you through a web3 application and has just submitted a prompt. Provide a helpful and relevant response to their prompt. the response should be on point and short. If the prompt is unclear, ask for clarification." 
        },
        { 
          role: "user", 
          content: prompt 
        }
      ],
     model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 1024,
    });

    const aiText = chatCompletion.choices[0]?.message?.content || "No response generated.";

    const updatedRecord = await prisma.agent.update({
      where: { id: newRecord.id },
      data: { aiResponse: aiText },
    });

    return NextResponse.json({ success: true, record: updatedRecord }, { status: 200 });

  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json(
      { error: "Failed to save to database" },
      { status: 500 }
    );
  }
}