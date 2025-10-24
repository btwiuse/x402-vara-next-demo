import { PaymentRequirements, PaymentPayload } from 'x402-vara/lib';
import { useApi, createUnsignedTransaction } from 'x402-vara/utils';
import { u8aToHex } from '@polkadot/util'
import { decodeAddress } from '@polkadot/util-crypto'
import { VftProgram } from 'x402-vara/lib'
import { signWithKeypair } from 'x402-vara/client';
import type { WalletKeypair } from 'x402-vara';

export function buildTransferTx(api: any, paymentReqs: PaymentRequirements) {
  const { asset, payTo, maxAmountRequired } = paymentReqs;
  if (!asset) {
    return api.tx.balances.transferKeepAlive(payTo, maxAmountRequired);
  }
  const vft = new VftProgram(api, asset);
  const txBuilder = vft.vft.transfer(u8aToHex(decodeAddress(payTo)), maxAmountRequired);
  txBuilder.withGas('max');
  return txBuilder.extrinsic;
}

export async function paymentHeader(paymentReqs: PaymentRequirements, account: WalletKeypair, signWith = signWithKeypair) {
  // Initialize API client
  const api = await useApi(paymentReqs.network);

  // Build transaction
  const tx = buildTransferTx(api, paymentReqs);

  // Get PayloadJSON
  const unsignedTransaction = await createUnsignedTransaction(api, account.address, tx);

  // Get signature
  const { signature } = await signWith(account, unsignedTransaction, api);

  // Serialize transaction and signature separately
  const signedTxPayload = {
    signature: signature,
    transaction: unsignedTransaction,
  };

  console.log("Transaction and signature:", signedTxPayload);

  // Create x402 PaymentPayload per official spec
  const paymentPayload : PaymentPayload = {
    x402Version: 1,
    scheme: "exact",
    asset: paymentReqs.asset,
    network: paymentReqs.network || "vara-testnet",
    payload: signedTxPayload,
  };

  // Base64 encode the PaymentPayload JSON for X-PAYMENT header
  const paymentHeader = Buffer.from(JSON.stringify(paymentPayload)).toString(
    "base64",
  );

  console.log("x402 Payment Payload:", {
    x402Version: paymentPayload.x402Version,
    scheme: paymentPayload.scheme,
    asset: paymentReqs.asset,
    network: paymentPayload.network,
    sender: unsignedTransaction.address,
    // hasSignature: !!signedTxPayload.signature,
    // hasTransaction: !!signedTxPayload.transaction,
    // signatureLength: signedTxPayload.signature?.length,
    // txLength: signedTxPayload.transaction?.length,
    headerLength: paymentHeader.length,
  });

  return paymentHeader;
}
