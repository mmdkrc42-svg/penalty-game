'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AppShell } from '@/components/layout/AppShell';

const games = [
  {
    id: 'crash',
    name: 'Crash',
    description: 'Watch the multiplier rise. Cash out before it crashes!',
    icon: '📈',
    color: 'from-emerald-700 to-emerald-900',
    href: '/games/crash',
    badge: 'HIGH RISK',
    badgeColor: 'bg-red-500',
  },
  {
    id: 'coinflip',
    name: 'Coin Flip',
    description: 'Heads or tails? Double your coins with 50/50 odds.',
    icon: '🪙',
    color: 'from-amber-700 to-amber-900',
    href: '/games/coinflip',
    badge: '1.95x',
    badgeColor: 'bg-amber-500',
  },
  {
    id: 'upgrade',
    name: 'Item Upgrade',
    description: 'Risk your inventory items to win something better.',
    icon: '⚡',
    color: 'from-violet-700 to-violet-900',
    href: '/games/upgrade',
    badge: 'ITEMS',
    badgeColor: 'bg-violet-500',
  },
];

export default function GamesPage() {
  return (
    <AppShell title="GAMES">
      <div className="px-4 py-4 space-y-4">
        <p className="text-white/40 text-sm">Test your luck in our skill games</p>

        <div className="space-y-3">
          {games.map((game, i) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link href={game.href}>
                <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-r ${game.color} border border-white/10 p-5 flex items-center gap-4 hover:border-white/20 transition-all active:scale-98`}>
                  <div className="absolute inset-0 bg-black/20" />
                  <div className="relative text-5xl">{game.icon}</div>
                  <div className="relative flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-black text-xl text-white">{game.name}</h3>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${game.badgeColor}`}>
                        {game.badge}
                      </span>
                    </div>
                    <p className="text-white/60 text-sm">{game.description}</p>
                  </div>
                  <div className="relative text-white/40">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Recent games */}
        <div className="card p-4">
          <h3 className="font-bold text-white mb-2">💡 Game Tips</h3>
          <ul className="space-y-2 text-white/50 text-sm">
            <li>• Crash: Set auto cash-out to lock in profits</li>
            <li>• Coinflip: House edge is only 5% — best odds!</li>
            <li>• Upgrade: Higher target = lower success chance</li>
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
