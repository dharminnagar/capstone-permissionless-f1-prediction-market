#!/usr/bin/env ts-node
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import * as fs from 'fs';
import * as path from 'path';

async function initialize() {
  console.log('🔧 Initializing F1 Prediction Market Program...\n');

  // Setup provider from Anchor.toml
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Load program
  const program = anchor.workspace.CapstonePredictionMarket as anchor.Program;
  const programId = program.programId;

  console.log('📡 RPC:', provider.connection.rpcEndpoint);
  console.log('🔑 Program ID:', programId.toString());
  console.log('👤 Admin:', provider.wallet.publicKey.toString());
  console.log('');

  // Derive global state PDA
  const [globalStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from('global_state')],
    programId
  );

  // Check if already initialized
  try {
    const globalState = await (program.account as any).globalState.fetch(globalStatePda);
    console.log('✅ Program already initialized!');
    console.log('📊 Market counter:', globalState.marketCounter.toString());
    console.log('💰 Fee rate:', globalState.feeRate, 'basis points');
    console.log('🏦 Treasury:', globalState.protocolTreasury.toString());
    return;
  } catch (error) {
    console.log('🆕 Program not initialized yet, proceeding...\n');
  }

  // Use admin as treasury for simplicity
  const protocolTreasury = provider.wallet.publicKey;
  const feeRate = 200; // 2%

  console.log('🚀 Sending initialize transaction...');
  
  try {
    const tx = await program.methods
      .initialize(feeRate)
      .accounts({
        admin: provider.wallet.publicKey,
        protocolTreasury: protocolTreasury,
      })
      .rpc();

    console.log('✅ Initialization successful!');
    console.log('📝 TX:', tx);
    console.log('🔗 Explorer:', `https://explorer.solana.com/tx/${tx}?cluster=devnet`);
    console.log('');

    // Fetch and display state
    const globalState = await (program.account as any).globalState.fetch(globalStatePda);
    console.log('📊 Program State:');
    console.log('   Market counter:', globalState.marketCounter.toString());
    console.log('   Fee rate:', globalState.feeRate, 'basis points (2%)');
    console.log('   Treasury:', globalState.protocolTreasury.toString());
    console.log('   Admin:', globalState.admin.toString());
    console.log('');
    console.log('✅ Program is ready to use!');
    console.log('');
    console.log('💡 Next: Start the Telegram bot with: cd telegram-bot && npm start');
  } catch (error: any) {
    console.error('❌ Initialization failed:', error.message);
    if (error.logs) {
      console.log('\nProgram logs:');
      error.logs.forEach((log: string) => console.log('  ', log));
    }
    process.exit(1);
  }
}

initialize();
