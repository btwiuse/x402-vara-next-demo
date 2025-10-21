import { NextRequest, NextResponse } from "next/server";
import type {
  PaymentPayload,
  VerifyRequest,
  VerifyResponse,
} from "@/lib/x402-protocol-types";
import {
  validVaraNetworks,
  X402_SCHEME,
  X402_VERSION,
} from "@/lib/x402-protocol-types";
import { useApi } from "x402-vara/utils";
import { verifyWithApi } from "x402-vara/server";
import { hexToU8a, u8aToHex } from "@polkadot/util";
import { decodeAddress } from "@polkadot/util-crypto";
import { VftProgram } from "@/lib/vft";

export function pubkeyOf(addr: string): `0x${string}` {
  if (addr.startsWith("0x")) {
    return addr as `0x${string}`;
  }
  return u8aToHex(decodeAddress(addr));
}

export async function balanceOf(
  api: any,
  address: string,
  asset?: `0x${string}`,
): Promise<bigint> {
  if (asset) {
    const pubkey = pubkeyOf(address);
    const vft = new VftProgram(api, asset);
    const vftBalance = await vft.vft.balanceOf(pubkey).call();
    return vftBalance;
  } else {
    const { data } = await api.query.system.account(address);
    const freeBalance = data.free.toBigInt();
    return freeBalance;
  }
}
