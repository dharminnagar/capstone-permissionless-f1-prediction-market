import { Connection, PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL, Transaction, VersionedTransaction } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, BN, Idl } from '@coral-xyz/anchor';
import idlJson from './idl.json';
import { PrivyWalletManager } from './privy-wallet';

const idl = idlJson as Idl;

export interface Market {
  publicKey: PublicKey;
  marketId: number;
  question: string;
  creator: PublicKey;
  resolver: PublicKey;
  yesPool: number;
  noPool: number;
  totalLiquidity: number;
  state: string;
  outcome: boolean | null;
  closeTime: number;
  resolutionTime: number | null;
  payoutRatio: number;
}

export interface Position {
  publicKey: PublicKey;
  user: PublicKey;
  market: PublicKey;
  side: boolean;
  amount: number;
  entryOdds: number;
  claimed: boolean;
}

export class SolanaService {
  private connection: Connection;
  private programId: PublicKey;
  private walletManager: PrivyWalletManager;

  constructor(connection: Connection, programId: string, walletManager: PrivyWalletManager) {
    this.connection = connection;
    this.programId = new PublicKey(programId);
    this.walletManager = walletManager;
  }

  private getProvider(keypair: Keypair): AnchorProvider {
    const wallet = new Wallet(keypair);
    return new AnchorProvider(this.connection, wallet, {
      commitment: 'confirmed',
    });
  }

  private getProgram(provider: AnchorProvider): Program<Idl> {
    return new Program(idl, provider);
  }

