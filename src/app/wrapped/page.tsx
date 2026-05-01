'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { AllStats } from '@/lib/stats';

function msToHours(ms: number) { return (ms / 3_600_000).toFixed(0); }
function msToDays(ms: number) { return (ms / 86_400_000).toFixed(1); }

const HOUR_LABELS = ['midnight', '1 AM', '2 AM', '3 AM', '4 AM', '5 AM', '6 AM', '7 AM',
  '8 AM', '9 AM', '10 AM', '11 AM', 'noon', '1 PM', '2 PM', '3 PM',
  '4 PM', '5 PM', '6 PM', '7 PM', '8 PM', '9 PM', '10 PM', '11 PM'];

function getTimePersonality(hour: number) {
  if (hour >= 0 && hour < 5) return { label: 'Night Owl 🦉', desc: 'You thrive in the dark hours' };
  if (hour >= 5 && hour < 9) return { label: 'Early Bird 🐦', desc: 'You start the day with music' };
  if (hour >= 9 && hour < 12) return { label: 'Morning Listener 🌅', desc: 'Music fuels your mornings' };
  if (hour >= 12 && hour < 17) return { label: 'Afternoon Groover 🌤️', desc: 'Afternoons are your sweet spot' };
  if (hour >= 17 && hour < 21) return { label: 'Evening Vibe ✨', desc: 'Evenings come alive with music' };
  return { label: 'Night Rider 🌙', desc: 'Late nights belong to you' };
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir < 0 ? '100%' : '-100%', opacity: 0 }),
};

