"use client";

import Link from 'next/link';
import {
  ArrowRight,
  GitBranch,
  FlaskConical,
  Users,
  Link2,
  FileText,
  Rocket,
  ArrowDown,
  Beaker,
} from 'lucide-react';
import { LanguageSwitcher, useLanguage } from '@/lib/i18n';

/* ================================================================== */
/*  Section components (co-located for readability — extract later)    */
/* ================================================================== */

/* ---- Hero ---- */
function Hero() {
  const { t } = useLanguage();

  return (
    <section className="relative overflow-hidden bg-white">
      {/* Subtle background texture */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 25% 0%, #3b6df0 1px, transparent 1px), radial-gradient(circle at 75% 100%, #3b6df0 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative max-w-4xl mx-auto px-6 pt-28 pb-32 text-center">
        {/* Pill badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700 mb-8">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
          </span>
          {t("home.badge")}
        </div>

        <h1 className="text-[56px] leading-[1.1] tracking-[-2px] font-extrabold text-gray-900 mb-6">
          {t("home.hero.title1")}
          <br />
          <span className="text-brand-500">{t("home.hero.title2")}</span>
        </h1>

        <p className="max-w-xl mx-auto text-lg leading-relaxed text-gray-500 mb-10">
          {t("home.hero.subtitle")}
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-[15px] font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-700 hover:shadow-brand-500/30 active:scale-[0.98]"
          >
            {t("home.hero.createProject")}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-[15px] font-semibold text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 active:scale-[0.98]"
          >
            {t("home.hero.viewDocs")}
          </Link>
        </div>
      </div>

      {/* Down arrow hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
        <ArrowDown className="w-4 h-4 text-gray-300 animate-bounce" />
      </div>
    </section>
  );
}

/* ---- Features ---- */
function Features() {
  const { t } = useLanguage();

  const features = [
    {
      icon: GitBranch,
      title: t("home.features.vc.title"),
      description: t("home.features.vc.desc"),
    },
    {
      icon: FlaskConical,
      title: t("home.features.ab.title"),
      description: t("home.features.ab.desc"),
    },
    {
      icon: Users,
      title: t("home.features.collab.title"),
      description: t("home.features.collab.desc"),
    },
  ];

  return (
    <section className="bg-gray-50 py-24">
      <div className="max-w-[1120px] mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-[34px] leading-[1.15] tracking-[-1px] font-bold text-gray-900 mb-4">
            {t("home.features.heading1")}
            <br />
            {t("home.features.heading2")}
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            {t("home.features.subtitle")}
          </p>
        </div>

        {/* Card grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feat) => (
            <div
              key={feat.title}
              className="group relative rounded-2xl border border-gray-100 bg-white p-8 transition-all hover:border-brand-200 hover:shadow-lg hover:shadow-brand-500/[0.06]"
            >
              {/* Icon */}
              <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center mb-5 group-hover:bg-brand-100 transition-colors">
                <feat.icon className="w-[22px] h-[22px] text-brand-600" strokeWidth={1.8} />
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">{feat.title}</h3>
              <p className="text-[15px] text-gray-500 leading-relaxed">{feat.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- How It Works ---- */
function HowItWorks() {
  const { t } = useLanguage();

  const steps = [
    {
      step: '01',
      icon: Link2,
      title: t("home.steps.connect.title"),
      description: t("home.steps.connect.desc"),
    },
    {
      step: '02',
      icon: FileText,
      title: t("home.steps.test.title"),
      description: t("home.steps.test.desc"),
    },
    {
      step: '03',
      icon: Rocket,
      title: t("home.steps.ship.title"),
      description: t("home.steps.ship.desc"),
    },
  ];

  return (
    <section className="bg-white py-24">
      <div className="max-w-[1120px] mx-auto px-6">
        {/* Section header */}
        <div className="mb-16">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-500 mb-3">
            {t("home.steps.label")}
          </p>
          <h2 className="text-[34px] leading-[1.15] tracking-[-1px] font-bold text-gray-900 mb-4">
            {t("home.steps.heading1")}
            <br />
            {t("home.steps.heading2")}
          </h2>
          <p className="text-gray-500 text-lg">
            {t("home.steps.subtitle")}
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((s, idx) => (
            <div key={s.step} className="relative">
              {/* Connector line between steps (hidden on mobile) */}
              {idx < steps.length - 1 && (
                <div className="hidden md:block absolute top-9 left-[calc(100%-40px)] w-8 h-px bg-gray-200" />
              )}

              {/* Step number */}
              <div className="text-[56px] font-extrabold text-gray-100 leading-none mb-4 select-none">
                {s.step}
              </div>

              {/* Icon */}
              <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center mb-4">
                <s.icon className="w-5 h-5 text-brand-600" strokeWidth={1.8} />
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">{s.title}</h3>
              <p className="text-[15px] text-gray-500 leading-relaxed max-w-xs">
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- CTA Banner ---- */
function CTABanner() {
  const { t } = useLanguage();

  return (
    <section className="bg-gray-50 py-24">
      <div className="max-w-[1120px] mx-auto px-6">
        <div className="relative overflow-hidden rounded-3xl bg-brand-500 px-10 py-16 text-center shadow-xl shadow-brand-500/20">
          {/* Decorative circles */}
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/5" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-white/5" />

          <div className="relative">
            <h2 className="text-[32px] leading-[1.15] tracking-[-0.5px] font-bold text-white mb-4">
              {t("home.cta.heading")}
            </h2>
            <p className="text-brand-100 text-lg mb-8 max-w-md mx-auto">
              {t("home.cta.subtitle")}
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-[15px] font-semibold text-brand-600 transition-all hover:bg-brand-50 active:scale-[0.98]"
              >
                {t("home.hero.getStarted")}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-6 py-3 text-[15px] font-semibold text-white transition-all hover:bg-white/10 active:scale-[0.98]"
              >
                {t("home.hero.starGithub")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  Page                                                               */
/* ================================================================== */
export default function HomePage() {
  const { t } = useLanguage();

  return (
    <>
      {/* Language switcher — top-right, inside consistent content container */}
      <div className="w-full px-4 pt-6 flex justify-end">
        <LanguageSwitcher />
      </div>
      <Hero />
      <Features />
      <HowItWorks />
      <CTABanner />

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-8">
        <div className="max-w-[1120px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Beaker className="w-4 h-4" />
            <span>{t("home.footer.tagline")}</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link href="/docs" className="hover:text-gray-600 transition-colors">
              {t("home.footer.docs")}
            </Link>
            <Link href="/blog" className="hover:text-gray-600 transition-colors">
              {t("home.footer.blog")}
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-600 transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