  private async getGlobalStatePDA(): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('global_state')],
      this.programId
    );
  }

  private async getMarketPDA(marketId: number): Promise<[PublicKey, number]> {
    const marketIdBuffer = Buffer.alloc(8);
    marketIdBuffer.writeBigUInt64LE(BigInt(marketId));
    
    return PublicKey.findProgramAddressSync(
      [Buffer.from('market'), marketIdBuffer],
      this.programId
    );
  }

  private async getMarketVaultPDA(marketPDA: PublicKey): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('market_vault'), marketPDA.toBuffer()],
      this.programId
    );
  }

  private async getPositionPDA(marketPDA: PublicKey, userPubkey: PublicKey): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('position'), marketPDA.toBuffer(), userPubkey.toBuffer()],
      this.programId
    );
  }

  private async getLPPositionPDA(marketPDA: PublicKey, creatorPubkey: PublicKey): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('lp-position'), marketPDA.toBuffer(), creatorPubkey.toBuffer()],
      this.programId
    );
  }

  private parseMarketState(state: any): string {
    if (state.active) return 'Active';
    if (state.closed) return 'Closed';
    if (state.resolved) return 'Resolved';
    if (state.finalized) return 'Finalized';
    return 'Unknown';
  }

  private parseQuestion(questionBytes: number[]): string {
    return Buffer.from(questionBytes)
      .toString('utf8')
      .replace(/\0/g, '')
      .trim();
  }

  async getActiveMarkets(): Promise<Market[]> {
    try {
      const dummyKeypair = Keypair.generate();
      const provider = this.getProvider(dummyKeypair);
      const program = this.getProgram(provider);

      const accounts = await (program.account as any).market.all();
      
      return accounts
        .map((account: any) => ({
          publicKey: account.publicKey,
          marketId: account.account.marketId.toNumber(),
          question: this.parseQuestion(account.account.question),
          creator: account.account.creator,
          resolver: account.account.resolver,
          yesPool: account.account.yesPool.toNumber(),
          noPool: account.account.noPool.toNumber(),
          totalLiquidity: account.account.totalLiquidity.toNumber(),
          state: this.parseMarketState(account.account.state),
          outcome: account.account.outcome,
          closeTime: account.account.closeTime.toNumber(),
          resolutionTime: account.account.resolutionTime?.toNumber() || null,
          payoutRatio: account.account.payoutRatio.toNumber(),
        }))
        .filter((market: Market) => market.state === 'Active' || market.state === 'Closed');
    } catch (error) {
      console.error('Error fetching markets:', error);
      return [];
    }
  }

  async getMarket(marketId: number): Promise<Market | null> {
    try {
      const dummyKeypair = Keypair.generate();
      const provider = this.getProvider(dummyKeypair);
      const program = this.getProgram(provider);

      const [marketPDA] = await this.getMarketPDA(marketId);
      const marketAccount = await (program.account as any).market.fetch(marketPDA);

      return {
        publicKey: marketPDA,
        marketId: marketAccount.marketId.toNumber(),
        question: this.parseQuestion(marketAccount.question),
        creator: marketAccount.creator,
        resolver: marketAccount.resolver,
        yesPool: marketAccount.yesPool.toNumber(),
        noPool: marketAccount.noPool.toNumber(),
        totalLiquidity: marketAccount.totalLiquidity.toNumber(),
        state: this.parseMarketState(marketAccount.state),
        outcome: marketAccount.outcome,
        closeTime: marketAccount.closeTime.toNumber(),
        resolutionTime: marketAccount.resolutionTime?.toNumber() || null,
        payoutRatio: marketAccount.payoutRatio.toNumber(),
      };
    } catch (error) {
      console.error('Error fetching market:', error);
      return null;
    }
  }

  async getUserPositions(userPublicKey: PublicKey): Promise<Position[]> {
    try {
      const dummyKeypair = Keypair.generate();
      const provider = this.getProvider(dummyKeypair);
      const program = this.getProgram(provider);

      const accounts = await (program.account as any).position.all([
        {
          memcmp: {
            offset: 8,
            bytes: userPublicKey.toBase58(),
          },
        },
      ]);

      return accounts.map((account: any) => ({
        publicKey: account.publicKey,
        user: account.account.user,
        market: account.account.market,
        side: account.account.side,
        amount: account.account.amount.toNumber(),
        entryOdds: account.account.entryOdds.toNumber(),
        claimed: account.account.claimed,
      }));
    } catch (error) {
      console.error('Error fetching positions:', error);
      return [];
    }
  }

  async placeBet(
    userId: string,
    marketId: number,
    side: boolean,
    amount: number
  ): Promise<string> {
    try {
      // Get user wallet from Privy
      const wallet = await this.walletManager.getWallet(userId);
      if (!wallet) {
        throw new Error('Wallet not found for user');
      }
      const userPublicKey = new PublicKey(wallet.address);

      // Create a dummy keypair for provider (needed for program initialization)
      const dummyKeypair = Keypair.generate();
      const provider = this.getProvider(dummyKeypair);
      const program = this.getProgram(provider);

      const [globalStatePDA] = await this.getGlobalStatePDA();
      const [marketPDA] = await this.getMarketPDA(marketId);
      const [marketVaultPDA] = await this.getMarketVaultPDA(marketPDA);
      const [positionPDA] = await this.getPositionPDA(marketPDA, userPublicKey);

      // Fetch market to get creator
      const marketAccount = await (program.account as any).market.fetch(marketPDA);
      const [lpPositionPDA] = await this.getLPPositionPDA(marketPDA, marketAccount.creator);

      // Fetch global state to get protocol treasury
      const globalState = await (program.account as any).globalState.fetch(globalStatePDA);

      // Build the transaction
      const tx = await program.methods
        .placeBet(side, new BN(amount))
        .accounts({
          globalState: globalStatePDA,
          market: marketPDA,
          marketVault: marketVaultPDA,
          position: positionPDA,
          lpPosition: lpPositionPDA,
          protocolTreasury: globalState.protocolTreasury,
          user: userPublicKey,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = userPublicKey;

      // Sign transaction with Privy
      const signedTx = await this.walletManager.signTransaction(userId, tx);

      // Send the signed transaction
      const signature = await this.connection.sendRawTransaction(signedTx.serialize());
      await this.connection.confirmTransaction(signature, 'confirmed');

      return signature;
    } catch (error) {
      console.error('Error placing bet:', error);
      throw error;
    }
  }

  async claimPayout(
    userId: string,
    marketId: number
  ): Promise<string> {
    try {
      // Get user wallet from Privy
      const wallet = await this.walletManager.getWallet(userId);
      if (!wallet) {
        throw new Error('Wallet not found for user');
      }
      const userPublicKey = new PublicKey(wallet.address);

      // Create a dummy keypair for provider
      const dummyKeypair = Keypair.generate();
      const provider = this.getProvider(dummyKeypair);
      const program = this.getProgram(provider);

      const [marketPDA] = await this.getMarketPDA(marketId);
      const [marketVaultPDA] = await this.getMarketVaultPDA(marketPDA);
      const [positionPDA] = await this.getPositionPDA(marketPDA, userPublicKey);

      // Build the transaction
      const tx = await program.methods
        .claimPayout()
        .accounts({
          market: marketPDA,
          position: positionPDA,
          marketVault: marketVaultPDA,
          user: userPublicKey,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = userPublicKey;

      // Sign transaction with Privy
      const signedTx = await this.walletManager.signTransaction(userId, tx);

      // Send the signed transaction
      const signature = await this.connection.sendRawTransaction(signedTx.serialize());
      await this.connection.confirmTransaction(signature, 'confirmed');

      return signature;
    } catch (error) {
      console.error('Error claiming payout:', error);
      throw error;
    }
  }

  async createMarket(
    userId: string,
    question: string,
    initialLiquidity: number,
    closeTime: number
  ): Promise<{ signature: string; marketId: number }> {
    try {
      // Get user wallet from Privy
      const wallet = await this.walletManager.getWallet(userId);
      if (!wallet) {
        throw new Error('Wallet not found for user');
      }
      const userPublicKey = new PublicKey(wallet.address);

      // Create a dummy keypair for provider
      const dummyKeypair = Keypair.generate();
      const provider = this.getProvider(dummyKeypair);
      const program = this.getProgram(provider);

      const [globalStatePDA] = await this.getGlobalStatePDA();
      const globalState = await (program.account as any).globalState.fetch(globalStatePDA);
      // Program uses (market_counter + 1) for PDA seeds
      const nextMarketId = globalState.marketCounter.toNumber() + 1;

      const [marketPDA] = await this.getMarketPDA(nextMarketId);
      const [marketVaultPDA] = await this.getMarketVaultPDA(marketPDA);
      const [lpPositionPDA] = await this.getLPPositionPDA(marketPDA, userPublicKey);

      // Convert question to bytes
      const questionBytes = Buffer.alloc(200);
      Buffer.from(question.slice(0, 200)).copy(questionBytes);

      // Build the transaction
      const tx = await program.methods
        .createMarket(
          Array.from(questionBytes),
          new BN(initialLiquidity),
          new BN(closeTime)
        )
        .accounts({
          creator: userPublicKey,
          globalState: globalStatePDA,
          market: marketPDA,
          lpPosition: lpPositionPDA,
          marketVault: marketVaultPDA,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = userPublicKey;

      // Sign transaction with Privy
      const signedTx = await this.walletManager.signTransaction(userId, tx);

      // Send the signed transaction
      const signature = await this.connection.sendRawTransaction(signedTx.serialize());
      await this.connection.confirmTransaction(signature, 'confirmed');

      return { signature, marketId: nextMarketId };
    } catch (error) {
      console.error('Error creating market:', error);
      throw error;
    }
  }

  async resolveMarket(
    userId: string,
    marketId: number,
    outcome: boolean
  ): Promise<string> {
    try {
      // Get user wallet from Privy
      const wallet = await this.walletManager.getWallet(userId);
      if (!wallet) {
        throw new Error('Wallet not found for user');
      }
      const userPublicKey = new PublicKey(wallet.address);

      // Create a dummy keypair for provider
      const dummyKeypair = Keypair.generate();
      const provider = this.getProvider(dummyKeypair);
      const program = this.getProgram(provider);

      const [marketPDA] = await this.getMarketPDA(marketId);

      // Build the transaction
      const tx = await program.methods
        .resolveMarket(outcome)
        .accounts({
          market: marketPDA,
          resolver: userPublicKey,
        })
        .transaction();

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = userPublicKey;

      // Sign transaction with Privy
      const signedTx = await this.walletManager.signTransaction(userId, tx);

      // Send the signed transaction
      const signature = await this.connection.sendRawTransaction(signedTx.serialize());
      await this.connection.confirmTransaction(signature, 'confirmed');

      return signature;
    } catch (error) {
      console.error('Error resolving market:', error);
      throw error;
    }
  }

  async claimLPFees(
    userId: string,
    marketId: number
  ): Promise<string> {
    try {
      // Get user wallet from Privy
      const wallet = await this.walletManager.getWallet(userId);
      if (!wallet) {
        throw new Error('Wallet not found for user');
      }
      const userPublicKey = new PublicKey(wallet.address);

      // Create a dummy keypair for provider
      const dummyKeypair = Keypair.generate();
      const provider = this.getProvider(dummyKeypair);
      const program = this.getProgram(provider);

      const [marketPDA] = await this.getMarketPDA(marketId);
      const [marketVaultPDA] = await this.getMarketVaultPDA(marketPDA);
      const [lpPositionPDA] = await this.getLPPositionPDA(marketPDA, userPublicKey);

      // Build the transaction
      const tx = await program.methods
        .claimLpFees()
        .accounts({
          market: marketPDA,
          lpPosition: lpPositionPDA,
          marketVault: marketVaultPDA,
          creator: userPublicKey,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = userPublicKey;

      // Sign transaction with Privy
      const signedTx = await this.walletManager.signTransaction(userId, tx);

      // Send the signed transaction
      const signature = await this.connection.sendRawTransaction(signedTx.serialize());
      await this.connection.confirmTransaction(signature, 'confirmed');

      return signature;
    } catch (error) {
      console.error('Error claiming LP fees:', error);
      throw error;
    }
  }
}
