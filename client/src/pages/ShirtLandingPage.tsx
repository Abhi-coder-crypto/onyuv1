import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Shield, Zap, ShoppingCart, Heart, User, Search as SearchIcon, ChevronDown, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import logoImg from "@assets/WhatsApp_Image_2026-01-13_at_4.42.21_PM-Photoroom_1768302850224.png";

const TSHIRTS = [
  { id: 1, image: "/tshirt-front.png", name: "Front View" },
  { id: 2, image: "/tshirt-back.png", name: "Back View" },
  { id: 3, image: "/tshirt-left.png", name: "Left View" },
  { id: 4, image: "/tshirt-right.png", name: "Right View" },
];

export default function LandingPage() {
  const [selectedImage, setSelectedImage] = useState(TSHIRTS[0].image);

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="border-b border-black/5 sticky top-0 z-50 bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center">
              <img src={logoImg} alt="Logo" className="h-64 w-auto object-contain" />
            </Link>
          </div>
          
          <nav className="hidden lg:flex items-center justify-center flex-1 px-4 space-x-8">
            <a href="#" className="text-base font-bold uppercase tracking-[0.2em] whitespace-nowrap hover:text-primary/70 transition-colors">Home</a>
            <a href="#" className="text-base font-bold uppercase tracking-[0.2em] whitespace-nowrap hover:text-primary/70 transition-colors">New Arrivals</a>
            <a href="#" className="text-base font-bold uppercase tracking-[0.2em] whitespace-nowrap hover:text-primary/70 transition-colors">Trending</a>
            <div className="flex items-center gap-1 cursor-pointer group whitespace-nowrap relative">
              <span className="text-base font-bold uppercase tracking-[0.2em] group-hover:text-primary/70 transition-colors">Categories</span>
              <ChevronDown className="w-5 h-5 group-hover:text-primary/70 transition-colors" />
              
              {/* Dropdown Menu */}
              <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-black/5 shadow-2xl rounded-2xl py-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                <a href="#" className="block px-6 py-2 text-sm font-bold uppercase tracking-widest hover:bg-zinc-50 transition-colors text-black">Shirts</a>
                <a href="#" className="block px-6 py-2 text-sm font-bold uppercase tracking-widest hover:bg-zinc-50 transition-colors text-black">T-Shirts</a>
              </div>
            </div>
          </nav>

          <div className="flex items-center space-x-8 flex-shrink-0">
            <Button variant="ghost" size="icon" className="hover-elevate">
              <SearchIcon className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="hover-elevate">
              <User className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="hover-elevate relative">
              <Heart className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-black text-[10px] font-bold rounded-full flex items-center justify-center text-white">0</span>
            </Button>
            <Button variant="ghost" size="icon" className="hover-elevate relative">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-black text-[10px] font-bold rounded-full flex items-center justify-center text-white">0</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-xs uppercase tracking-widest text-muted-foreground mb-12">
          <Link href="/" className="hover:text-black">Home</Link>
          <span>/</span>
          <a href="#" className="hover:text-black">Products</a>
          <span>/</span>
          <span className="text-black font-semibold">Midnight Essential T-Shirt</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          {/* Left: Product Images */}
          <div className="lg:col-span-7 space-y-6">
            <div className="relative group bg-zinc-100 rounded-3xl overflow-hidden aspect-[4/5] flex items-center justify-center border border-black/5">
              <img 
                src={selectedImage} 
                alt="Product main view" 
                className="w-full h-full object-contain p-12 transition-transform duration-700 group-hover:scale-105"
              />
              
              {/* Try On Button Overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/5 backdrop-blur-[2px]">
                <Link href="/try-on">
                  <Button size="lg" className="rounded-full px-8 py-6 h-auto text-lg font-bold shadow-2xl bg-black text-white hover:bg-black/90 hover-elevate active-elevate-2">
                    <Zap className="mr-2 w-6 h-6 fill-current text-white" />
                    TRY ON NOW
                  </Button>
                </Link>
              </div>
            </div>

            {/* Thumbnails */}
            <div className="grid grid-cols-4 gap-6">
              {TSHIRTS.map((tshirt) => (
                <button
                  key={tshirt.id}
                  onClick={() => setSelectedImage(tshirt.image)}
                  className={`relative group bg-zinc-50 rounded-2xl aspect-square flex items-center justify-center overflow-hidden border transition-all duration-300 ${
                    selectedImage === tshirt.image ? 'border-black ring-1 ring-black/20' : 'border-black/5 hover:border-black/20'
                  }`}
                >
                  <img 
                    src={tshirt.image} 
                    alt={tshirt.name} 
                    className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-110"
                  />
                  {/* Small Try On Icon on Thumbnails */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center">
                      <Zap className="w-3 h-3 text-white fill-current" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Product Info */}
          <div className="lg:col-span-5 space-y-10">
            <div className="space-y-4">
              <Badge variant="secondary" className="rounded-full px-4 py-1 uppercase tracking-[0.2em] text-[10px] font-bold border-black/5 bg-zinc-100 text-black">
                Bestseller
              </Badge>
              <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tighter text-black">Midnight Essential T-Shirt</h1>
              <p className="text-muted-foreground text-sm uppercase tracking-widest">Black Premium Organic Cotton</p>
              
              <div className="flex items-center gap-4 pt-2">
                <div className="flex text-black">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">5.0 (124 reviews)</span>
              </div>
            </div>

            <div className="flex items-baseline gap-4">
              <span className="text-4xl font-bold tracking-tighter text-black">₹3,750.00</span>
              <span className="text-lg text-muted-foreground line-through">₹4,999.00</span>
              <Badge variant="destructive" className="rounded-full bg-red-100 text-red-600 border-none font-bold">25% OFF</Badge>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-widest text-black">Available Colors:</span>
                  <span className="text-xs text-muted-foreground">Midnight Black</span>
                </div>
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-black ring-2 ring-black ring-offset-2 ring-offset-white cursor-pointer" />
                  <div className="w-10 h-10 rounded-full bg-zinc-200 ring-1 ring-black/10 hover:ring-black/30 cursor-pointer" />
                  <div className="w-10 h-10 rounded-full bg-zinc-400 ring-1 ring-black/10 hover:ring-black/30 cursor-pointer" />
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button size="lg" className="flex-1 h-16 rounded-2xl text-lg font-bold uppercase tracking-widest bg-black text-white hover:bg-black/90 hover-elevate active-elevate-2">
                <ShoppingCart className="mr-2 w-5 h-5" />
                Add to Cart
              </Button>
              <Button size="lg" variant="outline" className="h-16 w-16 rounded-2xl border-black/10 hover-elevate active-elevate-2 text-black">
                <Heart className="w-6 h-6" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-50 border border-black/5">
                <Shield className="w-5 h-5 text-black" />
                <span className="text-[10px] font-bold uppercase tracking-widest leading-tight text-black">Premium Quality</span>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-50 border border-black/5">
                <Zap className="w-5 h-5 text-black" />
                <span className="text-[10px] font-bold uppercase tracking-widest leading-tight text-black">Instant Try-On</span>
              </div>
            </div>

            <Accordion type="single" collapsible className="w-full border-t border-black/5">
              <AccordionItem value="description" className="border-b border-black/5">
                <AccordionTrigger className="text-xs font-bold uppercase tracking-[0.2em] hover:no-underline text-black">Product Description</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed text-sm">
                  Crafted from 100% organic cotton, the Midnight Essential features a tailored fit that maintains its shape. Perfect for both casual outings and layered looks.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="details" className="border-b border-black/5">
                <AccordionTrigger className="text-xs font-bold uppercase tracking-[0.2em] hover:no-underline text-black">Product Details</AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm">
                  - 100% Organic Cotton<br />
                  - Sustainably Sourced<br />
                  - Pre-shrunk Fabric<br />
                  - Reinforced Stitching
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="specification" className="border-b border-black/5">
                <AccordionTrigger className="text-xs font-bold uppercase tracking-[0.2em] hover:no-underline text-black">Product Specification</AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm">
                  - Weight: 220 GSM<br />
                  - Fit: Modern Regular<br />
                  - Origin: India
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </main>
    </div>
  );
}
