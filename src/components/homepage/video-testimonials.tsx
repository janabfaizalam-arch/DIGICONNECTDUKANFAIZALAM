"use client";

import React, { useRef, useState } from "react";
import { Star, Play, Pause, Video, CheckCircle } from "lucide-react";

interface VideoTestimonial {
  id: number;
  name: string;
  service: string;
  quote: string;
  videoUrl: string;
  rating: number;
}

const testimonials: VideoTestimonial[] = [
  {
    id: 1,
    name: "Rohan Malhotra",
    service: "GST Registration Completed",
    quote: "Applied online and within 3 days my GST number was issued! Seamless support on WhatsApp.",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-man-holding-smartphone-looking-at-screen-smiling-40118-large.mp4",
    rating: 5
  },
  {
    id: 2,
    name: "Pooja Sharma",
    service: "Passport Application Approved",
    quote: "Very helpful guidance for my fresh passport filing. Got my appointment slot booked instantly.",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-young-woman-holding-smartphone-smiling-40092-large.mp4",
    rating: 5
  },
  {
    id: 3,
    name: "Anil K. Verma",
    service: "CIBIL Score Health Repair",
    quote: "Highly recommended consulting. They explained my credit report remarks clearly and resolved disputes.",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-woman-working-on-laptop-and-smiling-39931-large.mp4",
    rating: 5
  }
];

function VideoCard({ item }: { item: VideoTestimonial }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  return (
    <div 
      className="relative w-[260px] md:w-full aspect-[9/16] max-h-[480px] rounded-3xl overflow-hidden border border-white/45 shadow-lg group select-none shrink-0 snap-start snap-always"
      onClick={togglePlay}
    >
      {/* Autoplay Portrait Video */}
      <video
        ref={videoRef}
        src={item.videoUrl}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-103"
      />

      {/* Dark overlay gradient for readable text */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/10 to-slate-950/45 pointer-events-none" />

      {/* Top Overlay Badge */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/20">
        <CheckCircle className="h-3.5 w-3.5 text-emerald-400 fill-emerald-400/10" />
        <span className="text-[9.5px] font-black text-white uppercase tracking-wider">
          {item.service}
        </span>
      </div>

      {/* Play/Pause indicator */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white">
          {isPlaying ? <Pause className="h-5 w-5 fill-white" /> : <Play className="h-5 w-5 fill-white ml-0.5" />}
        </div>
      </div>

      {/* Bottom Text Overlay */}
      <div className="absolute bottom-0 inset-x-0 p-5 text-left space-y-2.5 pointer-events-auto">
        
        {/* Rating */}
        <div className="flex gap-0.5">
          {Array.from({ length: item.rating }).map((_, i) => (
            <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          ))}
        </div>

        {/* Customer Comment Bubble */}
        <div className="rounded-2xl border border-white/25 bg-white/12 backdrop-blur-md p-3.5 shadow-sm">
          <p className="text-[11.5px] font-bold text-white leading-relaxed line-clamp-3">
            &ldquo;{item.quote}&rdquo;
          </p>
        </div>

        {/* User profile identifier */}
        <div className="flex items-center gap-2 pt-1">
          <div className="h-7 w-7 rounded-full bg-blue-500/30 text-white font-black text-xs flex items-center justify-center border border-white/20 shrink-0">
            {item.name.slice(0, 1)}
          </div>
          <div>
            <span className="text-[11.5px] font-black text-white block leading-tight">{item.name}</span>
            <span className="text-[9.5px] font-semibold text-slate-300 block mt-0.5">Verified Customer</span>
          </div>
        </div>

      </div>
    </div>
  );
}

export function VideoTestimonials() {
  return (
    <section className="bg-white py-12 px-4 relative overflow-hidden">
      {/* Ambient background blur */}
      <div className="absolute top-1/2 right-1/4 w-[350px] h-[350px] rounded-full bg-purple-500/5 blur-[100px] pointer-events-none -translate-y-1/2" />

      <div className="container-shell max-w-[1600px] mx-auto relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-[10px] font-black uppercase tracking-wider text-purple-600 flex items-center justify-center gap-1.5">
            <Video className="h-3.5 w-3.5 text-purple-500" /> Video Testimonials
          </p>
          <h2 className="mt-1.5 text-xl md:text-2xl font-black tracking-tight text-slate-850">
            Real Customer Stories
          </h2>
          <p className="mt-2 text-xs font-semibold text-slate-450 leading-relaxed max-w-sm mx-auto">
            Short reels, vertical portrait formats, and verified reviews highlighting how we speed up online compliance.
          </p>
        </div>

        {/* Video Cards list */}
        {/* Mobile: horizontal snap scroll; Desktop: 3-column grid */}
        <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 snap-x snap-mandatory md:grid md:grid-cols-3 md:gap-6 md:px-0 md:mx-0">
          {testimonials.map((item) => (
            <VideoCard key={item.id} item={item} />
          ))}
        </div>

      </div>
    </section>
  );
}
