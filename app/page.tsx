"use client";

import { useState } from "react";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<any>(null);

  const checkAgentStatus = async () => {
    try {
      const response = await fetch("/api/test-agent");
      const data = await response.json();
      setAgentStatus(data);
    } catch (err) {
      console.error("Error checking agent status:", err);
    }
  };

  const runAgent = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/test-agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: "Fetch weather data from the protected API",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to run agent");
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
      checkAgentStatus();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Aptos x402 Protocol
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            HTTP 402 Payment Required on Aptos Blockchain
          </p>
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="text-3xl mb-2">🔒</div>
            <h3 className="font-semibold mb-2 text-slate-900 dark:text-white">
              Protected APIs
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              APIs return 402 when payment is required
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="text-3xl mb-2">⛓️</div>
            <h3 className="font-semibold mb-2 text-slate-900 dark:text-white">
              Aptos Blockchain
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              On-chain payment verification
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="text-3xl mb-2">🤖</div>
            <h3 className="font-semibold mb-2 text-slate-900 dark:text-white">
              AI Agent
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Automatically handles payment flow
            </p>
          </div>
        </div>

        {/* Agent Status */}
        {agentStatus && (
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg mb-8 border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">
              Agent Status
            </h2>
            {agentStatus.configured ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">
                    Address:
                  </span>
                  <span className="font-mono text-xs text-slate-900 dark:text-white">
                    {agentStatus.agentAddress}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">
                    Balance:
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {agentStatus.balance} {agentStatus.currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">
                    Network:
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {agentStatus.network}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">
                    LLM API:
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {agentStatus.hasApiKey ? "✅ Configured" : "❌ Not configured"}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-slate-600 dark:text-slate-400">
                Agent not configured. Please set up your .env file.
              </p>
            )}
          </div>
        )}

        {/* Main Demo Card */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-8 shadow-lg border border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-semibold mb-4 text-slate-900 dark:text-white">
            Demo: AI Agent with x402 Payment
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            This demo shows an AI agent that automatically handles the x402 payment flow (per official spec):
          </p>

          <div className="mb-6 space-y-2">
            <div className="flex items-start gap-3">
              <span className="text-blue-600 dark:text-blue-400 font-bold">1.</span>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Client requests protected resource
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-600 dark:text-blue-400 font-bold">2.</span>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Server responds 402 + payment requirements
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-600 dark:text-blue-400 font-bold">3.</span>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Client prepares signed payment payload
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-600 dark:text-blue-400 font-bold">4.</span>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Client resubmits with X-PAYMENT header
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-600 dark:text-blue-400 font-bold">5.</span>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Server verifies & settles payment
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-600 dark:text-blue-400 font-bold">6.</span>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Server returns resource ✅
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={checkAgentStatus}
              className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
            >
              Check Status
            </button>
            <button
              onClick={runAgent}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Running Agent..." : "Run Demo Agent"}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h3 className="text-red-900 dark:text-red-200 font-semibold mb-2">
              Error
            </h3>
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Result Display */}
        {result && (
          <div className="mt-8 bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg border border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-semibold mb-4 text-green-600 dark:text-green-400">
              ✅ Success!
            </h3>

            {/* Payment Info */}
            {result.payment && (
              <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <h4 className="font-semibold mb-3 text-slate-900 dark:text-white">
                  Payment Summary
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">
                      Amount Spent:
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {result.payment.spent} {result.payment.currency}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">
                      Initial Balance:
                    </span>
                    <span className="font-mono text-xs text-slate-900 dark:text-white">
                      {result.payment.initialBalance} APT
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">
                      Final Balance:
                    </span>
                    <span className="font-mono text-xs text-slate-900 dark:text-white">
                      {result.payment.finalBalance} APT
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Weather Data */}
            {result.result?.data && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-semibold mb-3 text-slate-900 dark:text-white">
                  Weather Data Retrieved
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">
                      Location:
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {result.result.data.location}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">
                      Temperature:
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {result.result.data.temperature}°F
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">
                      Conditions:
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {result.result.data.conditions}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Setup Guide */}
        <div className="mt-8 bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg border border-slate-200 dark:border-slate-700">
          <h3 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">
            Setup Guide
          </h3>
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
            <p>
              <strong className="text-slate-900 dark:text-white">1.</strong> Copy{" "}
              <code className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs font-mono">
                .env.example
              </code>{" "}
              to{" "}
              <code className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs font-mono">
                .env
              </code>
            </p>
            <p>
              <strong className="text-slate-900 dark:text-white">2.</strong> Add your Aptos
              private keys and addresses
            </p>
            <p>
              <strong className="text-slate-900 dark:text-white">3.</strong> Add your Google
              Gemini API key
            </p>
            <p>
              <strong className="text-slate-900 dark:text-white">4.</strong> Fund your agent
              account with testnet APT from{" "}
              <a
                href="https://aptoslabs.com/testnet-faucet"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Aptos Faucet
              </a>
            </p>
            <p>
              <strong className="text-slate-900 dark:text-white">5.</strong> Run{" "}
              <code className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs font-mono">
                npm install
              </code>{" "}
              to install dependencies
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
