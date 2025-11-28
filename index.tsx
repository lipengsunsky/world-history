import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { 
  History, 
  Swords, 
  Handshake, 
  Globe, 
  Network, 
  Loader2, 
  ChevronRight, 
  ChevronLeft,
  Info,
  Play,
  Pause,
  RefreshCw,
  Search,
  Moon,
  Sun,
  Monitor,
  BookOpen,
  Landmark,
  Users,
  ScrollText,
  Gavel,
  Coins,
  Shield,
  Palette,
  Maximize2,
  Minimize2,
  Languages,
  Settings,
  X,
  ZoomIn,
  ZoomOut,
  Library
} from 'lucide-react';

// --- Types ---

interface Person {
  name: string;
  role: string;
  lifespan: string; // e.g., "100 BC - 44 BC"
  impact: string;
  works: string;
}

interface Civilization {
  name: string;
  lat: number;
  lng: number;
  radiusKm: number;
  color: string;
  overview: string;
  government: {
    type: string; // e.g. "Imperial Monarchy"
    leaders: string[]; // Current significant leaders
    structure: string; // Brief on political system
    parties: string; // Major factions or parties
  };
  society: {
    population: string; // Estimate
    economy: string; // Major goods, currency, trade
    military: string; // Strength, unique units
    culture: string; // Religion, art, philosophy
  };
  figures: Person[];
  sources: string[]; // Academic sources
}

interface Interaction {
  type: 'conflict' | 'trade' | 'culture' | 'diplomacy';
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  title: string;
  description: string;
  impact: string;
  participants: string[];
}

interface Node {
  id: string;
  group: string; // 'person' | 'nation' | 'organization'
  radius?: number;
  details?: string;
}

interface Link {
  source: string;
  target: string;
  label?: string; // e.g., "Father of", "Ally", "Rival"
  type?: string; // 'kinship' | 'political' | 'mentor' | 'other'
}

interface RelationshipGraphData {
  nodes: Node[];
  links: Link[];
  description: string;
}

interface HistoricalData {
  year: number;
  summary: string;
  civilizations: Civilization[];
  interactions: Interaction[];
  relationships: RelationshipGraphData;
}

type Lang = 'en' | 'zh';
type Theme = 'light' | 'dark' | 'system';
type Tab = 'overview' | 'politics' | 'society' | 'figures';

// --- Constants & Config ---

declare const d3: any;
declare const topojson: any;

const AI_MODEL = 'gemini-2.5-flash';
const CACHE_PREFIX = 'chronomap_data_';

// Seed data for Year 0 (Offline Demo)
const SEED_DATA_0_AD: HistoricalData = {
  year: 0,
  summary: "The world is dominated by the Pax Romana in the West and the Han Dynasty in the East. It is a period of relative stability, flourishing trade via the Silk Road, and significant cultural consolidation.",
  civilizations: [
    {
      name: "Roman Empire",
      lat: 41.9, lng: 12.5, radiusKm: 2500, color: "#ef4444",
      overview: "A vast empire controlling the Mediterranean, known for law, engineering, and military prowess.",
      government: {
        type: "Principate",
        leaders: ["Augustus"],
        structure: "Centralized authority under the Emperor with a symbolic Senate.",
        parties: "Optimates vs Populares remnants"
      },
      society: {
        population: "~45 Million",
        economy: "Agrarian, extensive trade networks.",
        military: "Professional Legions.",
        culture: "Greco-Roman polytheism, rise of stoicism."
      },
      figures: [
        { name: "Augustus", role: "Emperor", lifespan: "63 BC - 14 AD", impact: "Founded the Principate.", works: "Res Gestae" },
        { name: "Ovid", role: "Poet", lifespan: "43 BC - 17 AD", impact: "Influential Latin literature.", works: "Metamorphoses" }
      ],
      sources: ["Cambridge Ancient History Vol. X", "The Roman Empire: Economy, Society and Culture (Garnsey & Saller)"]
    },
    {
      name: "Han Dynasty",
      lat: 34.3, lng: 108.9, radiusKm: 2200, color: "#eab308",
      overview: "The golden age of Chinese history, characterized by economic prosperity and Confucian governance.",
      government: {
        type: "Imperial Monarchy",
        leaders: ["Emperor Ping"],
        structure: "Centralized bureaucracy.",
        parties: "Consort kin factions"
      },
      society: {
        population: "~58 Million",
        economy: "Silk production, iron monopoly.",
        military: "Conscript army.",
        culture: "Confucianism as state orthodoxy."
      },
      figures: [
        { name: "Wang Mang", role: "Official", lifespan: "45 BC - 23 AD", impact: "Usurper, reforms.", works: "New policies" }
      ],
      sources: ["The Cambridge History of China, Vol. 1", "Records of the Grand Historian (Shiji)"]
    }
  ],
  interactions: [
    {
      type: "trade", fromLat: 34.3, fromLng: 108.9, toLat: 41.9, toLng: 12.5,
      title: "Silk Road",
      description: "Indirect trade network connecting Han China and Rome.",
      impact: "Exchange of silk, gold, glassware, and culture.",
      participants: ["Han Empire", "Parthian Empire", "Roman Empire"]
    }
  ],
  relationships: {
    description: "Key geopolitical balance.",
    nodes: [
      { id: "Augustus", group: "person" },
      { id: "Roman Empire", group: "nation" },
      { id: "Han Dynasty", group: "nation" },
      { id: "Silk Road", group: "organization" }
    ],
    links: [
      { source: "Augustus", target: "Roman Empire", label: "Ruler" },
      { source: "Han Dynasty", target: "Roman Empire", label: "Trade" }
    ]
  }
};

