import Link from "next/link";
import {
  Bookmark,
  Search,
  Bot,
  ArrowRight,
  Link as LinkIcon,
  FileText,
  ScanSearch,
  Check,
} from "lucide-react";

function NavBar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-nav-bg border-b border-neutral-800">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-6 h-14">
        <Link href="/" className="font-mono text-lg font-bold text-white tracking-tight">
          keepmark
        </Link>
        <Link
          href="/login"
          className="font-mono text-sm text-neutral-400 hover:text-white transition-colors"
        >
          Login
        </Link>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="pt-32 pb-20 px-6">
      <div className="mx-auto max-w-3xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-xs font-mono text-muted mb-8">
          <Bookmark className="h-3.5 w-3.5" />
          Bookmarks, but better
        </div>

        <h1 className="font-mono text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1] mb-6">
          Save your bookmarks.
          <br />
          <span className="text-muted">Keep the markdown.</span>
        </h1>

        <p className="text-lg sm:text-xl text-muted max-w-xl mx-auto mb-10 leading-relaxed">
          One feed for links, notes, and markdown — searchable from the web, the
          API, or your AI agent.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link
            href="/login"
            className="
              inline-flex items-center gap-2 rounded-lg bg-foreground text-white
              px-6 py-3 text-sm font-mono font-medium
              hover:bg-neutral-800 transition-colors
            "
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#features"
            className="
              inline-flex items-center gap-2 rounded-lg border border-border
              px-6 py-3 text-sm font-mono font-medium text-foreground
              hover:bg-neutral-50 transition-colors
            "
          >
            View Docs
          </a>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      icon: Bookmark,
      title: "Save anything",
      description:
        "Save links, articles, tweets. Content is extracted as clean markdown — readable, portable, and searchable.",
    },
    {
      icon: Search,
      title: "Search everything",
      description:
        "Full-text search across titles, URLs, notes, and tags. Filter by status, date, collection, or combine them all.",
    },
    {
      icon: Bot,
      title: "Agent-ready",
      description:
        "Feed API and search API built for AI agents. Less tab chaos, more reusable context for your workflows.",
    },
  ];

  return (
    <section id="features" className="py-20 px-6 border-t border-border">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="font-mono text-2xl sm:text-3xl font-bold text-foreground mb-4">
            Everything you need
          </h2>
          <p className="text-muted max-w-lg mx-auto">
            A minimal, powerful bookmark manager that keeps your content as
            markdown — not trapped in a proprietary database.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-border p-8 hover:border-neutral-300 transition-colors"
            >
              <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-neutral-100 mb-5">
                <feature.icon className="h-5 w-5 text-foreground" />
              </div>
              <h3 className="font-mono text-base font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: LinkIcon,
      step: "01",
      title: "Save a link",
      description:
        "Paste a URL, use the API, or send it from your browser extension. That's it.",
    },
    {
      icon: FileText,
      step: "02",
      title: "Content extracted",
      description:
        "We fetch the page, extract the article content, and convert it to clean markdown.",
    },
    {
      icon: ScanSearch,
      step: "03",
      title: "Search & organize",
      description:
        "Full-text search, tags, collections, and status filters. Find anything in seconds.",
    },
  ];

  return (
    <section className="py-20 px-6 bg-neutral-50 border-t border-border">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="font-mono text-2xl sm:text-3xl font-bold text-foreground mb-4">
            How it works
          </h2>
          <p className="text-muted max-w-lg mx-auto">
            Three steps. No complicated setup.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.step} className="text-center">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-foreground text-white mb-5">
                <step.icon className="h-6 w-6" />
              </div>
              <div className="font-mono text-xs text-muted mb-2">
                Step {step.step}
              </div>
              <h3 className="font-mono text-base font-semibold text-foreground mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-muted leading-relaxed max-w-xs mx-auto">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "For getting started",
      features: [
        "50 links per month",
        "Full-text search",
        "API access",
        "Tags & collections",
        "Markdown export",
      ],
      cta: "Get Started",
      ctaHref: "/login",
      highlighted: false,
    },
    {
      name: "Plus",
      price: "$10",
      period: "/month",
      description: "For power users",
      features: [
        "500 links per month",
        "Everything in Free",
        "Automated sources",
        "RSS feed ingestion",
        "YouTube transcript saving",
        "Email inbox ingestion",
        "Priority support",
      ],
      cta: "Get Started",
      ctaHref: "/login",
      highlighted: true,
    },
  ];

  return (
    <section className="py-20 px-6 border-t border-border">
      <div className="mx-auto max-w-4xl">
        <div className="text-center mb-16">
          <h2 className="font-mono text-2xl sm:text-3xl font-bold text-foreground mb-4">
            Simple pricing
          </h2>
          <p className="text-muted max-w-lg mx-auto">
            Start free, upgrade when you need more.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`
                rounded-xl border p-8 flex flex-col
                ${
                  plan.highlighted
                    ? "border-foreground bg-foreground text-white"
                    : "border-border bg-white"
                }
              `}
            >
              <div className="mb-6">
                <h3
                  className={`font-mono text-base font-semibold mb-1 ${
                    plan.highlighted ? "text-white" : "text-foreground"
                  }`}
                >
                  {plan.name}
                </h3>
                <p
                  className={`text-sm ${
                    plan.highlighted ? "text-neutral-400" : "text-muted"
                  }`}
                >
                  {plan.description}
                </p>
              </div>

              <div className="mb-6">
                <span
                  className={`font-mono text-4xl font-bold ${
                    plan.highlighted ? "text-white" : "text-foreground"
                  }`}
                >
                  {plan.price}
                </span>
                <span
                  className={`text-sm ml-1 ${
                    plan.highlighted ? "text-neutral-400" : "text-muted"
                  }`}
                >
                  {plan.period}
                </span>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5 text-sm">
                    <Check
                      className={`h-4 w-4 flex-shrink-0 ${
                        plan.highlighted ? "text-neutral-400" : "text-muted"
                      }`}
                    />
                    <span
                      className={
                        plan.highlighted ? "text-neutral-200" : "text-foreground"
                      }
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.ctaHref}
                className={`
                  inline-flex items-center justify-center rounded-lg px-6 py-3
                  text-sm font-mono font-medium transition-colors
                  ${
                    plan.highlighted
                      ? "bg-white text-foreground hover:bg-neutral-100"
                      : "bg-foreground text-white hover:bg-neutral-800"
                  }
                `}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border py-10 px-6">
      <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="font-mono text-sm font-bold text-foreground">
            keepmark
          </span>
          <span className="text-xs text-muted">
            &copy; {new Date().getFullYear()} Keepmark
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted">
            Built by{" "}
            <a
              href="https://x.com/andreibucur_"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:underline"
            >
              Andrei
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <NavBar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}
