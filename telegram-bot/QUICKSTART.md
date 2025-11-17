# Quick Start Guide

## Prerequisites
- Node.js 18+ installed
- Telegram account
- Solana wallet with devnet SOL (for testing)

## 5-Minute Setup

### Step 1: Get Bot Token (2 minutes)
1. Open Telegram
2. Search for `@BotFather`
3. Send: `/newbot`
4. Follow prompts (name + username)
5. **Copy the bot token** (looks like `123456:ABC...xyz`)

### Step 2: Configure Bot (1 minute)
```bash
cd telegram-bot
npm install
cp .env.example .env
```

Edit `.env` file:
- Paste your `BOT_TOKEN`
- Get your Telegram ID from [@userinfobot](https://t.me/userinfobot) and add as `ADMIN_TELEGRAM_ID`

### Step 3: Ensure Program is Initialized (1 minute)

The Solana program must be initialized before the bot can work. Check if it's already initialized:

```bash
cd ..  # Go to project root
anchor test
```

If tests pass, the program is already initialized. If not, you'll need to initialize it.

### Step 4: Run Bot (1 minute)
```bash
cd telegram-bot
npm run dev
```

You should see:
```
✅ Loaded 0 wallet(s)
🤖 F1 Prediction Bot is running...
```

### Step 5: Test Your Bot
1. Open Telegram
2. Search for your bot username
3. Send `/start`
4. Your wallet is created automatically! 🎉

## Next Steps

### Get Test SOL
Your bot wallet needs devnet SOL for transactions:

1. Get your wallet address: `/wallet`
2. Use Solana faucet:
   ```bash
   solana airdrop 2 <YOUR_ADDRESS> --url devnet
   ```
   Or visit: https://faucet.solana.com/

### Create Your First Market
```
/create Will Max Verstappen win the next race? | 2 | 48
```

This creates a market with:
- 2 SOL initial liquidity
- Closes in 48 hours

### Place a Bet
1. `/markets` - See all markets
2. Click "Bet YES" or "Bet NO"
3. Select amount
4. Done! 🎉

## Troubleshooting

**Bot doesn't respond**
- Check `.env` file has correct `BOT_TOKEN`
- Make sure bot is running (`npm run dev`)
- Check console for errors

**"Insufficient balance" error**
- Your wallet needs SOL
- Use `/wallet` to get address
- Get devnet SOL from faucet

**"Program not initialized" error**
- Run tests first: `anchor test` (from project root)
- Or manually initialize the program

**Transaction fails**
- Wait 10-15 seconds between transactions
- Check RPC endpoint is responding
- Try again (Solana devnet can be slow)

## Production Checklist

Before deploying to mainnet:

- [ ] Deploy program to mainnet-beta
- [ ] Update `PROGRAM_ID` in `.env`
- [ ] Change `SOLANA_RPC_URL` to mainnet
- [ ] Get mainnet SOL for wallet
- [ ] Test thoroughly with small amounts
- [ ] Set up monitoring/logging
- [ ] Implement wallet encryption
- [ ] Set up automated backups
- [ ] Review security best practices

## Support

- 📖 Full docs: See `README.md`
- 🐛 Issues: Open on GitHub
- 💬 Chat: [Your Telegram/Discord]

---

**Ready to bet on F1? 🏎️💨**
