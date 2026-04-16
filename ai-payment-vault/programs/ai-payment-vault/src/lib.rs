use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("2SYmumui9QT5ysXcvY4k7k5KoA7T7ipCvnfCZ51YfWqs");

#[program]
pub mod ai_payment_vault {
    use super::*;

    pub fn pay_for_prompt(ctx:Context<PayForPrompt>,amount:u64)->Result<()> {
   
     require!(amount > 0, ErrorCode::InvalidAmount);
        let ix= anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.user.key(),
            &ctx.accounts.vault.key(),
            amount,
        );
        anchor_lang::solana_program::program::invoke(&ix, &[ctx.accounts.user.to_account_info(), ctx.accounts.vault.to_account_info()])?;
        emit!(PaymentMade {
            user: ctx.accounts.user.key(),
            amount,
            is_usdc: false,
            mint: None,
            timestamp: Clock::get()?.unix_timestamp,
        });

Ok(())
    }

   pub fn pay_for_prompt_usdc(ctx:Context<PayForPromptUsdc>,amount:u64)->Result<()>{

    require!(amount > 0, ErrorCode::InvalidAmount);
    let cpi_accounts = token::Transfer {
        from: ctx.accounts.user_usdc_account.to_account_info(),
        to: ctx.accounts.vault_usdc_account.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };

    
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    emit!(PaymentMade {
        user: ctx.accounts.user.key(),
        amount,
        is_usdc: true,
        mint: Some(ctx.accounts.mint.key()),
        timestamp: Clock::get()?.unix_timestamp,
    });
    Ok(())
}
}

#[error_code]
pub enum ErrorCode {
    #[msg("Amount must be greater than zero.")]
    InvalidAmount,
}

#[event]
pub struct PaymentMade {
    pub user: Pubkey,
    pub amount: u64,
    pub is_usdc: bool,         
    pub mint: Option<Pubkey>,    // None for SOL, Some(mint) for USDC
    pub timestamp: i64,
}

#[derive(Accounts)]
pub struct PayForPrompt<'info> {
    #[account(mut)]
    pub user:Signer<'info>,
    #[account(mut ,seeds=[b"vault"], bump)]
    pub vault: SystemAccount<'info> ,
    pub system_program: Program<'info,System>,  
}

#[derive(Accounts)]
pub struct PayForPromptUsdc<'info> {
    #[account(mut)]
    pub user:Signer<'info>,

  #[account(init_if_needed, payer=user, associated_token::mint = mint, associated_token::authority=user)]
    pub user_usdc_account: Account<'info, TokenAccount>,

    #[account(mut ,seeds=[b"vault"], bump)]
    pub vault: SystemAccount<'info> ,

  #[account(init_if_needed, payer=user, associated_token::mint = mint, associated_token::authority=vault)]
    pub vault_usdc_account: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
} 