import { Keypair } from '@solana/web3.js';
import { PrivyClient } from '@privy-io/server-auth';
import * as fs from 'fs';
import * as path from 'path';

const USER_WALLET_MAPPINGS_PATH = path.join(__dirname, '../wallets/privy-user-mappings.json');

interface UserWalletMapping {
  [telegramUserId: string]: string; // Maps Telegram user ID to Privy wallet ID
}

export class PrivyWalletManager {
  private privy: PrivyClient;
  private userWalletMappings: UserWalletMapping = {};

  constructor(appId: string, appSecret: string, authorizationPrivateKey: string) {
    this.privy = new PrivyClient(appId, appSecret, {
      walletApi: {
        authorizationPrivateKey: authorizationPrivateKey
      }
    });

    this.loadUserWalletMappings();
  }

  private loadUserWalletMappings() {
    try {
      if (fs.existsSync(USER_WALLET_MAPPINGS_PATH)) {
        const data = fs.readFileSync(USER_WALLET_MAPPINGS_PATH, 'utf8');
        this.userWalletMappings = JSON.parse(data);
        console.log(`✅ Loaded ${Object.keys(this.userWalletMappings).length} user-wallet mapping(s)`);
      }
    } catch (error) {
      console.error('Error loading user-wallet mappings:', error);
      this.userWalletMappings = {};
    }
  }

  private saveUserWalletMappings() {
    try {
      fs.writeFileSync(
        USER_WALLET_MAPPINGS_PATH,
        JSON.stringify(this.userWalletMappings, null, 2)
      );
    } catch (error) {
      console.error('Error saving user-wallet mappings:', error);
    }
  }

  async createWallet(userId: string): Promise<{ walletId: string; address: string }> {
    try {
      // Check if user already has a wallet
      if (this.userWalletMappings[userId]) {
        const walletId = this.userWalletMappings[userId];
        const wallet = await this.privy.walletApi.getWallet({ id: walletId });
        console.log(`✅ User ${userId} already has wallet: ${wallet.address}`);
        return { walletId: wallet.id, address: wallet.address };
      }

      // Create new Solana wallet with Privy
      const { id, address } = await this.privy.walletApi.createWallet({ 
        chainType: 'solana' 
      });

      // Save the user-wallet mapping
      this.userWalletMappings[userId] = id;
      this.saveUserWalletMappings();

      console.log(`✅ Created wallet for user ${userId}: ${address}`);
      return { walletId: id, address };
    } catch (error) {
      console.error(`Error creating wallet for user ${userId}:`, error);
      throw error;
    }
  }

  hasWallet(userId: string): boolean {
    return !!this.userWalletMappings[userId];
  }

  async getWallet(userId: string): Promise<{ id: string; address: string } | null> {
    try {
      const walletId = this.userWalletMappings[userId];
      if (!walletId) {
        return null;
      }

      const wallet = await this.privy.walletApi.getWallet({ id: walletId });
      return { id: wallet.id, address: wallet.address };
    } catch (error) {
      console.error(`Error getting wallet for user ${userId}:`, error);
      return null;
    }
  }

  getWalletId(userId: string): string | null {
    return this.userWalletMappings[userId] || null;
  }

  // Get a Keypair for signing (used by SolanaService)
  // Note: With Privy, we use their API to sign, not direct keypairs
  // This method is kept for backwards compatibility but should not be used directly
  async getWalletKeypair(userId: string): Promise<Keypair> {
    throw new Error(
      'Direct keypair access is not available with Privy. Use Privy API methods for signing transactions.'
    );
  }

  // Sign a transaction using Privy
  async signTransaction(userId: string, transaction: any): Promise<any> {
    try {
      const walletId = this.userWalletMappings[userId];
      if (!walletId) {
        throw new Error('User does not have a wallet');
      }

      const { signedTransaction } = await this.privy.walletApi.solana.signTransaction({
        walletId,
        transaction
      });

      return signedTransaction;
    } catch (error) {
      console.error(`Error signing transaction for user ${userId}:`, error);
      throw error;
    }
  }

  // Send a transaction using Privy
  // Note: Privy signs transactions, but you need to send them via Solana RPC
  // This method signs and returns the signed transaction for you to send
  async sendTransaction(userId: string, transaction: any): Promise<string> {
    throw new Error(
      'Use signTransaction to get signed transaction, then send it via Solana connection'
    );
  }

  // Export wallet private key
  // Note: Privy embedded wallets use MPC and don't expose raw private keys directly
  // This method provides the wallet details needed for the user to access their wallet
  async exportPrivateKey(userId: string): Promise<{ address: string; walletId: string; recoveryMethod: string }> {
    try {
      const walletId = this.userWalletMappings[userId];
      if (!walletId) {
        throw new Error('User does not have a wallet');
      }

      const wallet = await this.privy.walletApi.getWallet({ id: walletId });

      // Privy embedded wallets are non-custodial and use MPC
      // Users can access their wallets through Privy's recovery mechanisms
      return {
        address: wallet.address,
        walletId: wallet.id,
        recoveryMethod: 'privy-embedded-wallet'
      };
    } catch (error: any) {
      console.error(`Error getting wallet details for user ${userId}:`, error);
      throw error;
    }
  }

  // Get wallet recovery/export information
  async getWalletExportInfo(userId: string): Promise<string> {
    const wallet = await this.exportPrivateKey(userId);
    
    return (
      `🔐 *Wallet Information*\n\n` +
      `Address: \`${wallet.address}\`\n\n` +
      `Wallet ID: \`${wallet.walletId}\`\n\n` +
      `⚠️ *Important Information:*\n\n` +
      `Your wallet is a Privy embedded wallet using MPC (Multi-Party Computation) technology. ` +
      `This means the private key is split and secured, never exposed as a single key.\n\n` +
      `*To access your funds elsewhere:*\n` +
      `1. Use /withdraw to send funds to another wallet\n` +
      `2. Or contact support for wallet migration options\n\n` +
      `Your funds are always under your control and can be withdrawn at any time.`
    );
  }
}