export default function WrappedPage() {
  const router = useRouter();
  const [stats, setStats] = useState<AllStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [slide, setSlide] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    const year = new Date().getFullYear();
    fetch(`/api/stats?year=${year}`)
      .then(r => r.ok ? r.json() : fetch('/api/stats').then(r2 => r2.json()))
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const peakHour = stats?.hourlyData.reduce(
    (a, b) => b.totalMs > a.totalMs ? b : a,
    { hour: 0, totalMs: 0, playCount: 0 }
  );

  const slides = stats ? [
    {
      id: 'welcome',
      bg: 'from-[#0a0a0a] via-[#0f1f14] to-[#0a0a0a]',
      content: (
        <div className="text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}
            className="w-28 h-28 bg-spotify-green rounded-full flex items-center justify-center mx-auto mb-8">
            <span className="text-5xl">🎵</span>
          </motion.div>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="text-spotify-green font-bold tracking-widest text-sm uppercase mb-4">Your Story</motion.p>
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="text-6xl font-black mb-4">Wrapped</motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
            className="text-white/60 text-xl">Let&apos;s see what music defined you</motion.p>
        </div>
      ),
    },
    {
      id: 'time',
      bg: 'from-[#FF416C] via-[#d63150] to-[#8B0000]',
      content: (
        <div className="text-center">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="text-white/70 text-xl mb-4">You spent</motion.p>
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3, type: 'spring', stiffness: 120 }}>
            <p className="text-9xl font-black leading-none">{msToHours(stats.overview.totalMs)}</p>
            <p className="text-4xl font-bold text-white/80 mt-2">hours</p>
          </motion.div>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="text-white/70 text-xl mt-6">listening to music</motion.p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
            className="text-white/50 text-lg mt-2">That&apos;s {msToDays(stats.overview.totalMs)} full days 🤯</motion.p>
        </div>
      ),
    },
    {
      id: 'artist',
      bg: 'from-[#4776E6] via-[#6B3FA0] to-[#8E54E9]',
      content: (
        <div className="text-center">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="text-white/70 text-xl mb-6">Your #1 Artist</motion.p>
          <motion.p initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, type: 'spring' }}
            className="text-5xl font-black leading-tight mb-4">{stats.topArtists[0]?.artistName ?? '—'}</motion.p>
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }}
            className="inline-block bg-white/10 rounded-2xl px-6 py-3">
            <p className="text-2xl font-bold">{Math.round((stats.topArtists[0]?.totalMs ?? 0) / 3_600_000)}h listened</p>
            <p className="text-white/60">{stats.topArtists[0]?.playCount.toLocaleString()} plays</p>
          </motion.div>
          {stats.topArtists.length > 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
              className="mt-8 flex justify-center gap-3 flex-wrap">
              {stats.topArtists.slice(1, 4).map((a, i) => (
                <span key={i} className="bg-white/10 rounded-full px-4 py-1 text-sm">{a.artistName}</span>
              ))}
            </motion.div>
          )}
        </div>
      ),
    },
    {
      id: 'track',
      bg: 'from-[#1DB954] via-[#158a3e] to-[#0a3d20]',
      content: (
        <div className="text-center">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="text-white/70 text-xl mb-6">Your #1 Track</motion.p>
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, type: 'spring' }}>
            <p className="text-4xl font-black leading-tight mb-2">{stats.topTracks[0]?.trackName ?? '—'}</p>
            <p className="text-white/60 text-xl">{stats.topTracks[0]?.artistName ?? ''}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.7 }}
            className="mt-8 inline-block bg-black/20 rounded-2xl px-6 py-3">
            <p className="text-2xl font-bold">{stats.topTracks[0]?.playCount ?? 0} plays</p>
            <p className="text-white/60">{Math.round((stats.topTracks[0]?.totalMs ?? 0) / 60_000)} minutes</p>
          </motion.div>
        </div>
      ),
    },
    {
      id: 'counts',
      bg: 'from-[#F7971E] via-[#e07b10] to-[#8B4513]',
      content: (
        <div className="text-center">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="text-white/70 text-xl mb-10">Your world of music</motion.p>
          <div className="grid grid-cols-3 gap-6">
            {[
              { val: stats.overview.uniqueArtists.toLocaleString(), label: 'Artists' },
              { val: stats.overview.uniqueTracks.toLocaleString(), label: 'Songs' },
              { val: stats.overview.uniqueAlbums.toLocaleString(), label: 'Albums' },
            ].map(({ val, label }, i) => (
              <motion.div key={label} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.15 }}
                className="bg-black/20 rounded-2xl p-6">
                <p className="text-4xl font-black">{val}</p>
                <p className="text-white/60 mt-1">{label}</p>
              </motion.div>
            ))}
          </div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
            className="text-white/50 mt-8 text-lg">
            You listened to {stats.overview.totalPlays.toLocaleString()} songs total
          </motion.p>
        </div>
      ),
    },
    {
      id: 'time-of-day',
      bg: 'from-[#141E30] via-[#1a2d4a] to-[#243B55]',
      content: (
        <div className="text-center">
          {peakHour && (() => {
            const p = getTimePersonality(peakHour.hour);
            return (
              <>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                  className="text-white/70 text-xl mb-4">You are a…</motion.p>
                <motion.h2 initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, type: 'spring' }}
                  className="text-5xl font-black mb-4">{p.label}</motion.h2>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                  className="text-white/60 text-xl mb-8">{p.desc}</motion.p>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
                  className="bg-white/10 rounded-2xl px-8 py-5 inline-block">
                  <p className="text-3xl font-bold">{HOUR_LABELS[peakHour.hour]}</p>
                  <p className="text-white/60 mt-1">peak listening hour</p>
                </motion.div>
              </>
            );
          })()}
        </div>
      ),
    },
    {
      id: 'finale',
      bg: 'from-[#0a0a0a] via-[#0f1f14] to-[#0a0a0a]',
      content: (
        <div className="text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}
            className="w-28 h-28 bg-spotify-green rounded-full flex items-center justify-center mx-auto mb-8 glow-green">
            <span className="text-5xl">🎉</span>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="text-5xl font-black mb-4">That&apos;s a wrap!</motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            className="text-white/60 text-xl mb-10">Music is your story.</motion.p>
          <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
            onClick={() => router.push('/dashboard')}
            className="bg-spotify-green hover:bg-green-400 text-black font-bold text-lg px-10 py-4 rounded-full transition-colors">
            View Full Dashboard
          </motion.button>
        </div>
      ),
    },
  ] : [];

  const goNext = useCallback(() => {
    if (slide < slides.length - 1) { setDirection(1); setSlide(s => s + 1); }
  }, [slide, slides.length]);

  const goPrev = useCallback(() => {
    if (slide > 0) { setDirection(-1); setSlide(s => s - 1); }
  }, [slide]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev]);

  if (loading) {
    return (
      <div className="min-h-screen bg-spotify-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-spotify-green border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-spotify-gray">Building your story…</p>
        </div>
      </div>
    );
  }

  if (!stats || slides.length === 0) {
    return (
      <div className="min-h-screen bg-spotify-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold mb-4">No data found</p>
          <button onClick={() => router.push('/upload')} className="bg-spotify-green text-black font-bold px-6 py-3 rounded-full">Upload Data</button>
        </div>
      </div>
    );
  }

  const current = slides[slide];

  return (
    <div className={`min-h-screen bg-gradient-to-br ${current.bg} relative overflow-hidden flex flex-col`}>
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="absolute w-2 h-2 bg-white/5 rounded-full"
            style={{ left: `${(i * 37 + 10) % 100}%`, top: `${(i * 53 + 5) % 100}%`, animationDelay: `${i * 0.3}s` }} />
        ))}
      </div>

      <div className="relative z-10 flex items-center justify-between px-6 py-4">
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <button key={i} onClick={() => { setDirection(i > slide ? 1 : -1); setSlide(i); }}
              className={`h-1 rounded-full transition-all duration-300 ${i === slide ? 'w-8 bg-white' : 'w-4 bg-white/30'}`} />
          ))}
        </div>
        <button onClick={() => router.push('/dashboard')} className="text-white/60 hover:text-white transition-colors p-2">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="relative z-10 flex-1 flex items-center justify-center px-8">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div key={current.id} custom={direction} variants={slideVariants}
            initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="w-full max-w-lg">
            {current.content}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative z-10 flex items-center justify-between px-6 pb-8">
        <button onClick={goPrev} disabled={slide === 0}
          className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-0 transition-all flex items-center justify-center">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <p className="text-white/40 text-sm">{slide + 1} / {slides.length}</p>
        <button onClick={goNext} disabled={slide === slides.length - 1}
          className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-0 transition-all flex items-center justify-center">
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
