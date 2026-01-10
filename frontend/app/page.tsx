'use client';

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 py-20">
        <div className="max-w-6xl mx-auto text-center">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <img src="/logo.png" alt="Movecast Logo" className="h-24 w-auto" />
          </div>
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#097A7B]/30 bg-[#097A7B]/10">
            <div className="w-2 h-2 rounded-full bg-[#097A7B] glow" />
            <span className="text-sm font-medium text-[#CCCCCC]">Movecast Raycast</span>
          </div>

          {/* Main heading */}
          <h1 className="text-6xl md:text-8xl font-bold mb-6">
            <span className="gradient-text block">Movement</span>
            <span className="text-white block mt-2">at your</span>
            <span className="text-[#097A7B] block mt-2">Command Bar</span>
          </h1>

          {/* Subheading */}
          <p className="text-xl md:text-2xl text-[#CCCCCC]/80 max-w-3xl mx-auto mb-8">
            Your shortcut to everything Movement.{' '}
            <span className="text-white font-medium">At your command bar.</span>
          </p>

          {/* Platform badges */}
          <div className="flex items-center justify-center gap-4 mb-12 text-sm text-[#CCCCCC]/60">
            <span>on</span>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              <span>mac</span>
            </div>
            <span>and</span>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              <span>windows</span>
            </div>
          </div>

          {/* CTA Button */}
          <a href="https://github.com/Nishu0/movecast" target="_blank" rel="noopener noreferrer" className="inline-block px-8 py-4 bg-[#097A7B] hover:bg-[#0ac5c7] text-white font-semibold rounded-xl transition-all duration-300 glow hover:glow-intense transform hover:scale-105">
            Install Extension
          </a>

          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-[#CCCCCC]/50">
            <span className="kbd">⌘</span>
            <span className="kbd">Space</span>
            <span>to open Raycast</span>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-5xl font-bold text-center mb-16">
            <span className="gradient-text">Lightning Fast DeFi</span>
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="glass-card p-8">
              <div className="w-12 h-12 rounded-xl bg-[#097A7B]/20 border border-[#097A7B]/40 flex items-center justify-center mb-6">
                <span className="text-2xl">💬</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">AI Chat</h3>
              <p className="text-[#CCCCCC]/70 mb-4">
                Ask anything in natural language. Type{' '}
                <code className="text-[#097A7B]">@movecast-ai</code> and get instant answers.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-card p-8">
              <div className="w-12 h-12 rounded-xl bg-[#097A7B]/20 border border-[#097A7B]/40 flex items-center justify-center mb-6">
                <span className="text-2xl">💼</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Portfolio</h3>
              <p className="text-[#CCCCCC]/70 mb-4">
                View tokens, balances, and values instantly. Real-time prices from Pyth oracles.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-card p-8">
              <div className="w-12 h-12 rounded-xl bg-[#097A7B]/20 border border-[#097A7B]/40 flex items-center justify-center mb-6">
                <span className="text-2xl">🏦</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">DeFi Protocols</h3>
              <p className="text-[#CCCCCC]/70 mb-4">
                Access Joule, Meridian, and Echelon. Lend, borrow, swap in seconds.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="glass-card p-8">
              <div className="w-12 h-12 rounded-xl bg-[#097A7B]/20 border border-[#097A7B]/40 flex items-center justify-center mb-6">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Lightning Fast</h3>
              <p className="text-[#CCCCCC]/70 mb-4">
                Execute trades in seconds. No browser, no friction. Just pure speed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl font-bold text-center mb-16">
            <span className="text-white">Just type </span>
            <span className="gradient-text">@movecast-ai</span>
          </h2>

          <div className="space-y-6">
            <div className="glass-card p-6 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#097A7B]/20 border border-[#097A7B] flex items-center justify-center flex-shrink-0">
                <span className="text-[#097A7B] font-bold">1</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Open Raycast</h3>
                <p className="text-[#CCCCCC]/70">
                  Press <span className="kbd">⌘</span> + <span className="kbd">Space</span> anywhere on your Mac
                </p>
              </div>
            </div>

            <div className="glass-card p-6 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#097A7B]/20 border border-[#097A7B] flex items-center justify-center flex-shrink-0">
                <span className="text-[#097A7B] font-bold">2</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Type your question</h3>
                <p className="text-[#CCCCCC]/70">
                  Use natural language: &quot;lend 10 MOVE to Joule&quot; or &quot;what&apos;s my portfolio?&quot;
                </p>
              </div>
            </div>

            <div className="glass-card p-6 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#097A7B]/20 border border-[#097A7B] flex items-center justify-center flex-shrink-0 glow">
                <span className="text-[#097A7B] font-bold">3</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Get instant results</h3>
                <p className="text-[#CCCCCC]/70">
                  AI understands, executes, and formats the response. No clicking, no waiting.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="glass-card p-16">
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="gradient-text">Ready to Move?</span>
            </h2>
            <p className="text-xl text-[#CCCCCC]/80 mb-10">
              Join the future of command-bar DeFi on Movement blockchain
            </p>
            <a href="https://github.com/Nishu0/movecast" target="_blank" rel="noopener noreferrer" className="inline-block px-10 py-5 bg-[#097A7B] hover:bg-[#0ac5c7] text-white text-lg font-semibold rounded-xl transition-all duration-300 glow hover:glow-intense transform hover:scale-105">
              Install Movecast Extension
            </a>
            <p className="mt-6 text-sm text-[#CCCCCC]/50">
              Free • Open Source • Movement Network
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Movecast Logo" className="h-8 w-auto" />
            <span className="text-white font-semibold text-lg">MOVECAST</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-[#CCCCCC]/60">
            <a href="https://github.com/Nishu0/movecast" target="_blank" rel="noopener noreferrer" className="hover:text-[#097A7B] transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
