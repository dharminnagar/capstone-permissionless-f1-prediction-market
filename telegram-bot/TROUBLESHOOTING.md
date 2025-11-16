# Troubleshooting Guide

## ✅ Bot is Running Successfully!

If you see these logs, the bot is working:
```
🚀 Starting F1 Prediction Bot...
✅ Loaded X wallet(s)
✅ Bot commands registered with Telegram
🤖 F1 Prediction Bot is running...
```

## Commands Not Showing in Menu?

The bot now automatically registers commands with Telegram. They should appear when you:

1. Type `/` in the chat with your bot
2. Wait 2-3 seconds for Telegram to refresh
3. If still not showing:
   - Send any message to the bot first (like `/start`)
   - Close and reopen the Telegram app
   - Commands are cached by Telegram client

## Bot Not Responding?

### Check 1: Bot is Running
```bash
cd telegram-bot
npm start
```

You should see:
```
✅ Bot commands registered with Telegram
🤖 F1 Prediction Bot is running...
```

### Check 2: Bot Token is Valid
1. Message @BotFather on Telegram
2. Send: `/mybots`
3. Select your bot
4. Check if it's active
5. If you regenerated the token, update `.env` file

### Check 3: You're Talking to the Right Bot
1. In Telegram, search for your bot's username
2. Make sure it's the exact username from BotFather
3. Send `/start`

### Check 4: Check Logs
When you send a command, you should see logs like:
```
📩 /start from user 123456789
📩 /help from user 123456789
```

If you see these, the bot is receiving messages.

## Common Issues

### "Error: 401: Unauthorized"
- Wrong BOT_TOKEN in `.env`
- Update token from @BotFather

### "Cannot find module"
- Run: `npm run build`
- Then: `npm start`

### "Connection refused" or RPC errors
- Check internet connection
- Try different RPC: `https://api.mainnet-beta.solana.com`
- Or use paid RPC (Helius, QuickNode)

### Bot responds but markets don't load
- Program might not be initialized
- Run: `cd .. && anchor test` (from project root)
- Or manually initialize the program

### Transactions fail
- Check wallet has SOL: `/wallet`
- Get devnet SOL: `solana airdrop 2 <address> --url devnet`
- Or use: https://faucet.solana.com/

## Testing the Bot

1. **Start**: `/start` → Should create wallet
2. **Help**: `/help` → Should show commands
3. **Wallet**: `/wallet` → Should show address
4. **Markets**: `/markets` → Should show markets (if any exist)

## Viewing Logs

The bot logs all commands:
```
📩 /start from user 123456789
📩 /wallet from user 123456789
📩 /markets from user 123456789
```

If you don't see these, the bot isn't receiving messages.

## Force Refresh Telegram Commands

If commands still don't show:

1. Message @BotFather
2. Send: `/setcommands`
3. Select your bot
4. Paste:
```
start - Create wallet and get started
help - Show all commands
wallet - View wallet address and balance
deposit - Get deposit instructions
markets - View active prediction markets
market - View specific market details
create - Create a new prediction market
positions - View your open positions
claim - Claim your winnings
export - Export private key (DM only)
about - About the platform
```

## Still Having Issues?

1. Stop the bot (Ctrl+C)
2. Delete wallets folder: `rm -rf wallets`
3. Rebuild: `npm run build`
4. Start fresh: `npm start`
5. Send `/start` to your bot in Telegram

## Success Indicators

When working correctly:
- ✅ Bot responds within 1-2 seconds
- ✅ Commands appear in `/` menu
- ✅ Inline buttons work (Bet YES/NO)
- ✅ Transactions complete successfully

## Need Help?

Current status based on logs:
- ✅ Bot is running
- ✅ Commands registered
- ✅ Bot received `/start` command
- ✅ Everything is working!

**Your bot is operational!** 🎉

Try these commands in Telegram:
- `/start` - Creates wallet
- `/help` - Shows all commands
- `/wallet` - Shows your balance
- `/markets` - Browse markets