const TRANSLATIONS = {
  en: {
    title: "ChronoMap AI",
    subtitle: "Historical World Visualizer",
    analyzing: "Analyzing",
    searching: "Searching",
    searchPlaceholder: "Search event, person, or era...",
    interactionTypes: "Interactions",
    refresh: "Regenerate",
    settings: "Settings",
    themeSystem: "System Default",
    themeLight: "Light Mode",
    themeDark: "Dark Mode",
    language: "Language",
    jumpTo: "Jump to",
    tabs: {
      overview: "Overview",
      politics: "Politics",
      society: "Society",
      figures: "Figures"
    },
    sections: {
      govt: "Government",
      leaders: "Leaders",
      parties: "Factions/Parties",
      pop: "Population",
      eco: "Economy",
      mil: "Military",
      cult: "Culture",
      impact: "Impact",
      works: "Works",
      sources: "Academic Sources"
    },
    loadingLocal: "Loading from local archives...",
    selectLanguage: "Interface Language",
    selectTheme: "Appearance",
    close: "Close"
  },
  zh: {
    title: "历史时空 AI",
    subtitle: "全球历史演变可视化",
    analyzing: "正在研读史料",
    searching: "正在检索",
    searchPlaceholder: "搜索事件、人物或年代...",
    interactionTypes: "互动类型",
    refresh: "重新生成",
    settings: "设置",
    themeSystem: "跟随系统",
    themeLight: "日间模式",
    themeDark: "夜间模式",
    language: "语言",
    jumpTo: "跳转至",
    tabs: {
      overview: "概览",
      politics: "政治军事",
      society: "社会经济",
      figures: "重要人物"
    },
    sections: {
      govt: "政体与架构",
      leaders: "主要领袖",
      parties: "政党与派系",
      pop: "人口概况",
      eco: "经济发展",
      mil: "军事力量",
      cult: "文化思想",
      impact: "历史影响",
      works: "代表作品",
      sources: "学术参考文献"
    },
    loadingLocal: "正在读取本地档案...",
    selectLanguage: "显示语言",
    selectTheme: "外观模式",
    close: "关闭"
  }
};

// --- Helper Components ---

const Tooltip = ({ content, x, y, visible }: { content: React.ReactNode, x: number, y: number, visible: boolean }) => {
  if (!visible) return null;
  return (
    <div 
      className="fixed z-50 bg-slate-900/90 border border-slate-700 text-slate-200 text-sm p-3 rounded shadow-xl backdrop-blur-sm pointer-events-none max-w-sm"
      style={{ top: y + 10, left: x + 10 }}
    >
      {content}
    </div>
  );
};

// --- Main Application ---

