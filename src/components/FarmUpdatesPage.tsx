import React, { useState } from "react";
import { useFarm } from "../context/FarmContext";
import { 
  Sparkles, 
  Calendar, 
  Plus, 
  Image as ImageIcon, 
  ArrowLeft, 
  RefreshCw, 
  Layers, 
  Video, 
  Play, 
  Clock, 
  CheckCircle, 
  Eye, 
  Sliders, 
  Info, 
  FileText, 
  Trash2,
  Lock,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Curated Real High-Quality Farm Photos (Unsplash)
const PHOTO_PRESETS = [
  {
    name: "Coop Broiler Feeding",
    category: "Chicken",
    url: "https://images.unsplash.com/photo-1516253593875-bd7ba052fbc5?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Free Range Hens",
    category: "Chicken",
    url: "https://images.unsplash.com/photo-1548550123-94f1067bc16f?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Egg Sorting Harvest",
    category: "Chicken",
    url: "https://images.unsplash.com/photo-1598965402089-897db520192b?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Smart Bio-Secure Barn",
    category: "General",
    url: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Berkshire Hogs Herd",
    category: "Pig",
    url: "https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Straw Bedded Piglets",
    category: "Pig",
    url: "https://images.unsplash.com/photo-1516802273409-68526ee1bdd6?w=800&auto=format&fit=crop&q=80",
  },
];

// Curated Real Free Stock Farm Videos (Mixkit direct MP4 loops)
const VIDEO_PRESETS = [
  {
    name: "Chickens Feeding Session",
    url: "https://assets.mixkit.co/videos/preview/mixkit-poultry-farm-chickens-caged-and-eating-40097-large.mp4",
  },
  {
    name: "Egg Collecting Harvest",
    url: "https://assets.mixkit.co/videos/preview/mixkit-man-harvesting-eggs-from-a-chicken-coop-40096-large.mp4",
  },
  {
    name: "Piglets Resting Bed",
    url: "https://assets.mixkit.co/videos/preview/mixkit-little-piglet-sleeping-on-the-hay-40098-large.mp4",
  },
  {
    name: "Open Field Chicken Run",
    url: "https://assets.mixkit.co/videos/preview/mixkit-flock-of-hens-running-around-the-courtyard-40095-large.mp4",
  },
];

export default function FarmUpdatesPage() {
  const { farmUpdates, currentUser, createFarmUpdate, navigate } = useFarm();
  
  // Tab Filters
  const [filter, setFilter] = useState<"all" | "Chicken" | "Pig" | "videos">("all");
  const [activeTab, setActiveTab] = useState<"news" | "admin_upload">("news");

  // Admin Upload state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"Chicken" | "Pig" | "General">("Chicken");
  const [imageUrl, setImageUrl] = useState(PHOTO_PRESETS[0].url);
  const [videoUrl, setVideoUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active playing video state
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  // Handle Publishing new update
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert("Please provide a valid Title and Operational Description.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createFarmUpdate(
        title.trim(),
        description.trim(),
        category,
        imageUrl,
        videoUrl.trim() || undefined
      );

      alert("Success! The operational update has been successfully saved to Appwrite and published to the feed.");
      
      // Reset Admin Form inputs
      setTitle("");
      setDescription("");
      setCategory("Chicken");
      setImageUrl(PHOTO_PRESETS[0].url);
      setVideoUrl("");
      setActiveTab("news");
    } catch (err: any) {
      alert(`Publishing operational log failed: ${err.message || String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter Updates
  const filteredUpdates = farmUpdates.filter((item) => {
    if (filter === "all") return true;
    if (filter === "videos") return !!item.videoUrl;
    return item.type === filter;
  });

  return (
    <div className="h-full flex flex-col pb-24 text-left">
      {/* Dynamic Trust Infrastructure Tag */}
      <div className="flex md:flex-row flex-col md:justify-between md:items-center gap-4 mb-6 pt-2">
        <div>
          <h2 className="text-2xl font-black font-display tracking-tight text-white flex items-center gap-2">
            <Layers className="text-gold-accent w-6 h-6 animate-pulse" /> Live Operational Logs
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Browse real feeding audits, bio-security reports, layer counts, and live piggery incubator statuses.
          </p>
        </div>

        {/* Live Status indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 border border-white/5 rounded-xl shrink-0 self-start md:self-auto">
          <span className="w-2 h-2 bg-[#00E676] rounded-full animate-ping" />
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-300 font-semibold">
            Telemetry Secured
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-[10px] font-mono text-slate-400">
            Last feeding: 14m ago
          </span>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="flex border-b border-white/10 mb-6 bg-slate-950/60 p-1 rounded-xl glass-panel">
        <button
          onClick={() => setActiveTab("news")}
          className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "news" 
              ? "bg-gold-accent text-slate-950 shadow-md" 
              : "text-slate-400 hover:text-white"
          }`}
        >
          📰 Operational News Feed
        </button>

        {currentUser?.isAdmin && (
          <button
            onClick={() => setActiveTab("admin_upload")}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "admin_upload" 
                ? "bg-[#00E676] text-slate-950 shadow-md" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Post Operational Log (Admin)
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        <AnimatePresence mode="wait">
          {activeTab === "news" ? (
            <motion.div
              key="news-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Filter controls */}
              <div className="flex flex-wrap items-center gap-2 bg-slate-900/35 p-2 rounded-xl border border-white/5">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase px-2 tracking-widest flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-gold-accent" /> Filter Activities:
                </span>
                
                <button
                  onClick={() => setFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filter === "all"
                      ? "bg-slate-850 border border-white/20 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  All Logs
                </button>

                <button
                  onClick={() => setFilter("Chicken")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    filter === "Chicken"
                      ? "bg-green-accent/20 border border-green-accent/30 text-green-accent"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  🐔 Poultry Yards
                </button>

                <button
                  onClick={() => setFilter("Pig")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    filter === "Pig"
                      ? "bg-gold-accent/20 border border-gold-accent/30 text-gold-accent"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  🐷 Piggeries
                </button>

                <button
                  onClick={() => setFilter("videos")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    filter === "videos"
                      ? "bg-cyan-500/20 border border-cyan-400/30 text-cyan-400"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  📹 Video Records
                </button>
              </div>

              {/* Feed Card Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
                {filteredUpdates.length === 0 ? (
                  <div className="col-span-full py-12 text-center glass-panel rounded-2xl">
                    <Info className="w-8 h-8 text-slate-500 mx-auto mb-3" />
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">No matching logs logged yet</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      Adjust your active filter tabs, or check back later as administrators dispatch feed summaries.
                    </p>
                  </div>
                ) : (
                  filteredUpdates.map((item) => (
                    <motion.div
                      layout
                      key={item.id}
                      className="glass-panel hover:border-white/15 bg-slate-950/30 hover:bg-slate-950/50 rounded-2xl overflow-hidden group transition-all duration-300 flex flex-col border border-white/5 relative shadow-lg"
                    >
                      {/* Media Header */}
                      <div className="w-full h-52 bg-slate-950 relative overflow-hidden shrink-0 border-b border-white/5">
                        
                        {/* Video attachment logic */}
                        {item.videoUrl && playingVideoId === item.id ? (
                          <div className="absolute inset-0 z-10 bg-black">
                            <video
                              src={item.videoUrl}
                              controls
                              autoPlay
                              className="w-full h-full object-contain"
                              referrerPolicy="no-referrer"
                            />
                            <button
                              onClick={() => setPlayingVideoId(null)}
                              className="absolute top-3 right-3 bg-black/80 backdrop-blur-md text-white border border-white/25 hover:bg-red-500 hover:text-white px-2 py-1 rounded-lg text-[10px] font-mono tracking-widest uppercase font-bold transition-all z-20"
                            >
                              Exit Video X
                            </button>
                          </div>
                        ) : null}

                        {/* Static Thumbnail Image */}
                        <img
                          src={item.imageUrl || "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&auto=format&fit=crop&q=80"}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-all duration-500"
                        />

                        {/* Dark Vignette Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                        {/* Category Badge */}
                        <span className={`absolute top-4 left-4 text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider backdrop-blur-md shadow-md ${
                          item.type === "Chicken"
                            ? "bg-green-accent/80 text-white border border-white/10"
                            : item.type === "Pig"
                            ? "bg-gold-accent/80 text-slate-950 border border-white/10"
                            : "bg-blue-600/80 text-white border border-white/10"
                        }`}>
                          {item.type === "Chicken" ? "🐔 Poultry" : item.type === "Pig" ? "🐷 Hog Breeding" : "🦾 Technical Logistics"}
                        </span>

                        {/* Video Play Trigger Indicator Overlay */}
                        {item.videoUrl && (
                          <button
                            onClick={() => setPlayingVideoId(item.id)}
                            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/45 transition-all group-2 focus:outline-none"
                          >
                            <div className="w-14 h-14 rounded-full bg-gold-accent hover:bg-yellow-500 text-slate-950 flex items-center justify-center shadow-2xl hover:scale-110 transition-all border-4 border-slate-950">
                              <Play className="w-5 h-5 fill-slate-950 translate-x-0.5" />
                            </div>
                            <span className="absolute bottom-4 right-4 bg-slate-950/85 backdrop-blur-md text-cyan-400 border border-cyan-400/20 rounded-lg px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider flex items-center gap-1 font-bold">
                              <Video className="w-3 h-3 text-cyan-400" /> Watch Feed Loop
                            </span>
                          </button>
                        )}
                      </div>

                      {/* Info Body */}
                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div>
                          {/* Log Metadata Header */}
                          <div className="flex items-center gap-3 text-slate-400 text-[10px] mb-3 font-mono font-bold tracking-wider">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-gold-accent" />
                              {new Date(item.createdAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric"
                              })}
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {new Date(item.createdAt).toLocaleTimeString(undefined, {
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>
                          </div>

                          <h3 className="text-md font-black text-white hover:text-gold-accent transition-all mb-2.5 leading-snug tracking-tight">
                            {item.title}
                          </h3>

                          <p className="text-xs text-slate-300 leading-relaxed font-normal mb-4 block whitespace-pre-wrap">
                            {item.content}
                          </p>
                        </div>

                        {/* Trust Assurance Badge */}
                        <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400 font-medium">
                          <span className="flex items-center gap-1.5 text-green-accent">
                            <CheckCircle className="w-3.5 h-3.5" /> Checked & Audited
                          </span>
                          <span className="uppercase text-slate-500 font-bold tracking-widest text-[8px]">
                            ID: {item.id}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="admin-upload-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-24"
            >
              {/* Creator Form - Col 7 */}
              <div className="lg:col-span-7 glass-panel p-6 rounded-2xl space-y-5 border border-[#00E676]/20 bg-slate-950/20">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                  <div className="w-10 h-10 bg-[#00E676]/10 rounded-xl flex items-center justify-center text-[#00E676]">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">Create Official Farm Log</h3>
                    <p className="text-[10px] text-slate-400">Post photos, video records, and feeding status telemetry logs.</p>
                  </div>
                </div>

                <form onSubmit={handlePublish} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-300 uppercase mb-1.5 font-bold tracking-wider">
                      Log Category / Activity Type
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["Chicken", "Pig", "General"] as const).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setCategory(cat);
                            // Auto-set preset image of this category
                            const matchedPreset = PHOTO_PRESETS.find(p => p.category === cat);
                            if (matchedPreset) setImageUrl(matchedPreset.url);
                          }}
                          className={`py-2 text-xs font-bold rounded-lg uppercase tracking-wider transition-all border ${
                            category === cat
                              ? "bg-slate-900 text-gold-accent border-gold-accent/50 shadow-md"
                              : "bg-slate-950/50 text-slate-400 border-white/5 hover:border-white/10"
                          }`}
                        >
                          {cat === "Chicken" ? "🐔 Poultry" : cat === "Pig" ? "🐷 Piggery" : "📡 General"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-300 uppercase mb-1.5 font-bold tracking-wider">
                      Operational Title
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Feeding Session #14 on Broiler Yard A Completes"
                      className="w-full glass-input rounded-xl p-3.5 text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-gold-accent font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-300 uppercase mb-1.5 font-bold tracking-wider">
                      Detailed Audit Log / Description
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Discuss water intake metrics, protein pellet levels, weight parameters, bio-security score levels, or harvest updates..."
                      className="w-full glass-input rounded-xl p-3.5 text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-gold-accent leading-relaxed font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-300 uppercase mb-1.5 font-bold tracking-wider">
                      Associated Image URL
                    </label>
                    <input
                      type="text"
                      required
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="w-full glass-input rounded-xl p-3.5 text-xs text-white placeholder-slate-500 font-mono"
                    />

                    {/* Quick presets list for gorgeous immediate results */}
                    <div className="mt-3 bg-slate-950/40 p-3 rounded-xl border border-white/5">
                      <span className="text-[9px] font-mono uppercase text-slate-400 block mb-2 font-bold tracking-wider">
                        Select Real Farm Photo Presets:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {PHOTO_PRESETS.map((p) => (
                          <button
                            key={p.name}
                            type="button"
                            onClick={() => {
                              setImageUrl(p.url);
                              // Sync category type
                              if (p.category === "Chicken" || p.category === "Pig") {
                                setCategory(p.category);
                              } else {
                                setCategory("General");
                              }
                            }}
                            className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-left text-[9px] font-mono font-semibold truncate transition-all ${
                              imageUrl === p.url
                                ? "bg-slate-900 border-gold-accent text-gold-accent"
                                : "bg-slate-950/40 border-white/5 hover:border-white/10 text-slate-300"
                            }`}
                          >
                            <img src={p.url} alt={p.name} referrerPolicy="no-referrer" className="w-5 h-5 rounded object-cover shrink-0" />
                            <span className="truncate">{p.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-300 uppercase mb-1.5 font-bold tracking-wider">
                      Associated Video Mp4 URL (Optional Video Attachments)
                    </label>
                    <input
                      type="text"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="e.g. https://assets.mixkit.co/videos/preview/..."
                      className="w-full glass-input rounded-xl p-3.5 text-xs text-white placeholder-slate-500 font-mono focus:ring-1 focus:ring-gold-accent"
                    />

                    {/* Video presets */}
                    <div className="mt-3 bg-slate-950/40 p-3 rounded-xl border border-white/5">
                      <span className="text-[9px] font-mono uppercase text-slate-400 block mb-2 font-bold tracking-wider">
                        Select Curated Feeding/Harvest Video Loops:
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {VIDEO_PRESETS.map((v) => (
                          <button
                            key={v.name}
                            type="button"
                            onClick={() => setVideoUrl(v.url)}
                            className={`flex items-center gap-2 p-2 rounded-lg border text-left text-[9px] font-mono font-bold transition-all ${
                              videoUrl === v.url
                                ? "bg-slate-900 border-cyan-400 text-cyan-400"
                                : "bg-slate-950/40 border-white/5 hover:border-white/10 text-slate-300"
                            }`}
                          >
                            <Play className="w-3 h-3 text-cyan-400 shrink-0" />
                            <span className="truncate">{v.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-[#00E676] hover:bg-green-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg flex items-center justify-center gap-1.5 mt-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin w-4 h-4 text-slate-950" />
                        Saving to Appwrite Database...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 text-slate-950" />
                        Dispatch Operational Update
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Dynamic Live Preview Panel - Col 5 */}
              <div className="lg:col-span-5 space-y-4">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block tracking-widest px-1">
                  👁️ Investor Feed Preview
                </span>

                <div className="glass-panel p-5 rounded-2xl border border-gold-accent/20 bg-slate-950/40 pointer-events-none opacity-85 space-y-4">
                  <div className="w-full h-44 rounded-xl overflow-hidden bg-slate-950 relative border border-white/5">
                    <img
                      src={imageUrl || "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&auto=format&fit=crop&q=80"}
                      alt="Preview placeholder"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    
                    <span className="absolute top-3 left-3 text-[8px] font-black px-2 py-1 bg-gold-accent text-slate-950 rounded uppercase font-mono border border-white/10">
                      {category} Preview
                    </span>

                    {videoUrl && (
                      <span className="absolute bottom-3 right-3 bg-cyan-500/95 backdrop-blur-md text-slate-950 rounded px-2 py-0.5 text-[8px] font-mono uppercase tracking-wider flex items-center gap-1 font-bold">
                        <Video className="w-2.5 h-2.5" /> Video Enabled
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-slate-500 text-[9px] mb-2 font-mono">
                      <Calendar className="w-3 h-3 text-gold-accent" />
                      {new Date().toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                      })}
                      <span>•</span>
                      <Clock className="w-3 h-3" />
                      {new Date().toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </div>

                    <h4 className="text-sm font-bold text-white mb-2 leading-snug">
                      {title.trim() || "Select Operational title..."}
                    </h4>

                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-4">
                      {description.trim() || "Type detailed description to view live layout on simulated investor feeds..."}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex justify-between items-center text-[9px] font-mono text-slate-500">
                    <span className="text-green-accent flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Audited Update Status
                    </span>
                    <span>ID: upd_preview</span>
                  </div>
                </div>

                <div className="bg-slate-950/40 border border-white/5 p-4 rounded-xl text-[10px] font-mono leading-relaxed text-slate-400">
                  <Info className="w-4 h-4 text-gold-accent shrink-0 mb-1 inline-block mr-2" />
                  All farm live updates published on Appwrite will display instantly on global user investor dashboards dynamically.
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
