import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet")?.trim();

  if (!wallet) {
    return NextResponse.json(
      { error: "Missing wallet query parameter" },
      { status: 400 }
    );
  }

  try {
    const history = await prisma.agent.findMany({
      where: {
        userWallet: wallet,
      },
      select: {
        id: true,
        promptText: true,
        aiResponse: true,
        txSignature: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });

    return NextResponse.json({ history }, { status: 200 });
  } catch (error) {
    console.error("Failed to load user history:", error);
    return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet")?.trim();

  if (!wallet) {
    return NextResponse.json(
      { error: "Missing wallet query parameter" },
      { status: 400 }
    );
  }

  try {
    const result = await prisma.agent.deleteMany({
      where: {
        userWallet: wallet,
      },
    });

    return NextResponse.json(
      { success: true, deletedCount: result.count },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to clear user history:", error);
    return NextResponse.json(
      { error: "Failed to clear history" },
      { status: 500 }
    );
  }
}
