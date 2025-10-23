"use client";

import { useEffect, useState } from "react";
import { varaPaymentHeader, DemoAccount } from '@/lib/varaPaymentHeader';
import { PaymentRequiredResponse, PaymentRequirements } from '@/lib/x402-protocol-types';
import { formatBalance } from '@polkadot/util';
import { useApi, balanceOf } from 'x402-vara/utils';
import { useAccount } from '@gear-js/react-hooks';
import dynamic from 'next/dynamic';

const Wallet = dynamic(() => import('@gear-js/wallet-connect').then((mod) => mod.Wallet), {
  ssr: false,
});

function AccountInfo() {
  const { wallets, account, isAnyWallet, isAccountReady, login, logout } = useAccount();

  const network = 'vara-testnet';

  const [address, setAddress] = useState<string>("");
  const [formattedAmount, setFormattedAmount] = useState<string>("loading...");
  const [formattedTokenAmount, setFormattedTokenAmount] = useState<string>("loading...");

  useEffect(() => {
    (async () => {
      let acc: any = account;
      if (!account) {
        acc = await DemoAccount();
      }
      setAddress(acc?.address);
    })()
  }, [account]);

  useEffect(() => {
    const fetchFormattedAmount = async () => {
      const asset : any = undefined;
      const extra : any = undefined;
      if (!address) {
        return;
      }
      setFormattedAmount("loading...");
      const api = await useApi(network);
      const amount = await balanceOf(api, address, asset);
      const decimals = asset ? (extra as any)?.decimals : api.registry.chainDecimals[0];
      const unit = asset ? (extra as any)?.name : api.registry.chainTokens[0];
      const formatOptions = {
        decimals,
        withSiFull: true,
        withZero: false,
        withUnit: unit,
        forceUnit: '0',
      };
      const formatted = formatBalanceDisplay(amount.toString(), formatOptions);
      setFormattedAmount(formatted);
    };

    const fetchFormattedTokenAmount = async () => {
      const asset : any = '0x64f9def5a6da5a2a847812d615151a88f8c508e062654885267339a8bf29e52f';
      const extra : any = {
        name: 'WUSDC',
        decimals: 6,
      };
      if (!address) {
        return;
      }
      setFormattedTokenAmount("loading...");
      const api = await useApi(network);
      const amount = await balanceOf(api, address, asset);
      const decimals = asset ? (extra as any)?.decimals : api.registry.chainDecimals[0];
      const unit = asset ? (extra as any)?.name : api.registry.chainTokens[0];
      const formatOptions = {
        decimals,
        withSiFull: true,
        withZero: false,
        withUnit: unit,
        forceUnit: '0',
      };
      const formatted = formatBalanceDisplay(amount.toString(), formatOptions);
      setFormattedTokenAmount(formatted);
    };

    fetchFormattedAmount();
    fetchFormattedTokenAmount();
  }, [network, address]);

  if (!isAccountReady) return <div>Loading wallets...</div>;

  return (
    <div>
      <br/>

      <p className="text-gray-700">
        <strong>Wallet information:</strong>
      </p>

      {!account && (<p className="text-gray-700 mb-4 text-sm">
        The embedded demo wallet is used as no user wallet is connected.
      </p>)}

      <div className="mb-4 p-3 bg-white border border-gray-300 rounded text-sm">
        <p className="text-gray-700 mb-4 text-sm">
          <strong>Address: </strong>
          {`${address.slice(0, 10)}...` || 'None'}
        </p>
        <p className="text-gray-700 mb-4 text-sm">
          <strong>Native balance: </strong>
          {formattedAmount}
        </p>
        <p className="text-gray-700 mb-4 text-sm">
          <strong>VFT balance: </strong>
          {formattedTokenAmount}
        </p>
      </div>
    </div>
  );
}

const formatBalanceDisplay = (balance: string | undefined, options: any = {}) => {
  if (!balance) return "N/A";
  return formatBalance(balance, options);
}

const PaymentDetailsCard = ({ accept }: { accept: PaymentRequirements }) => {
  const { network, maxAmountRequired, payTo, scheme, asset, extra } = accept;
  const [formattedAmount, setFormattedAmount] = useState<string>("loading...");

  useEffect(() => {
    const fetchFormattedAmount = async () => {
      const api = await useApi(network);
      const decimals = asset ? (extra as any)?.decimals : api.registry.chainDecimals[0];
      const unit = asset ? (extra as any)?.name : api.registry.chainTokens[0];
      const formatOptions = {
        decimals,
        withSiFull: true,
        withZero: false,
        withUnit: unit,
        forceUnit: '0',
      };
      const formatted = formatBalanceDisplay(maxAmountRequired, formatOptions);
      setFormattedAmount(formatted);
    };

    fetchFormattedAmount();
  }, [network, maxAmountRequired]);

  return (
    <div className="text-sm">
      <p className="text-gray-700">
        <strong>Price:</strong> {formattedAmount}
      </p>
      <p className="text-gray-700">
        <strong>Recipient:</strong> {payTo ? `${payTo.slice(0, 10)}...` : "N/A"}
      </p>
      <p className="text-gray-700">
        <strong>Scheme:</strong> {scheme || "N/A"}
      </p>
    </div>
  );
};

