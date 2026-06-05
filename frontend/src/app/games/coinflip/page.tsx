'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppShell } from '@/components/layout/AppShell';
import { coinflipApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useTelegram } from '@/hooks/useTelegram';
import { formatCoins, cn } from '@/lib/utils';
import { CoinIcon } from '@/components/ui/CoinIcon';
import toast from 'react-hot-toast';

type Phase = 'betting' | 'flipping' | 'result';
type Side = 'heads' | 'tails';

export default function CoinflipPage() {
  const { user, refreshUser } = useAuthStore();
  const { haptic } = useTelegram();
  const [betAmount, setBetAmount] = useState(100);
  const [choice, setChoice] = useState<Side>('heads');
  const [phase, setPhase] = useState<Phase>('betting');
  const [result, setResult] = useState<{ won: boolean; result: Side; payout: number } | null>(null);

  const balance = Number(user?.wallet?.balance || 0);

  const handleFlip = async () => {
    if (phase !== 'betting') return;
    if (betAmount > balance) { toast.error('Insufficient balance!'); haptic.error(); return; }

    haptic.medium();
    setPhase('flipping');
    setResult(null);

    try {
      const data = await coinflipApi.flip(betAmount, choice);
      const res = data as any;
      setTimeout(() => {
        setResult(res);
        setPhase('result');
        if (res.won) { haptic.success(); toast.success(`+${formatCoins(res.payout)} coins!`); }
        else { haptic.error(); toast.error('Better luck next time!'); }
        refreshUser();
      }, 1500);
    } catch (err: any) {
      toast.error(err.message);
      haptic.error();
      setPhase('betting');
    }
  };

  return (
    <AppShell title="COIN FLIP">
      <div className="px-4 py-4 space-y-6">

        {/* Coin display */}
        <div className="flex justify-center items-center h-48">
          <AnimatePresence mode="wait">
            {phase === 'flipping' ? (
              <motion.div
                key="flipping"
                animate={{ rotateY: [0, 1080] }}
                transition={{ duration: 1.5, ease: 'easeInOut' }}
                className="w-32 h-32 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-5xl shadow-[0_0_40px_rgba(245,158,11,0.5)]"
              >
                🪙
              </motion.div>
            ) : phase === 'result' && result ? (
              <motion.div
                key="result"
                initial={{ scale: 0, rotateY: 180 }}
                animate={{ scale: 1, rotateY: 0 }}
                transition={{ type: 'spring', bounce: 0.4 }}
                className={cn(
                  'w-32 h-32 rounded-full flex items-center justify-center text-5xl shadow-[0_0_60px]',
                  result.won
                    ? 'bg-gradient-to-br from-violet-500 to-purple-700 shadow-violet-500/50'
                    : 'bg-gradient-to-br from-gray-600 to-gray-800 shadow-gray-600/30'
                )}
              >
                {result.won ? '🏆' : '😔'}
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                className="relative w-32 h-32"
              >
                <div className={cn(
                  'w-full h-full rounded-full flex items-center justify-center text-5xl border-4 transition-all duration-300',
                  choice === 'heads'
                    ? 'bg-gradient-to-br from-amber-400 to-amber-600 border-amber-300 shadow-[0_0_30px_rgba(245,158,11,0.5)]'
                    : 'bg-gradient-to-br from-indigo-500 to-indigo-700 border-indigo-300 shadow-[0_0_30px_rgba(99,102,241,0.5)]'
                )}>
                  {choice === 'heads' ? '⭐' : '🌙'}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Side picker */}
        {phase === 'betting' && (
          <div>
            <p className="text-center text-white/60 text-sm mb-3">Choose your side</p>
            <div className="grid grid-cols-2 gap-3">
              {(['heads', 'tails'] as Side[]).map((side) => (
                <button
                  key={side}
                  onClick={() => setChoice(side)}
                  className={cn(
                    'py-4 rounded-2xl font-bold text-lg flex flex-col items-center gap-2 transition-all border-2',
                    choice === side
                      ? side === 'heads'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                        : 'bg-indigo-500/20 border-indigo-500 text-indigo-400'
                      : 'bg-white/5 border-white/10 text-white/40'
                  )}
                >
                  <span className="text-3xl">{side === 'heads' ? '⭐' : '🌙'}</span>
                  <span className="capitalize">{side}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bet amount */}
        {phase === 'betting' && (
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
              {[100, 500, 1000].map((v) => (
                <button key={v} onClick={() => setBetAmount(v)} className="bg-white/10 rounded-xl px-3 py-2 text-xs font-medium">
                  {formatCoins(v)}
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-1 text-xs text-white/30">
              <span>Min: 10</span>
              <button onClick={() => setBetAmount(Math.floor(balance / 2))} className="text-violet-400">½</button>
              <button onClick={() => setBetAmount(balance)} className="text-violet-400">All in</button>
            </div>
          </div>
        )}

        {/* Payout info */}
        {phase === 'betting' && (
          <div className="card p-3 flex items-center justify-between">
            <span className="text-white/40 text-sm">Potential Win</span>
            <div className="flex items-center gap-1">
              <CoinIcon size={14} />
              <span className="text-green-400 font-bold">{formatCoins(Math.floor(betAmount * 1.95))}</span>
              <span className="text-white/40 text-xs">(1.95x)</span>
            </div>
          </div>
        )}

        {/* Result */}
        {phase === 'result' && result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'card-glow p-6 text-center rounded-2xl',
              result.won ? 'border-violet-500/50' : 'border-red-500/20'
            )}
          >
            <div className="text-3xl mb-2">{result.won ? '🏆' : '😔'}</div>
            <h3 className="text-xl font-black text-white">{result.won ? 'You Won!' : 'You Lost'}</h3>
            <p className="text-white/40 mt-1">
              Coin landed on <span className="text-white font-bold capitalize">{result.result}</span>
            </p>
            {result.won && (
              <div className="flex items-center justify-center gap-1 mt-2">
                <CoinIcon size={16} />
                <span className="text-green-400 font-black text-xl">+{formatCoins(result.payout)}</span>
              </div>
            )}
          </motion.div>
        )}

        {/* Action button */}
        <button
          onClick={phase === 'result' ? () => { setPhase('betting'); setResult(null); } : handleFlip}
          disabled={phase === 'flipping'}
          className="w-full btn-primary py-4 text-lg font-bold"
        >
          {phase === 'betting' && `🪙 Flip (${formatCoins(betAmount)})`}
          {phase === 'flipping' && '🪙 Flipping...'}
          {phase === 'result' && 'Flip Again'}
        </button>

        <div className="flex items-center justify-center gap-2 text-sm text-white/40">
          <CoinIcon size={14} />
          <span>Balance: {formatCoins(balance)}</span>
        </div>
      </div>
    </AppShell>
  );
}
