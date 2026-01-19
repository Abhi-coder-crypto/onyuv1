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
// Import asset paths directly to ensure they are available
import logoImg from "@assets/WhatsApp_Image_2026-01-13_at_4.42.21_PM-Photoroom_1768302850224.png";
import fullSleeveImg from "@assets/Front_1768630971724.png";
import fullSleeveBack from "@assets/Back_1768630971723.png";
import fullSleeveLeft from "@assets/left_1768630971723.png";
import fullSleeveRight from "@assets/Right_1768630971723.png";
import shirtHalfFront from "@assets/Gemini_Generated_Image_fpu0u0fpu0u0fpu0-removebg-preview_1768799597473.png";
import shirtHalfBack from "@assets/Back_1768630945204.png";
import shirtHalfLeft from "@assets/Left_1768630945204.png";
import shirtHalfRight from "@assets/Right_1768630945204.png";

const HALF_SLEEVE_SHIRTS = [
  { id: 1, image: shirtHalfFront, name: "Half Sleeve Front", type: "half" },
  { id: 2, image: shirtHalfBack, name: "Half Sleeve Back", type: "half" },
  { id: 3, image: shirtHalfRight, name: "Half Sleeve Left", type: "half" },
  { id: 4, image: shirtHalfLeft, name: "Half Sleeve Right", type: "half" },
];

const FULL_SLEEVE_SHIRTS = [
  { id: 5, image: fullSleeveImg, name: "Full Sleeve Front", type: "full" },
  { id: 6, image: fullSleeveBack, name: "Full Sleeve Back", type: "full" },
  { id: 7, image: fullSleeveRight, name: "Full Sleeve Left", type: "full" },
  { id: 8, image: fullSleeveLeft, name: "Full Sleeve Right", type: "full" },
];

