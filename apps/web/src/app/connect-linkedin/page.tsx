"use client";

import { useState, useEffect } from "react";

export default function ConnectLinkedInPage() {
  const [step, setStep] = useState<"passphrase" | "form" | "connecting" | "done">("passphrase");
  const [passphrase, setPassphrase] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handlePassphrase(e: React.FormEvent) {
    e.preventDefault();
    if (passphrase.trim().toLowerCase() === "crunched") {
      setStep("form");
      setError(null);
    } else {
      setError("Incorrect passphrase. Ask your team lead for access.");
    }
  }

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    setStep("connecting");
    setError(null);

    try {
      const res = await fetch("/api/unipile/public-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), passphrase: passphrase.trim() }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Failed to start connection. Try again.");
        setStep("form");
      }
    } catch {
      setError("Network error. Please try again.");
      setStep("form");
    }
  }

  // Check for callback result in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "1") {
      setStep("done");
    }
    if (params.get("connected") === "0") {
      setError(`Connection failed${params.get("reason") ? ` (${params.get("reason")})` : ""}. Please try again.`);
      setStep("form");
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl border border-[#E8E5E0] shadow-sm p-8">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-semibold text-[#1A1A18]">Connect LinkedIn</h1>
            <p className="text-sm text-[#6B6B65] mt-1">
              Link your LinkedIn account to show up on the team dashboard.
            </p>
          </div>

          {step === "passphrase" && (
            <form onSubmit={handlePassphrase} className="space-y-4">
              <div>
                <label htmlFor="passphrase" className="block text-sm font-medium text-[#3D3D38] mb-1">
                  Team passphrase
                </label>
                <input
                  id="passphrase"
                  type="text"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Enter passphrase"
                  autoFocus
                  className="w-full px-3 py-2 rounded-lg border border-[#E8E5E0] bg-white text-[#1A1A18] placeholder:text-[#B5B5AE] focus:outline-none focus:ring-2 focus:ring-[#6B9E78]/30 focus:border-[#6B9E78] text-sm"
                />
              </div>
              {error && <p className="text-sm text-[#B85C38]">{error}</p>}
              <button
                type="submit"
                className="w-full py-2.5 bg-[#6B9E78] text-white rounded-lg text-sm font-medium hover:bg-[#5A8A67] transition-colors"
              >
                Continue
              </button>
            </form>
          )}

          {step === "form" && (
            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[#3D3D38] mb-1">
                  Your name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jane Smith"
                  autoFocus
                  className="w-full px-3 py-2 rounded-lg border border-[#E8E5E0] bg-white text-[#1A1A18] placeholder:text-[#B5B5AE] focus:outline-none focus:ring-2 focus:ring-[#6B9E78]/30 focus:border-[#6B9E78] text-sm"
                />
              </div>
              {error && <p className="text-sm text-[#B85C38]">{error}</p>}
              <button
                type="submit"
                className="w-full py-2.5 bg-[#6B9E78] text-white rounded-lg text-sm font-medium hover:bg-[#5A8A67] transition-colors"
              >
                Connect LinkedIn
              </button>
            </form>
          )}

          {step === "connecting" && (
            <div className="text-center py-4">
              <p className="text-sm text-[#6B6B65]">Redirecting to LinkedIn...</p>
            </div>
          )}

          {step === "done" && (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 mx-auto bg-[#6B9E78]/10 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-[#6B9E78]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="space-y-1">
                <p className="text-base font-semibold text-[#1A1A18]">
                  Thanks for connecting!
                </p>
                <p className="text-sm text-[#6B6B65]">
                  Your LinkedIn posts will start appearing on the team dashboard shortly.
                </p>
              </div>
              <div className="pt-3 border-t border-[#E8E5E0]">
                <p className="text-sm text-[#6B6B65] mb-3">
                  Want to track the team&apos;s building-in-public progress? Sign up for a dashboard account with your Granola email.
                </p>
                <a
                  href="/auth/signin"
                  className="inline-block w-full py-2.5 bg-[#1A1A18] text-white rounded-lg text-sm font-medium hover:bg-[#3D3D38] transition-colors text-center"
                >
                  Sign up for the dashboard
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