const App = () => {
  const [year, setYear] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [searching, setSearching] = useState<boolean>(false);
  const [data, setData] = useState<HistoricalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // UI States
  const [showPanel, setShowPanel] = useState<boolean>(true);
  const [detailMode, setDetailMode] = useState<boolean>(false); 
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedCiv, setSelectedCiv] = useState<Civilization | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  
  // Settings
  const [lang, setLang] = useState<Lang>('zh');
  const [themeMode, setThemeMode] = useState<Theme>('dark');
  const [activeTheme, setActiveTheme] = useState<'light' | 'dark'>('dark');
  const [searchQuery, setSearchQuery] = useState('');
  const [geoData, setGeoData] = useState<any>(null);

  const mapRef = useRef<SVGSVGElement>(null);
  const graphRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<any>(null); // Store zoom behavior
  const svgGroupRef = useRef<any>(null); // Store reference to the <g> being transformed

  const [tooltipState, setTooltipState] = useState({ visible: false, x: 0, y: 0, content: null as React.ReactNode });

  const t = TRANSLATIONS[lang];

  // Theme Logic
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateTheme = () => {
      if (themeMode === 'system') setActiveTheme(mediaQuery.matches ? 'dark' : 'light');
      else setActiveTheme(themeMode);
    };
    updateTheme();
    mediaQuery.addEventListener('change', updateTheme);
    return () => mediaQuery.removeEventListener('change', updateTheme);
  }, [themeMode]);

  const themeColors = useMemo(() => ({
    mapBg: activeTheme === 'dark' ? '#0f172a' : '#f8fafc',
    land: activeTheme === 'dark' ? '#1e293b' : '#cbd5e1',
    stroke: activeTheme === 'dark' ? '#334155' : '#94a3b8',
    text: activeTheme === 'dark' ? '#f1f5f9' : '#0f172a',
    subtext: activeTheme === 'dark' ? '#94a3b8' : '#64748b',
    panelBg: activeTheme === 'dark' ? '#0f172a' : '#ffffff',
    panelBorder: activeTheme === 'dark' ? '#1e293b' : '#e2e8f0',
    highlight: '#6366f1',
    modalOverlay: activeTheme === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)',
    modalBg: activeTheme === 'dark' ? '#1e293b' : '#ffffff',
  }), [activeTheme]);

  // Load GeoJSON
  useEffect(() => {
    fetch('https://unpkg.com/world-atlas@2.0.2/countries-110m.json')
      .then(res => res.json())
      .then(topology => setGeoData(topojson.feature(topology, topology.objects.countries)));
    
    // Initial Load
    const cached = localStorage.getItem(`${CACHE_PREFIX}0`);
    if (cached) {
      setData(JSON.parse(cached));
    } else {
      setData(SEED_DATA_0_AD);
      localStorage.setItem(`${CACHE_PREFIX}0`, JSON.stringify(SEED_DATA_0_AD));
    }
  }, []);

  // Keyboard Navigation
  const updateYear = (amount: number) => {
    setYear(prev => {
      const next = prev + amount;
      if (next < -3000) return -3000;
      if (next > 2024) return 2024;
      return next;
    });
    setIsPlaying(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent navigation if user is typing in the search input
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      if (e.key === 'ArrowLeft') {
        updateYear(-10);
      } else if (e.key === 'ArrowRight') {
        updateYear(10);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !process.env.API_KEY) return;
    setSearching(true);
    setIsPlaying(false);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Identify the single most significant historical year for: "${searchQuery}". Return JSON: { "year": number }`;
      const result = await ai.models.generateContent({
        model: AI_MODEL,
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { year: { type: Type.INTEGER } } } }
      });
      const json = JSON.parse(result.text || '{}');
      if (json.year !== undefined) setYear(json.year);
    } catch (err) { console.error(err); } 
    finally { setSearching(false); setSearchQuery(''); }
  };

  // Main Data Fetch
  const fetchHistoricalData = async (targetYear: number, forceRefresh = false) => {
    setLoading(true);
    setError(null);
    setSelectedCiv(null); 
    
    const cacheKey = `${CACHE_PREFIX}${targetYear}`;
    if (!forceRefresh) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          setData(JSON.parse(cached));
          setLoading(false);
          return;
        } catch (e) { localStorage.removeItem(cacheKey); }
      }
    }

    if (!process.env.API_KEY) {
      setLoading(false);
      if (targetYear === 0) setData(SEED_DATA_0_AD); 
      else setError("No local data for this year. Connect API Key.");
      return;
    }
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const langInstruction = lang === 'zh' ? "Respond entirely in Chinese (Simplified)." : "Respond in English.";
      
      const prompt = `
        You are an expert Academic Historian (PhD level).
        Generate a strictly accurate historical snapshot for the year ${targetYear >= 0 ? targetYear + ' AD' : Math.abs(targetYear) + ' BC'}.
        ${langInstruction}
        
        CRITICAL REQUIREMENTS:
        1. **Civilizations**: Identify top 4-6 powers. 
           - **Locations**: Lat/Lng must be the specific capital or center of power.
           - **Radius (km)**: MUST represent the *effective* area of control/influence based on historical data. Do not exaggerate.
           - **Details**: Provide rigorous detail for Government, Society, Culture.
           - **Sources**: You MUST provide 1-2 distinct academic sources (Books or Journals) for each civilization.
        
        2. **Interactions**: Identify 3-5 major geopolitical interactions (War, Trade, Diplomacy).
        
        3. **Figures**: Identify 5-8 Key Figures.
        
        4. **Graph**: Relationship Graph (Kinship, Political, Hostile, Mentor).
        
        Return pure JSON.
      `;

      const responseSchema: Schema = {
        type: Type.OBJECT,
        properties: {
          year: { type: Type.INTEGER },
          summary: { type: Type.STRING },
          civilizations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                lat: { type: Type.NUMBER }, lng: { type: Type.NUMBER },
                radiusKm: { type: Type.NUMBER }, color: { type: Type.STRING },
                overview: { type: Type.STRING },
                government: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING }, leaders: { type: Type.ARRAY, items: { type: Type.STRING } },
                    structure: { type: Type.STRING }, parties: { type: Type.STRING }
                  }
                },
                society: {
                  type: Type.OBJECT,
                  properties: {
                    population: { type: Type.STRING }, economy: { type: Type.STRING },
                    military: { type: Type.STRING }, culture: { type: Type.STRING }
                  }
                },
                figures: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING }, role: { type: Type.STRING },
                      lifespan: { type: Type.STRING }, impact: { type: Type.STRING }, works: { type: Type.STRING }
                    }
                  }
                },
                sources: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              }
            }
          },
          interactions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ["conflict", "trade", "culture", "diplomacy"] },
                fromLat: { type: Type.NUMBER }, fromLng: { type: Type.NUMBER },
                toLat: { type: Type.NUMBER }, toLng: { type: Type.NUMBER },
                title: { type: Type.STRING }, description: { type: Type.STRING },
                impact: { type: Type.STRING }, participants: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          },
          relationships: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
              nodes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING }, group: { type: Type.STRING }, details: { type: Type.STRING }
                  }
                }
              },
              links: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    source: { type: Type.STRING }, target: { type: Type.STRING },
                    label: { type: Type.STRING }, type: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      };

      const result = await ai.models.generateContent({
        model: AI_MODEL,
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: responseSchema }
      });

      const parsed = JSON.parse(result.text || '{}');
      setData(parsed);
      localStorage.setItem(cacheKey, JSON.stringify(parsed));

    } catch (err) {
      console.error(err);
      setError("Data unavailable offline. Connect API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchHistoricalData(year), 800);
    return () => clearTimeout(timer);
  }, [year, lang]);

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => setYear(y => (y + 50 > 2024 ? 2024 : y + 50)), 3000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // --- D3 Map Logic with Zoom ---
  useEffect(() => {
    if (!geoData || !mapRef.current) return;
    const svg = d3.select(mapRef.current);
    
    // Clear previous renders BUT keep the zoom structure if possible, or just rebuild.
    // For simplicity, we remove children.
    svg.selectAll("*").remove();

    const width = mapRef.current.clientWidth;
    const height = mapRef.current.clientHeight;

    // Define Zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([1, 8])
      .translateExtent([[0, 0], [width, height]])
      .on("zoom", (event: any) => {
        g.attr("transform", event.transform);
      });

    // Save zoom instance
    zoomRef.current = zoom;
    svg.call(zoom);

    // Group for all map content
    const g = svg.append("g");
    svgGroupRef.current = g;

    const projection = d3.geoMercator()
      .scale(width / 6.5)
      .translate([width / 2, height / 1.6]);
    const path = d3.geoPath().projection(projection);

    // Countries Base Layer
    g.append("g")
      .selectAll("path")
      .data(geoData.features)
      .enter().append("path")
      .attr("d", path)
      .attr("fill", themeColors.land)
      .attr("stroke", themeColors.stroke)
      .attr("stroke-width", 0.5);

    if (data) {
      const defs = svg.append("defs");
      data.civilizations.forEach((civ, i) => {
        const gradientId = `grad-${i}`;
        const gradient = defs.append("radialGradient")
          .attr("id", gradientId).attr("cx", "50%").attr("cy", "50%").attr("r", "50%");
        gradient.append("stop").attr("offset", "0%").attr("stop-color", civ.color).attr("stop-opacity", 0.4);
        gradient.append("stop").attr("offset", "100%").attr("stop-color", civ.color).attr("stop-opacity", 0);

        const [x, y] = projection([civ.lng, civ.lat]) || [0,0];
        // Calculate radius in pixels based on KM at the given latitude
        // Approx 1 degree lat = 111km. At scale(1), projection scale determines pixels per degree.
        // Simplified: (radiusKm / EarthCircumference) * MapWidthFactor
        const r = (civ.radiusKm / 15000) * width * 1.5; 

        // Territory Circle (Influence)
        g.append("circle")
          .attr("cx", x).attr("cy", y).attr("r", Math.max(r, 10))
          .attr("fill", `url(#${gradientId})`)
          .style("mix-blend-mode", activeTheme === 'dark' ? "screen" : "multiply")
          .style("cursor", "pointer")
          .on("click", (e: any) => {
             e.stopPropagation();
             setSelectedCiv(civ);
             setShowPanel(true);
             setDetailMode(true);
          });
          
        // Solid border for "Territory" feel
        g.append("circle")
          .attr("cx", x).attr("cy", y).attr("r", Math.max(r, 10))
          .attr("fill", "none")
          .attr("stroke", civ.color)
          .attr("stroke-width", 1)
          .attr("stroke-dasharray", "4,4")
          .attr("opacity", 0.6)
          .style("pointer-events", "none");

        // Label
        g.append("text")
          .attr("x", x).attr("y", y).attr("dy", ".35em")
          .text(civ.name)
          .attr("text-anchor", "middle")
          .attr("fill", themeColors.text)
          .attr("font-size", "8px")
          .attr("font-weight", "bold")
          .style("text-shadow", activeTheme === 'dark' ? "0 0 4px #000" : "0 0 4px #fff")
          .style("pointer-events", "none");
      });

      // Interactions
      data.interactions.forEach(int => {
        const from = projection([int.fromLng, int.fromLat]);
        const to = projection([int.toLng, int.toLat]);
        if (!from || !to) return;
        const dx = to[0] - from[0], dy = to[1] - from[1], dr = Math.sqrt(dx * dx + dy * dy) * 1.5;
        const color = int.type === 'conflict' ? '#ef4444' : int.type === 'trade' ? '#eab308' : '#3b82f6';
        
        g.append("path")
          .attr("d", `M${from[0]},${from[1]}A${dr},${dr} 0 0,1 ${to[0]},${to[1]}`)
          .attr("fill", "none").attr("stroke", color).attr("stroke-width", 1.5)
          .attr("stroke-dasharray", int.type === 'conflict' ? "4,4" : "none")
          .attr("opacity", 0.6);
      });
    }
    
    // Reset selection
    svg.on("click", () => { setSelectedCiv(null); setDetailMode(false); });

  }, [geoData, data, activeTheme]);

  // Zoom Helpers
  const handleZoomIn = () => {
    if (mapRef.current && zoomRef.current) {
      d3.select(mapRef.current).transition().duration(500).call(zoomRef.current.scaleBy, 1.5);
    }
  };
  const handleZoomOut = () => {
    if (mapRef.current && zoomRef.current) {
      d3.select(mapRef.current).transition().duration(500).call(zoomRef.current.scaleBy, 0.75);
    }
  };

  // --- Graph Logic ---
  useEffect(() => {
    if (!data?.relationships || !graphRef.current) return;
    const svg = d3.select(graphRef.current);
    svg.selectAll("*").remove();
    const width = graphRef.current.clientWidth, height = graphRef.current.clientHeight;

    const simulation = d3.forceSimulation(data.relationships.nodes)
      .force("link", d3.forceLink(data.relationships.links).id((d: any) => d.id).distance(80))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg.append("g").attr("stroke", "#999").attr("stroke-opacity", 0.6)
      .selectAll("line").data(data.relationships.links).join("line").attr("stroke-width", 1);
    
    const node = svg.append("g").attr("stroke", "#fff").attr("stroke-width", 1.5)
      .selectAll("circle").data(data.relationships.nodes).join("circle")
      .attr("r", 5)
      .attr("fill", (d: any) => d.group === 'person' ? '#f472b6' : d.group === 'nation' ? '#60a5fa' : '#a3e635');

    const labels = svg.append("g").selectAll("text").data(data.relationships.nodes).join("text")
      .text((d: any) => d.id).attr("font-size", 9).attr("fill", themeColors.text).attr("dx", 8).attr("dy", 3);

    simulation.on("tick", () => {
      link.attr("x1", (d: any) => d.source.x).attr("y1", (d: any) => d.source.y)
          .attr("x2", (d: any) => d.target.x).attr("y2", (d: any) => d.target.y);
      node.attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y);
      labels.attr("x", (d: any) => d.x).attr("y", (d: any) => d.y);
    });
  }, [data, activeTheme]);

  const formattedYear = year < 0 ? `${Math.abs(year)} BC` : `${year} AD`;
  const styles = activeTheme === 'dark' 
    ? { bg: 'bg-slate-950', text: 'text-slate-100', panel: 'bg-slate-900 border-slate-800', input: 'bg-slate-800 border-slate-700' }
    : { bg: 'bg-slate-50', text: 'text-slate-900', panel: 'bg-white border-slate-200', input: 'bg-slate-100 border-slate-200' };

  return (
    <div className={`relative w-screen h-screen overflow-hidden font-sans transition-colors duration-500 ${styles.bg} ${styles.text}`}>
      <div className="absolute inset-0 z-0" style={{ background: themeColors.mapBg }}><svg ref={mapRef} className="w-full h-full cursor-move"/></div>
      
      {/* Zoom Controls */}
      <div className="absolute bottom-8 right-8 z-20 flex flex-col gap-2">
        <button onClick={handleZoomIn} className={`p-2 rounded-full shadow-lg backdrop-blur border ${styles.panel} hover:bg-slate-500/10 transition-colors`}>
          <ZoomIn size={20} />
        </button>
        <button onClick={handleZoomOut} className={`p-2 rounded-full shadow-lg backdrop-blur border ${styles.panel} hover:bg-slate-500/10 transition-colors`}>
          <ZoomOut size={20} />
        </button>
      </div>

      {/* Header */}
      <div className={`absolute top-4 left-4 right-16 z-20 flex flex-wrap items-center gap-3 p-3 rounded-lg border backdrop-blur-md shadow-sm ${styles.panel}`} style={{maxWidth: 'calc(100% - 80px)'}}>
        <div className="flex items-center gap-3 pr-4 border-r border-slate-500/20">
          <div className="bg-indigo-600 p-2 rounded text-white"><History size={24} /></div>
          <div className="hidden sm:block">
            <h1 className="text-xl font-bold tracking-tight">{t.title}</h1>
            <p className="text-xs opacity-70">{t.subtitle}</p>
          </div>
        </div>
        <form onSubmit={handleSearch} className="flex-1 max-w-md relative group">
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t.searchPlaceholder}
            className={`w-full py-1.5 px-3 pl-9 rounded-md text-sm outline-none ring-offset-0 focus:ring-2 focus:ring-indigo-500 ${styles.input}`} />
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50" size={14} />
        </form>
        <div className="flex gap-2">
          <button onClick={() => setShowSettings(true)} className="p-2 rounded hover:bg-slate-500/10" title={t.settings}><Settings size={18}/></button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm transition-colors" style={{background: themeColors.modalOverlay}}>
          <div className={`w-96 rounded-xl shadow-2xl p-6 border ${styles.panel} animate-in zoom-in-95 duration-200`}>
            <div className="flex justify-between items-center mb-6 border-b border-slate-500/20 pb-4">
              <h2 className="text-xl font-bold flex items-center gap-2"><Settings size={20}/> {t.settings}</h2>
              <button onClick={() => setShowSettings(false)} className="p-1 rounded hover:bg-slate-500/10"><X size={20}/></button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold opacity-70 mb-2">{t.selectLanguage}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setLang('en')} className={`p-2 rounded border flex items-center justify-center gap-2 transition-all ${lang === 'en' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-500/20 hover:border-slate-500/50'}`}>
                    English
                  </button>
                  <button onClick={() => setLang('zh')} className={`p-2 rounded border flex items-center justify-center gap-2 transition-all ${lang === 'zh' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-500/20 hover:border-slate-500/50'}`}>
                    中文
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold opacity-70 mb-2">{t.selectTheme}</label>
                <div className="grid grid-cols-3 gap-2">
                   <button onClick={() => setThemeMode('light')} className={`p-2 rounded border flex flex-col items-center gap-1 text-xs transition-all ${themeMode === 'light' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-500/20 hover:border-slate-500/50'}`}>
                     <Sun size={18}/> {t.themeLight}
                   </button>
                   <button onClick={() => setThemeMode('dark')} className={`p-2 rounded border flex flex-col items-center gap-1 text-xs transition-all ${themeMode === 'dark' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-500/20 hover:border-slate-500/50'}`}>
                     <Moon size={18}/> {t.themeDark}
                   </button>
                   <button onClick={() => setThemeMode('system')} className={`p-2 rounded border flex flex-col items-center gap-1 text-xs transition-all ${themeMode === 'system' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-500/20 hover:border-slate-500/50'}`}>
                     <Monitor size={18}/> {t.themeSystem}
                   </button>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-4 border-t border-slate-500/20 flex justify-end">
              <button onClick={() => setShowSettings(false)} className="px-4 py-2 bg-slate-500/10 hover:bg-slate-500/20 rounded font-medium text-sm">
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {(loading || searching) && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-indigo-600/90 text-white px-4 py-2 rounded-full shadow-lg backdrop-blur animate-pulse">
          <Loader2 className="animate-spin" size={16} /> <span>{searching ? t.searching : t.analyzing} {formattedYear}...</span>
        </div>
      )}

      {/* Side Panel */}
      <div className={`absolute top-0 right-0 h-full w-[400px] sm:w-[500px] border-l shadow-2xl z-20 transform transition-transform duration-300 flex flex-col ${showPanel ? 'translate-x-0' : 'translate-x-full'} ${styles.panel}`}>
        <button onClick={() => { setShowPanel(!showPanel); setDetailMode(false); }} className={`absolute top-1/2 -left-10 p-2 rounded-l-lg border-y border-l shadow-lg ${styles.panel}`}>
          {showPanel ? <ChevronRight /> : <ChevronLeft />}
        </button>

        {/* Panel Header */}
        <div className="p-6 border-b border-slate-500/20 flex-none relative">
          <div className="flex justify-between items-start">
             <div>
               <h2 className="text-3xl font-bold">{selectedCiv ? selectedCiv.name : formattedYear}</h2>
               <div className="text-indigo-500 text-sm font-medium mt-1 flex items-center gap-2">
                 {selectedCiv ? (lang === 'en' ? "Civilization Detail" : "文明详情") : t.tabs.overview}
               </div>
             </div>
             {/* Mode Toggle */}
             <button onClick={() => setDetailMode(!detailMode)} className="p-2 rounded hover:bg-slate-500/10 text-xs flex items-center gap-1 opacity-70">
               {detailMode ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}
             </button>
          </div>
          
          {selectedCiv && (
             <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
               {['overview', 'politics', 'society', 'figures'].map(tab => (
                 <button 
                   key={tab}
                   onClick={() => setActiveTab(tab as Tab)}
                   className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === tab ? 'bg-indigo-600 text-white' : 'bg-slate-500/10 hover:bg-slate-500/20'}`}
                 >
                   {(t.tabs as any)[tab]}
                 </button>
               ))}
             </div>
          )}
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!data && !loading && <div className="text-center opacity-50 italic">{lang === 'en' ? "Offline Mode active. No data for this year." : "离线模式已激活，该年份暂无数据。"}</div>}
          
          {/* Default Year View */}
          {(!selectedCiv && data) && (
            <>
              <section>
                <p className="leading-relaxed opacity-90">{data.summary}</p>
              </section>
              <div className="h-48 rounded border border-slate-500/20 bg-black/5 overflow-hidden relative">
                 <div className="absolute top-2 left-2 text-xs font-bold uppercase opacity-50 flex items-center gap-1"><Network size={12}/> {t.interactionTypes}</div>
                 <svg ref={graphRef} className="w-full h-full" />
              </div>
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase opacity-60 flex items-center gap-2"><Globe size={14}/> {lang === 'en' ? "Major Powers" : "主要势力"}</h3>
                {data.civilizations.map((civ, i) => (
                  <div key={i} onClick={() => { setSelectedCiv(civ); setDetailMode(true); }} className={`p-3 rounded border transition-all cursor-pointer hover:border-indigo-500 ${styles.panel} border-slate-500/20`}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-3 h-3 rounded-full" style={{background: civ.color}}/>
                      <span className="font-bold">{civ.name}</span>
                    </div>
                    <div className="text-xs opacity-70 line-clamp-2">{civ.overview}</div>
                  </div>
                ))}
              </section>
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase opacity-60 flex items-center gap-2"><Swords size={14}/> {lang === 'en' ? "Events" : "重大事件"}</h3>
                {data.interactions.map((int, i) => (
                  <div key={i} className="p-3 rounded border border-slate-500/20 bg-slate-500/5 text-sm">
                    <div className="font-bold text-indigo-400 mb-1">{int.title}</div>
                    <p className="opacity-80 text-xs mb-2">{int.description}</p>
                    <div className="text-xs opacity-60 italic">{t.sections.impact}: {int.impact}</div>
                  </div>
                ))}
              </section>
            </>
          )}

          {/* Selected Civilization Detail View */}
          {selectedCiv && (
            <>
              {activeTab === 'overview' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <p className="text-lg leading-relaxed">{selectedCiv.overview}</p>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                     <div className="p-3 bg-slate-500/5 rounded">
                       <div className="text-xs opacity-50 uppercase mb-1">{t.sections.pop}</div>
                       <div className="font-mono text-lg">{selectedCiv.society.population}</div>
                     </div>
                     <div className="p-3 bg-slate-500/5 rounded">
                       <div className="text-xs opacity-50 uppercase mb-1">{t.sections.govt}</div>
                       <div className="text-sm font-semibold">{selectedCiv.government.type}</div>
                     </div>
                  </div>

                  {/* Sources Section */}
                  {selectedCiv.sources && selectedCiv.sources.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-slate-500/20">
                      <h3 className="text-xs font-bold uppercase opacity-60 flex items-center gap-2 mb-2"><Library size={12}/> {t.sections.sources}</h3>
                      <ul className="text-xs opacity-70 space-y-1 list-disc list-inside">
                        {selectedCiv.sources.map((source, i) => (
                          <li key={i}>{source}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'politics' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <section>
                    <h3 className="flex items-center gap-2 text-indigo-400 font-bold mb-2"><Gavel size={16}/> {t.sections.govt}</h3>
                    <p className="text-sm opacity-80">{selectedCiv.government.structure}</p>
                  </section>
                  <section>
                    <h3 className="flex items-center gap-2 text-indigo-400 font-bold mb-2"><Shield size={16}/> {t.sections.mil}</h3>
                    <p className="text-sm opacity-80">{selectedCiv.society.military}</p>
                  </section>
                  <div className="p-3 border border-slate-500/20 rounded">
                    <div className="text-xs opacity-50 uppercase mb-1">{t.sections.leaders}</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedCiv.government.leaders.map(l => <span key={l} className="px-2 py-1 bg-indigo-500/20 rounded text-xs">{l}</span>)}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'society' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <section>
                    <h3 className="flex items-center gap-2 text-indigo-400 font-bold mb-2"><Coins size={16}/> {t.sections.eco}</h3>
                    <p className="text-sm opacity-80">{selectedCiv.society.economy}</p>
                  </section>
                  <section>
                    <h3 className="flex items-center gap-2 text-indigo-400 font-bold mb-2"><Palette size={16}/> {t.sections.cult}</h3>
                    <p className="text-sm opacity-80">{selectedCiv.society.culture}</p>
                  </section>
                </div>
              )}

              {activeTab === 'figures' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  {selectedCiv.figures.map((fig, idx) => (
                    <div key={idx} className="p-4 rounded border border-slate-500/20 bg-slate-500/5 hover:bg-slate-500/10 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-bold text-lg">{fig.name}</div>
                          <div className="text-xs text-indigo-400">{fig.role}</div>
                        </div>
                        <div className="text-xs font-mono opacity-50 bg-black/20 px-2 py-1 rounded">{fig.lifespan}</div>
                      </div>
                      <div className="text-sm opacity-80 mb-2">{fig.impact}</div>
                      <div className="text-xs italic opacity-60"><span className="font-semibold">{t.sections.works}:</span> {fig.works}</div>
                    </div>
                  ))}
                  {selectedCiv.figures.length === 0 && <div className="opacity-50 text-sm">{lang === 'en' ? "No records." : "暂无记录"}</div>}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Timeline Controls - Hidden in Detail Mode */}
      <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 w-11/12 max-w-4xl z-20 transition-all duration-500 ${detailMode ? 'translate-y-32 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
        <div className={`p-4 rounded-xl border shadow-2xl backdrop-blur-xl flex flex-col gap-2 ${styles.panel}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-mono opacity-50">-3000 BC</span>
            <span className="text-2xl font-bold font-mono">{formattedYear}</span>
            <span className="text-xs font-mono opacity-50">2024 AD</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
             <button 
               onClick={() => updateYear(-10)} 
               className={`p-2 rounded-full hover:bg-slate-500/10 transition-colors flex-shrink-0 ${activeTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}
               title={lang === 'en' ? "Previous 10 Years" : "前10年"}
             >
                <ChevronLeft size={20} />
             </button>

             <button onClick={() => setIsPlaying(!isPlaying)} className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex-shrink-0">
               {isPlaying ? <Pause size={18} /> : <Play size={18} />}
             </button>

             <button 
               onClick={() => updateYear(10)} 
               className={`p-2 rounded-full hover:bg-slate-500/10 transition-colors flex-shrink-0 ${activeTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}
               title={lang === 'en' ? "Next 10 Years" : "后10年"}
             >
                <ChevronRight size={20} />
             </button>

             <input type="range" min="-3000" max="2024" value={year} onChange={(e) => { setYear(parseInt(e.target.value)); setIsPlaying(false); }}
              className={`flex-grow h-2 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 mx-2 ${activeTheme === 'dark' ? 'bg-slate-700' : 'bg-slate-300'}`} />
            
             <button onClick={() => fetchHistoricalData(year, true)} className="p-2 opacity-50 hover:opacity-100" title={t.refresh}>
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
             </button>
          </div>
        </div>
      </div>

      <Tooltip {...tooltipState} />
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);