export default function ShirtLandingPage() {
  const [selectedVariant, setSelectedVariant] = useState(HALF_SLEEVE_SHIRTS[0]);

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
            <Link href="/" className="text-base font-bold uppercase tracking-[0.2em] whitespace-nowrap hover:text-primary/70 transition-colors">Home</Link>
            <a href="#" className="text-base font-bold uppercase tracking-[0.2em] whitespace-nowrap hover:text-primary/70 transition-colors">New Arrivals</a>
            <a href="#" className="text-base font-bold uppercase tracking-[0.2em] whitespace-nowrap hover:text-primary/70 transition-colors">Trending</a>
            <div className="flex items-center gap-1 cursor-pointer group whitespace-nowrap relative">
              <span className="text-base font-bold uppercase tracking-[0.2em] group-hover:text-primary/70 transition-colors">Categories</span>
              <ChevronDown className="w-5 h-5 group-hover:text-primary/70 transition-colors" />
              
              {/* Dropdown Menu */}
              <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-black/5 shadow-2xl rounded-2xl py-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                <Link href="/shirts" className="block px-6 py-2 text-sm font-bold uppercase tracking-widest hover:bg-zinc-50 transition-colors text-black">Shirts</Link>
                <Link href="/" className="block px-6 py-2 text-sm font-bold uppercase tracking-widest hover:bg-zinc-50 transition-colors text-black">T-Shirts</Link>
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
          <span className="text-black font-semibold">Premium Oxford Shirt</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          {/* Left: Product Images */}
          <div className="lg:col-span-7 space-y-6">
            <div className="relative group bg-zinc-100 rounded-3xl overflow-hidden aspect-[4/5] flex items-center justify-center border border-black/5">
              <img 
                src={selectedVariant.image} 
                alt="Product main view" 
                className="w-full h-full object-contain p-12 transition-transform duration-700 group-hover:scale-105"
              />
              
              {/* Try On Button Overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/5 backdrop-blur-[2px]">
                <Link href={`/try-on-shirt?type=${selectedVariant.type}`}>
                  <Button size="lg" className="rounded-full px-8 py-6 h-auto text-lg font-bold shadow-2xl bg-black text-white hover:bg-black/90 hover-elevate active-elevate-2">
                    <Zap className="mr-2 w-6 h-6 fill-current text-white" />
                    TRY ON NOW
                  </Button>
                </Link>
              </div>
            </div>

            {/* Thumbnails */}
            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-black/40 px-1">Half Sleeves</h3>
                <div className="grid grid-cols-4 gap-4">
                  {HALF_SLEEVE_SHIRTS.map((shirt) => (
                    <button
                      key={shirt.id}
                      onClick={() => setSelectedVariant(shirt)}
                      className={`relative group bg-zinc-50 rounded-2xl aspect-square flex flex-col items-center justify-center overflow-hidden border transition-all duration-300 ${
                        selectedVariant.id === shirt.id ? 'border-black ring-1 ring-black/20' : 'border-black/5 hover:border-black/20'
                      }`}
                    >
                      <img 
                        src={shirt.image} 
                        alt={shirt.name} 
                        className="w-full h-2/3 object-contain p-2 transition-transform duration-500 group-hover:scale-110"
                      />
                      <span className="text-[8px] font-bold uppercase tracking-widest mt-1 mb-1 text-center px-1">{shirt.name}</span>
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-4 h-4 rounded-full bg-black flex items-center justify-center">
                          <Zap className="w-2 h-2 text-white fill-current" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-black/40 px-1">Full Sleeves</h3>
                <div className="grid grid-cols-4 gap-4">
                  {FULL_SLEEVE_SHIRTS.map((shirt) => (
                    <button
                      key={shirt.id}
                      onClick={() => setSelectedVariant(shirt)}
                      className={`relative group bg-zinc-50 rounded-2xl aspect-square flex flex-col items-center justify-center overflow-hidden border transition-all duration-300 ${
                        selectedVariant.id === shirt.id ? 'border-black ring-1 ring-black/20' : 'border-black/5 hover:border-black/20'
                      }`}
                    >
                      <img 
                        src={shirt.image} 
                        alt={shirt.name} 
                        className="w-full h-2/3 object-contain p-2 transition-transform duration-500 group-hover:scale-110"
                      />
                      <span className="text-[8px] font-bold uppercase tracking-widest mt-1 mb-1 text-center px-1">{shirt.name}</span>
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-4 h-4 rounded-full bg-black flex items-center justify-center">
                          <Zap className="w-2 h-2 text-white fill-current" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Product Info */}
          <div className="lg:col-span-5 space-y-10">
            <div className="space-y-4">
              <Badge variant="secondary" className="rounded-full px-4 py-1 uppercase tracking-[0.2em] text-[10px] font-bold border-black/5 bg-zinc-100 text-black">
                Bestseller
              </Badge>
              <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tighter text-black">Premium Oxford Shirt</h1>
              <p className="text-muted-foreground text-sm uppercase tracking-widest">White Classic Fit</p>
              
              <div className="flex items-center gap-4 pt-2">
                <div className="flex text-black">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">4.9 (86 reviews)</span>
              </div>
            </div>

            <div className="flex items-baseline gap-4">
              <span className="text-4xl font-bold tracking-tighter text-black">₹4,250.00</span>
              <span className="text-lg text-muted-foreground line-through">₹5,999.00</span>
              <Badge variant="destructive" className="rounded-full bg-red-100 text-red-600 border-none font-bold">29% OFF</Badge>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-widest text-black">Available Colors:</span>
                  <span className="text-xs text-muted-foreground">Classic White</span>
                </div>
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-white border border-black/10 ring-2 ring-black ring-offset-2 ring-offset-white cursor-pointer" />
                  <div className="w-10 h-10 rounded-full bg-blue-100 border border-black/10 hover:ring-black/30 cursor-pointer" />
                  <div className="w-10 h-10 rounded-full bg-zinc-200 border border-black/10 hover:ring-black/30 cursor-pointer" />
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
                  Premium oxford shirt made from high-quality cotton. Features a classic fit with a button-down collar, perfect for both formal and smart-casual occasions.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="details" className="border-b border-black/5">
                <AccordionTrigger className="text-xs font-bold uppercase tracking-[0.2em] hover:no-underline text-black">Product Details</AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm">
                  - 100% Premium Cotton<br />
                  - Button-down Collar<br />
                  - Adjustable Cuffs<br />
                  - Reinforced Buttons
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </main>
    </div>
  );
}