const PaymentDetailsList = ({
  paymentDetails,
  selectedIndex,
  setSelectedIndex
}: {
  paymentDetails: PaymentRequiredResponse | null;
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
}) => {
  if (!paymentDetails?.accepts?.length) {
    return (
      <div className="mb-4 p-3 bg-white border border-gray-300 rounded text-sm">
        <p className="text-gray-700">
          <strong>Error:</strong> no payment requirements found
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {paymentDetails.accepts.map((accept, index) => (
        <label
          key={index}
          className={`flex items-start gap-3 p-3 border rounded cursor-pointer transition ${
            selectedIndex === index
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 bg-white hover:bg-gray-50"
          }`}
        >
          <input
            type="radio"
            name="paymentOption"
            checked={selectedIndex === index}
            onChange={() => setSelectedIndex(index)}
            className="mt-1"
          />
          <div className="flex-1">
            <PaymentDetailsCard accept={accept} />
          </div>
        </label>
      ))}
    </div>
  );
};

export default function Home() {
  const { wallets, account, isAnyWallet, isAccountReady, login, logout } = useAccount();

  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [step, setStep] = useState<"initial" | "payment-required" | "success">("initial");
  const [paymentDetails, setPaymentDetails] = useState<PaymentRequiredResponse | null>(null);
  const [timing, setTiming] = useState<any>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const requestWithoutPayment = async () => {
    setLoading(true);
    setResponse(null);
    setTiming(null);

    try {
      const requestHeaders: Record<string, string> = {};
      
      const startTime = performance.now();
      const res = await fetch("/api/protected/weather");
      const endTime = performance.now();
      const totalTime = Math.round(endTime - startTime);
      
      const data = await res.json();

      setResponse({
        status: res.status,
        statusText: res.statusText,
        requestHeaders,
        responseHeaders: Object.fromEntries(res.headers.entries()),
        body: data,
      });

      setTiming({
        total: totalTime,
      });

      if (res.status === 402) {
        setStep("payment-required");
        setPaymentDetails(data as PaymentRequiredResponse);
      }
    } catch (err) {
      setResponse({ error: String(err) });
    } finally {
      setLoading(false);
    }
  };

  const requestWithPayment = async () => {
    setLoading(true);
    setResponse(null);
    setTiming(null);

    try {
      if (!paymentDetails) {
        throw new Error("No payment details available");
      }

      const demoAccount = await DemoAccount();
      const acc = account ?? demoAccount;

      const paymentHeader = await varaPaymentHeader(paymentDetails, acc, selectedIndex);

      // Make request with X-PAYMENT header (per x402 spec)
      const requestHeaders = {
        "X-PAYMENT": paymentHeader,
      };
      
      const startTime = performance.now();
      const res = await fetch("/api/protected/weather", {
        headers: requestHeaders,
      });
      const endTime = performance.now();
      const totalTime = Math.round(endTime - startTime);

      const data = await res.json();

      // Extract timing headers if present
      const verificationTime = res.headers.get('x-verification-time');
      const settlementTime = res.headers.get('x-settlement-time');

      setResponse({
        status: res.status,
        statusText: res.statusText,
        requestHeaders: {
          "X-PAYMENT": `${paymentHeader.substring(0, 50)}... (${paymentHeader.length} chars)`
        },
        responseHeaders: Object.fromEntries(res.headers.entries()),
        body: data,
      });

      setTiming({
        total: totalTime,
        verification: verificationTime ? parseInt(verificationTime) : null,
        settlement: settlementTime ? parseInt(settlementTime) : null,
      });

      if (res.ok) {
        setStep("success");
      }
    } catch (err: any) {
      setResponse({ error: err.message || String(err) });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep("initial");
    setResponse(null);
    setPaymentDetails(null);
    setTiming(null);
  };

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-7xl mx-auto">
	<div className="flex justify-end mb-4">
	  <Wallet />
	</div>
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-black mb-2">
            x402 Payment Protocol Demo
          </h1>
          <p className="text-gray-700">HTTP 402 on Vara Network</p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left: Response Display */}
          <div className="bg-gray-50 border border-black rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-black">
              API Response
            </h2>
            
                    {response ? (
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-gray-700 mb-1">Status:</p>
                          <p className="font-mono text-black font-semibold">
                            {response.status} {response.statusText}
                          </p>
                        </div>

                        {timing && (
                          <div>
                            <p className="text-sm text-gray-700 mb-1">Response Time:</p>
                            <div className="bg-white border border-gray-300 p-3 rounded text-sm space-y-1">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Total:</span>
                                <span className="font-mono font-semibold text-black">{timing.total}ms</span>
                              </div>
                              {timing.verification && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">↳ Verification:</span>
                                  <span className="font-mono text-gray-700">{timing.verification}ms</span>
                                </div>
                              )}
                              {timing.settlement && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">↳ Settlement:</span>
                                  <span className="font-mono text-gray-700">{timing.settlement}ms</span>
                                </div>
                              )}
                              {timing.verification && timing.settlement && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">↳ API Processing:</span>
                                  <span className="font-mono text-gray-700">
                                    {timing.total - timing.verification - timing.settlement}ms
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {response.responseHeaders && (
                          <div>
                            <p className="text-sm text-gray-700 mb-1">Response Headers:</p>
                            <pre className="bg-black text-white p-3 rounded text-xs overflow-x-auto">
                              {JSON.stringify(response.responseHeaders, null, 2)}
                            </pre>
                          </div>
                        )}

                        <div>
                          <p className="text-sm text-gray-700 mb-1">Response Body:</p>
                          <pre className="bg-black text-white p-3 rounded text-xs overflow-x-auto">
                            {JSON.stringify(response.body || response.error, null, 2)}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-12">
                        No response yet. Make a request to see the response here.
                      </p>
                    )}
          </div>

          {/* Right: Action Prompts */}
          <div className="space-y-6">
            {/* Step 1: Request without payment */}
            {step === "initial" && (
              <div className="bg-gray-50 border border-black rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-3 text-black">
                  Step 1: Request Protected Resource
                </h2>
                <p className="text-gray-700 mb-4 text-sm">
                  Make a GET request to the weather API without any payment header.
                </p>
                <br/>
                <button
                  onClick={requestWithoutPayment}
                  disabled={loading}
                  className="w-full bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Loading..." : "Request Weather API →"}
                </button>
              </div>
            )}

            {/* Step 2: Request with payment */}
            {step === "payment-required" && (
              <div className="bg-gray-50 border border-black rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-3 text-black">
                  Step 2: Pay and Retry
                </h2>
                <p className="text-gray-700 mb-4 text-sm">
                  The API returned 402 Payment Required. Now retry the request with a signed payment transaction.
                </p>
                
                <AccountInfo />

                {paymentDetails && (
		  <>
		    <p className="text-gray-700">
		      <strong>Payment options:</strong>
		    </p>

		    <div className="mb-4 p-3 bg-white border border-gray-300 rounded text-sm">
		      <PaymentDetailsList
			paymentDetails={paymentDetails}
			selectedIndex={selectedIndex}
			setSelectedIndex={setSelectedIndex}
		      />
		    </div>
		  </>
                )}

                <button
                  onClick={requestWithPayment}
                  disabled={loading || !paymentDetails?.accepts?.length}
                  className="w-full bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Processing Payment..." : "Send Payment & Retry →"}
                </button>
              </div>
            )}

            {/* Step 3: Success */}
            {step === "success" && (
              <div className="bg-gray-50 border border-black rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-3 text-black">
                  ✓ Payment Successful
                </h2>
                <p className="text-gray-700 mb-4 text-sm">
                  Payment verified and settled. The protected resource has been delivered.
                </p>
                <br/>
                <button
                  onClick={reset}
                  className="w-full bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800"
                >
                  Start Over →
                </button>
              </div>
            )}

            {/* Request Headers Box */}
            {response && response.requestHeaders && Object.keys(response.requestHeaders).length > 0 && (
              <div className="bg-gray-50 border border-black rounded-lg p-6">
                <h3 className="font-semibold mb-2 text-black text-sm">
                  Request Headers:
                </h3>
                <pre className="bg-black text-white p-3 rounded text-xs overflow-x-auto">
                  {JSON.stringify(response.requestHeaders, null, 2)}
                </pre>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-gray-50 border border-black rounded-lg p-6">
              <h3 className="font-semibold mb-2 text-black text-sm">
                How it works:
              </h3>
              <ol className="list-decimal list-inside space-y-1 text-xs text-gray-700">
                <li>Request resource without payment</li>
                <li>Server returns 402 with payment details</li>
                <li>Client signs payment transaction</li>
                <li>Client retries with X-PAYMENT header</li>
                <li>Server verifies and settles payment</li>
                <li>Server returns protected resource</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

