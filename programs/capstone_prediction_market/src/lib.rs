use anchor_lang::prelude::*;

declare_id!("72jWpfijYJqBf8L69Qw92o7tNKDBDKaiYUziDco7vMZL");

#[program]
pub mod capstone_prediction_market {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
