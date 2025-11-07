"use client"

import Link from "next/link"
import Image from "next/image"
import {
  ArrowRight,
  Shield,
  FileText,
  Smartphone,
  Users,
  Lock,
  BarChart3,
  Zap,
  Sparkles,
  TrendingUp,
  Wallet,
  PieChart,
  Activity,
  CheckCircle2,
  Clock,
  Globe,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import AnimatedCounter from '@/components/animated-counter'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-screen-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="Aller à la page d'accueil" className="inline-block">
              <div className="p-1 rounded-xl animate-float">
                <Image src="/logo.png" alt="SMT logo" width={56} height={56} className="object-contain" />
              </div>
            </Link>
            <span className="text-sm font-sm">Système Minimal de Trésorerie</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <a href="#features">Fonctionnalités</a>
            </Button>
            <Button asChild className="bg-primary hover:bg-primary/90 transition-all hover:scale-105">
              <Link href="/login">
                Se connecter
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 -z-10 mesh-gradient">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-float delay-300" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-scale-pulse" />
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20 animate-slide-in-left animate-border-glow">
                <Sparkles className="h-4 w-4" />
                Système Minimal de Trésorerie
              </div>

              <h1 className="text-6xl lg:text-7xl font-black leading-[1.1] text-balance animate-slide-in-left delay-100">
                Gérez votre trésorerie avec{" "}
                <span className="text-primary bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent animate-gradient">
                  confiance
                </span>
              </h1>

              <p className="text-xl text-muted-foreground leading-relaxed max-w-xl animate-slide-in-left delay-200">
                Une plateforme moderne et sécurisée pour suivre vos flux financiers, générer des rapports détaillés et
                prendre des décisions éclairées.
              </p>

              <div className="flex flex-wrap gap-4 animate-slide-in-left delay-300">
                <Button
                  size="lg"
                  asChild
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 h-14 px-8 hover:shadow-primary/40 hover:scale-105 transition-all duration-300"
                >
                  <Link href="/login">
                    Commencer maintenant
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="h-14 px-8 bg-transparent hover:bg-primary/5 hover:border-primary/50 transition-all duration-300"
                >
                  <a href="#features">Découvrir les fonctionnalités</a>
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 pt-8 animate-fade-in delay-400">
                <div className="group cursor-pointer">
                  <div className="text-3xl font-bold text-foreground group-hover:text-primary transition-colors">
                    100%
                  </div>
                  <div className="text-sm text-muted-foreground">Sécurisé</div>
                </div>
                <div className="group cursor-pointer">
                  <div className="text-3xl font-bold text-foreground group-hover:text-primary transition-colors">
                    24/7
                  </div>
                  <div className="text-sm text-muted-foreground">Disponible</div>
                </div>
                <div className="group cursor-pointer">
                  <div className="text-3xl font-bold text-foreground group-hover:text-primary transition-colors">∞</div>
                  <div className="text-sm text-muted-foreground">Évolutif</div>
                </div>
              </div>
            </div>

            {/* Right visual - Bento grid */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="col-span-2 p-6 bg-gradient-to-br from-primary/10 to-accent/5 border-primary/20 animate-slide-in-right hover:scale-[1.02] transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <span className="text-sm font-semibold text-muted-foreground">Revenus mensuels</span>
                  <TrendingUp className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-4xl font-bold mb-2 relative z-10">AR <AnimatedCounter value={124500789} /></div>
                <div className="flex items-center gap-2 text-sm relative z-10">
                  <span className="text-primary font-semibold">+18.2%</span>
                  <span className="text-muted-foreground">vs mois dernier</span>
                </div>
              </Card>

              <Card className="p-6 bg-card border-border animate-slide-in-right delay-100 hover:scale-105 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 group">
                <Activity className="h-8 w-8 text-primary mb-4 group-hover:rotate-12 transition-transform" />
                <div className="text-2xl font-bold mb-1">+<AnimatedCounter value={1247} /></div>
                <div className="text-sm text-muted-foreground">Transactions</div>
              </Card>

              <Card className="p-6 bg-card border-border animate-slide-in-right delay-200 hover:scale-105 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 group">
                <CheckCircle2 className="h-8 w-8 text-primary mb-4 group-hover:rotate-12 transition-transform" />
                <div className="text-2xl font-bold mb-1"><AnimatedCounter value={98.5} decimals={1} />%</div>
                <div className="text-sm text-muted-foreground">Précision</div>
              </Card>

              <Card className="col-span-2 p-6 bg-card border-border animate-slide-in-right delay-300 hover:scale-[1.02] hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold mb-1">Rapports en temps réel</div>
                    <div className="text-sm text-muted-foreground">Exportez vos données instantanément</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 bg-muted/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-float delay-500" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20 animate-slide-up">
              <Zap className="h-4 w-4" />
              Fonctionnalités
            </div>
            <h2 className="text-5xl font-black text-balance animate-slide-up delay-100">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto animate-slide-up delay-200">
              Une solution complète pour gérer efficacement votre trésorerie d'entreprise
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Shield,
                title: "Sécurité maximale",
                description: "Contrôle d'accès basé sur les rôles et chiffrement de bout en bout.",
              },
              {
                icon: FileText,
                title: "Rapports PDF",
                description: "Générez et exportez des rapports professionnels en un clic.",
              },
              {
                icon: Wallet,
                title: "Suivi en temps réel",
                description: "Visualisez vos flux de trésorerie instantanément.",
              },
              {
                icon: Smartphone,
                title: "Interface responsive",
                description: "Gérez vos finances depuis n'importe quel appareil.",
              },
              {
                icon: BarChart3,
                title: "Analyses avancées",
                description: "Comprenez vos performances avec des graphiques détaillés.",
              },
              {
                icon: Users,
                title: "Collaboration",
                description: "Travaillez en équipe avec des permissions personnalisées.",
              },
              {
                icon: Lock,
                title: "Conformité",
                description: "Respectez les normes financières et réglementaires.",
              },
              {
                icon: Globe,
                title: "Multi-devises",
                description: "Gérez plusieurs devises et conversions automatiques.",
              },
            ].map((feature, index) => (
              <Card
                key={index}
                className="p-6 bg-card border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-2 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 relative z-10">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-2 relative z-10">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed relative z-10">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left content */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20 animate-slide-in-left">
                <TrendingUp className="h-4 w-4" />
                Pourquoi SMT ?
              </div>
              <h2 className="text-5xl font-black leading-tight text-balance animate-slide-in-left delay-100">
                Une solution pensée pour votre réussite
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed animate-slide-in-left delay-200">
                SMT combine puissance et simplicité pour offrir une expérience de gestion financière sans compromis.
                Prenez le contrôle de votre trésorerie avec des outils professionnels accessibles.
              </p>
              <div className="space-y-4 pt-4">
                {[
                  "Interface intuitive et moderne",
                  "Données sécurisées et chiffrées",
                  "Support client réactif",
                  "Mises à jour régulières",
                ].map((benefit, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 animate-slide-in-left delay-${300 + index * 100} group cursor-pointer`}
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 group-hover:scale-110 transition-all">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-foreground group-hover:text-primary transition-colors">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right grid */}
            <div className="grid grid-cols-2 gap-6">
              {[
                {
                  icon: Lock,
                  title: "Sécurité maximale",
                  description: "Vos données sont protégées par les dernières technologies de chiffrement",
                  stat: "256-bit",
                },
                {
                  icon: BarChart3,
                  title: "Analyses détaillées",
                  description: "Visualisez vos performances avec des graphiques interactifs",
                  stat: "15+ rapports",
                },
                {
                  icon: Users,
                  title: "Collaboration",
                  description: "Travaillez en équipe avec des permissions granulaires",
                  stat: "Illimité",
                },
                {
                  icon: PieChart,
                  title: "Rapports visuels",
                  description: "Comprenez vos finances en un coup d'œil",
                  stat: "Temps réel",
                },
              ].map((item, index) => (
                <Card
                  key={index}
                  className={`p-6 bg-card border-border hover:border-primary/50 transition-all duration-500 hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-2 hover:rotate-1 animate-slide-in-right delay-${index * 100} group relative overflow-hidden`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <item.icon className="h-8 w-8 text-primary mb-4 group-hover:scale-125 group-hover:rotate-12 transition-all duration-300 relative z-10" />
                  <div className="text-2xl font-bold text-primary mb-2 relative z-10">{item.stat}</div>
                  <h3 className="font-bold mb-2 relative z-10">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed relative z-10">{item.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 animate-gradient relative overflow-hidden">
        <div className="absolute inset-0 mesh-gradient opacity-50" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl animate-scale-pulse" />

        <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20 animate-slide-up">
            <Globe className="h-4 w-4" />
            Rejoignez-nous
          </div>
          <h2 className="text-5xl lg:text-6xl font-black text-balance animate-slide-up delay-100">
            Commencez dès aujourd'hui
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-slide-up delay-200">
            Rejoignez les entreprises qui font confiance à SMT pour gérer leur trésorerie efficacement et en toute
            sécurité.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4 animate-slide-up delay-300">
            <Button
              size="lg"
              asChild
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 h-14 px-8 hover:shadow-primary/40 hover:scale-110 transition-all duration-300 animate-glow-pulse"
            >
              <Link href="/login">
                Se connecter maintenant
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 group cursor-pointer">
              <Link href="/" aria-label="Aller à la page d'accueil" className="inline-block">
                <div className="p-1 rounded-xl">
                  <Image src="/logo.png" alt="SMT logo" width={50} height={50} className="object-contain" />
                </div>
              </Link>
              <span className="font-sm">Système Minimal de Trésorerie</span>
            </div>
            <p className="text-sm text-muted-foreground">© 2025 SMT. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
