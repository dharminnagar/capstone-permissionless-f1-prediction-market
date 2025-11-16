import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function initialize() {
  try {
    console.log('🔧 Initializing F1 Prediction Market Program...\n');

    // Setup connection
    const connection = new anchor.web3.Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    );

    // Load wallet
    const walletPath = path.join(process.env.HOME!, '.config/solana/id.json');
    const walletKeypair = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
    );

    const wallet = new anchor.Wallet(walletKeypair);
    const provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    });

    // Load program
    const programId = new PublicKey(process.env.PROGRAM_ID!);
    const idlPath = path.join(__dirname, '../src/idl.json');
    const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));
    const program = new Program(idl, provider);

    console.log('📡 RPC:', connection.rpcEndpoint);
    console.log('🔑 Program ID:', programId.toString());
    console.log('👤 Admin:', wallet.publicKey.toString());
    console.log('');

    // Derive global state PDA
    const [globalStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('global_state')],
      programId
    );

    // Check if already initialized
    try {
      const globalState = await program.account.globalState.fetch(globalStatePda);
      console.log('✅ Program already initialized!');
      console.log('📊 Market counter:', globalState.marketCounter.toString());
      console.log('💰 Fee rate:', globalState.feeRate, 'basis points');
      console.log('🏦 Treasury:', globalState.protocolTreasury.toString());
      return;
    } catch (error) {
      console.log('🆕 Program not initialized yet, proceeding...\n');
    }

    // Create protocol treasury
    const protocolTreasury = wallet.publicKey; // Use admin as treasury for simplicity

    // Initialize
    const feeRate = 200; // 2%
    
    console.log('🚀 Sending initialize transaction...');
    const tx = await program.methods
      .initialize(feeRate)
      .accounts({
        admin: wallet.publicKey,
        globalState: globalStatePda,
        protocolTreasury: protocolTreasury,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log('✅ Initialization successful!');
    console.log('📝 TX:', tx);
    console.log('🔗 Explorer:', `https://explorer.solana.com/tx/${tx}?cluster=devnet`);
    console.log('');

    // Fetch and display state
    const globalState = await program.account.globalState.fetch(globalStatePda);
    console.log('📊 Program State:');
    console.log('   Market counter:', globalState.marketCounter.toString());
    console.log('   Fee rate:', globalState.feeRate, 'basis points (2%)');
    console.log('   Treasury:', globalState.protocolTreasury.toString());
    console.log('   Admin:', globalState.admin.toString());
    console.log('');
    console.log('✅ Program is ready to use!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

initialize();
