'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppShell } from '@/components/layout/AppShell';
import { crashApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useTelegram } from '@/hooks/useTelegram';
import { formatCoins, cn } from '@/lib/utils';
import { CoinIcon } from '@/components/ui/CoinIcon';
import toast from 'react-hot-toast';

type GamePhase = 'betting' | 'playing' | 'crashed' | 'won' | 'lost';

export default function CrashPage() {
  const { user, refreshUser } = useAuthStore();
  const { haptic } = useTelegram();
  const [betAmount, setBetAmount] = useState(100);
  const [autoCashOut, setAutoCashOut] = useState<number | undefined>(undefined);
  const [phase, setPhase] = useState<GamePhase>('betting');
  const [multiplier, setMultiplier] = useState(1.0);
  const [roundId, setRoundId] = useState<string | null>(null);
  const [crashPoint, setCrashPoint] = useState<number | null>(null);
  const [result, setResult] = useState<{ won: boolean; payout?: number } | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const intervalRef = useRef<NodeJS.Timeout>();
  const startRef = useRef<number>(0);

  useEffect(() => {
    crashApi.getHistory().then((data: any) => {
      setHistory((data || []).map((r: any) => Number(r.crashPoint)).slice(0, 10));
    });
    return () => clearInterval(intervalRef.current);
  }, []);

  const startGame = async () => {
    if (phase !== 'betting') return;
    const balance = Number(user?.wallet?.balance || 0);
    if (betAmount > balance) { toast.error('Insufficient balance!'); haptic.error(); return; }
    if (betAmount < 10) { toast.error('Minimum bet is 10'); return; }

    haptic.medium();
    try {
      const result = await crashApi.placeBet(betAmount, autoCashOut);
      const data = result as any;
      setRoundId(data.roundId);
      setCrashPoint(data.crashPoint);
      setPhase('playing');
      setMultiplier(1.0);
      startRef.current = Date.now();

      intervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startRef.current) / 1000;
        const current = Math.pow(Math.E, 0.1 * elapsed) * 1.0;
        setMultiplier(Math.round(current * 100) / 100);
      }, 50);

      // Simulate crash timing
      const crashAt = data.crashPoint;
      const timeTocrash = Math.log(crashAt) / 0.1 * 1000;
      setTimeout(() => {
        clearInterval(intervalRef.current);
        if (data.willWin && data.cashOutAt) {
          handleCashOut(data.cashOutAt);
        } else {
          setMultiplier(crashAt);
          setPhase('crashed');
          setHistory((prev) => [crashAt, ...prev.slice(0, 9)]);
          haptic.error();
          setTimeout(() => { setPhase('betting'); setResult(null); }, 2000);
        }
        refreshUser();
      }, timeTocrash);
    } catch (err: any) {
      toast.error(err.message);
      haptic.error();
    }
  };

  const handleCashOut = async (overrideMultiplier?: number) => {
    if (phase !== 'playing' || !roundId) return;
    clearInterval(intervalRef.current);
    const cashOutMultiplier = overrideMultiplier || multiplier;
    haptic.success();

    try {
      const res = await crashApi.cashOut(roundId, cashOutMultiplier);
      const data = res as any;
      setResult({ won: data.won, payout: data.payout });
      setPhase(data.won ? 'won' : 'lost');
      if (data.won) toast.success(`Cashed out at ${cashOutMultiplier}x! +${formatCoins(data.payout)}`);
      refreshUser();
      setTimeout(() => { setPhase('betting'); setResult(null); }, 2000);
    } catch {}
  };

  const balance = Number(user?.wallet?.balance || 0);

  return (
    <AppShell title="CRASH">
      <div className="px-4 py-4 space-y-4">

        {/* History */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {history.map((h, i) => (
            <div key={i} className={cn(
              'flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold',
              h < 1.5 ? 'bg-red-500/20 text-red-400' :
              h < 3 ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-green-500/20 text-green-400'
            )}>
              {h.toFixed(2)}x
            </div>
          ))}
        </div>

        {/* Game display */}
        <div className="card-glow relative h-64 flex items-center justify-center overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-t from-violet-950/50 to-transparent" />

          <AnimatePresence mode="wait">
            {phase === 'betting' && (
              <motion.div key="betting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center z-10">
                <div className="text-6xl mb-2">🚀</div>
                <p className="text-white/40">Place your bet to start</p>
              </motion.div>
            )}
            {(phase === 'playing' || phase === 'crashed' || phase === 'won') && (
              <motion.div key="playing" className="text-center z-10">
                <motion.div
                  animate={phase === 'crashed' ? { scale: [1, 1.2, 0.8], color: '#ef4444' } : {}}
                  className={cn(
                    'text-7xl font-black tabular-nums',
                    phase === 'playing' ? 'text-green-400' :
                    phase === 'crashed' ? 'text-red-400' : 'text-violet-400'
                  )}
                >
                  {multiplier.toFixed(2)}x
                </motion.div>
                <p className="text-white/40 mt-2">
                  {phase === 'playing' ? 'Flying...' :
                   phase === 'crashed' ? '💥 CRASHED!' : '✅ Cashed Out!'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="space-y-3">
          {phase === 'betting' ? (
            <>
              {/* Bet amount */}
              <div>
                <label className="text-sm text-white/60 mb-2 block">Bet Amount</label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-white/5 rounded-xl px-3 py-2 flex items-center gap-2">
                    <CoinIcon size={16} />
                    <input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(Math.max(10, parseInt(e.target.value) || 10))}
                      className="bg-transparent text-white w-full outline-none font-bold"
                    />
                  </div>
                  {[100, 500, 1000, 5000].map((v) => (
                    <button key={v} onClick={() => setBetAmount(v)} className="bg-white/10 rounded-xl px-3 py-2 text-xs font-medium">
                      {formatCoins(v)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto cash-out */}
              <div>
                <label className="text-sm text-white/60 mb-2 block">Auto Cash-Out (optional)</label>
                <div className="bg-white/5 rounded-xl px-3 py-2 flex items-center gap-2">
                  <span className="text-white/40">×</span>
                  <input
                    type="number"
                    placeholder="e.g. 2.0"
                    step="0.1"
                    min="1.01"
                    value={autoCashOut || ''}
                    onChange={(e) => setAutoCashOut(e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="bg-transparent text-white w-full outline-none"
                  />
                </div>
              </div>

              <button
                onClick={startGame}
                disabled={betAmount > balance}
                className="w-full btn-primary py-4 text-lg font-bold flex items-center justify-center gap-2"
              >
                <span>🚀</span> Launch ({formatCoins(betAmount)})
              </button>
            </>
          ) : phase === 'playing' ? (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => handleCashOut()}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl text-lg flex items-center justify-center gap-2 transition-all"
            >
              💰 Cash Out ({(betAmount * multiplier).toFixed(0)})
            </motion.button>
          ) : (
            <div className="w-full card py-4 text-center text-white/40">
              {phase === 'crashed' ? '💥 Better luck next time!' : result?.won ? `✅ Won ${formatCoins(result.payout || 0)}!` : ''}
            </div>
          )}
        </div>

        {/* Balance */}
        <div className="flex items-center justify-center gap-2 text-sm text-white/40">
          <CoinIcon size={14} />
          <span>Balance: {formatCoins(balance)}</span>
        </div>
      </div>
    </AppShell>
  );
}
