import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AiPaymentVault } from "../target/types/ai_payment_vault";

describe("ai-payment-vault", () => {

  const connection = new anchor.web3.Connection(
    "https://api.devnet.solana.com", 
    "confirmed"
  );
const provider = new anchor.AnchorProvider(connection, anchor.AnchorProvider.env().wallet, { commitment: "confirmed" });
anchor.setProvider(provider);

const program = anchor.workspace.aiPaymentVault as Program<AiPaymentVault>;
console.log(provider.wallet.publicKey.toString());
 
  it("Is initialized!", async () => {
    // Add your test here.
     const tx= await program.methods.payForPrompt(new anchor.BN(1000000)).accounts({
      user: provider.wallet.publicKey,
    }).rpc();
    console.log("Your transaction signature", tx);
    
  });


   it("Is initialized!", async () => {
      
    const usdc_address = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
    const user_usdc_ata =  anchor.utils.token.associatedAddress({
      mint: new anchor.web3.PublicKey(usdc_address),
      owner: provider.wallet.publicKey,
    });
    console.log("User USDC ATA:", user_usdc_ata.toString());

const [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault")],
      program.programId
    );
    console.log("Vault PDA:", vaultPda.toString());

    const vault_usdc_ata =  anchor.utils.token.associatedAddress({
      mint: new anchor.web3.PublicKey(usdc_address),
      owner: vaultPda,
    });
   
    console.log("Vault USDC ATA:", vault_usdc_ata.toString());

    const tx= await program.methods.payForPromptUsdc(new anchor.BN(1000000)).accountsPartial({
      user: provider.wallet.publicKey,
      userUsdcAccount: user_usdc_ata,
      vaultUsdcAccount: vault_usdc_ata,
      mint: new anchor.web3.PublicKey(usdc_address),
    }).rpc();
    console.log("Your transaction signature", tx);

    })

   })
