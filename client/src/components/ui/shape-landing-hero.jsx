import { motion, useReducedMotion } from 'framer-motion';
import { Circle } from 'lucide-react';
import { cn } from '../../lib/cn.js';

// Kokonut UI's "shape landing hero", re-homed for SpeakCoach: JSX instead of TSX,
// cream/warm-glass instead of near-black, coral/rose/amber tints instead of the
// original indigo/violet/cyan (single warm accent — no cool colors anywhere).
// framer-motion ignores the global CSS reduced-motion rule (it animates inline
// styles from JS), so this file must check useReducedMotion() itself.

function ElegantShape({
  className,
  delay = 0,
  width = 400,
  height = 100,
  rotate = 0,
  gradient = 'from-brand-300/[0.18]',
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: -150, rotate: rotate - 15 }}
      animate={{ opacity: 1, y: 0, rotate }}
      transition={{
        duration: 2.4,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96],
        opacity: { duration: 1.2 },
      }}
      className={cn('absolute', className)}
    >
      <motion.div
        animate={reduceMotion ? undefined : { y: [0, 15, 0] }}
        transition={{ duration: 12, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
        style={{ width, height }}
        className="relative"
      >
        <div
          className={cn(
            'absolute inset-0 rounded-full',
            'bg-gradient-to-r to-transparent',
            gradient,
            'backdrop-blur-[2px] border-2 border-white/[0.65]',
            'shadow-[0_8px_32px_0_rgba(43,38,34,0.08)]',
            'after:absolute after:inset-0 after:rounded-full',
            'after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.5),transparent_70%)]'
          )}
        />
      </motion.div>
    </motion.div>
  );
}

function HeroGeometric({
  badge = 'Private · on-device coaching',
  title1 = 'See how you',
  title2 = 'actually speak.',
  children,
}) {
  const reduceMotion = useReducedMotion();

  const fadeUpVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: reduceMotion
        ? { duration: 0 }
        : { duration: 1, delay: 0.5 + i * 0.2, ease: [0.25, 0.4, 0.25, 1] },
    }),
  };

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] w-full flex items-center justify-center overflow-hidden bg-cream">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-500/[0.05] via-transparent to-amber-500/[0.05] blur-3xl" />

      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        <ElegantShape
          delay={0.3}
          width={600}
          height={140}
          rotate={12}
          gradient="from-brand-400/[0.16]"
          className="left-[-10%] md:left-[-5%] top-[15%] md:top-[20%]"
        />
        <ElegantShape
          delay={0.5}
          width={500}
          height={120}
          rotate={-15}
          gradient="from-rose-400/[0.14]"
          className="right-[-5%] md:right-[0%] top-[70%] md:top-[75%]"
        />
        <ElegantShape
          delay={0.4}
          width={300}
          height={80}
          rotate={-8}
          gradient="from-amber-400/[0.14]"
          className="left-[5%] md:left-[10%] bottom-[5%] md:bottom-[10%]"
        />
        <ElegantShape
          delay={0.6}
          width={200}
          height={60}
          rotate={20}
          gradient="from-brand-300/[0.18]"
          className="right-[15%] md:right-[20%] top-[10%] md:top-[15%]"
        />
        <ElegantShape
          delay={0.7}
          width={150}
          height={40}
          rotate={-25}
          gradient="from-rose-300/[0.16]"
          className="left-[20%] md:left-[25%] top-[5%] md:top-[10%]"
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6 py-10">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            custom={0}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.6] border border-ink/[0.08] shadow-soft mb-8 md:mb-10"
          >
            <Circle className="h-2 w-2 fill-brand-500/80 text-brand-500/80" />
            <span className="text-sm text-ink/55 tracking-wide">{badge}</span>
          </motion.div>

          <motion.div custom={1} variants={fadeUpVariants} initial="hidden" animate="visible">
            <h1 className="font-display text-[3.5rem] sm:text-[4.25rem] md:text-8xl font-semibold leading-[1.04] tracking-tight">
              <span className="text-ink">{title1}</span>
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-600 via-brand-400 to-amber-500">
                {title2}
              </span>
            </h1>
          </motion.div>

          {children && (
            <motion.div custom={2} variants={fadeUpVariants} initial="hidden" animate="visible">
              {children}
            </motion.div>
          )}
        </div>
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-cream via-transparent to-cream/80 pointer-events-none" />
    </div>
  );
}

export { HeroGeometric, ElegantShape };
