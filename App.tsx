import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Activity, ArrowRight, BookOpen, Brain, Check, ChevronDown, CircleHelp,
  ClipboardList, CloudUpload, FileText, FlaskConical, GraduationCap, Image,
  Layers3, LogOut, Menu, Microscope, PlayCircle, Search, ShieldCheck,
  Sparkles, Upload, Wallet, X, Zap
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "./supabase";

type StudyDoc = { id: string; file_name: string; storage_path: string | null; created_at: string };
type Usage = { feature_key: string; trials_remaining: number };

const features = [
  { key: "pdf_summarizer", name: "PDF Summarizer", detail: "Turn long lecture notes into clear, structured summaries.", icon: FileText, tag: "Save study time" },
  { key: "better_explanations", name: "Better Explanations", detail: "Break difficult concepts into simple, step-by-step lessons.", icon: Brain, tag: "Understand deeply" },
  { key: "image_explainer", name: "Image Explanations", detail: "Explore diagrams, charts and labelled academic images.", icon: Image, tag: "Learn visually" },
  { key: "cbt_generator", name: "CBT & Practice", detail: "Practise with multiple-choice questions and explanations.", icon: ClipboardList, tag: "Test yourself" },
  { key: "deep_research", name: "Deep Research", detail: "Build a research brief from a focused academic question.", icon: Microscope, tag: "Go further" },
  { key: "deep_thinking", name: "Deep Thinking", detail: "Work through complex topics with a more detailed reasoning plan.", icon: FlaskConical, tag: "Explore ideas" },
  { key: "ai_motion_lessons", name: "Motion Lessons", detail: "Learn through animated explanations with subtitles.", icon: PlayCircle, tag: "See concepts move" },
  { key: "ai_tutor", name: "AI Study Tutor", detail: "Ask follow-up questions about your learning materials.", icon: GraduationCap, tag: "Study with support" }
];

const plans = [
  { name: "Free", price: "₦0", desc: "Try the essential study tools", points: ["4 free trials per AI feature", "Personal study dashboard", "PDF library"] },
  { name: "Student", price: "₦1,500", desc: "For focused everyday learning", points: ["More AI usage", "Organised study library", "CBT practice"] },
  { name: "Pro", price: "₦3,000", desc: "For ambitious learners", points: ["Higher AI usage limits", "Advanced study workflows", "Priority processing"], featured: true },
  { name: "Super Pro", price: "₦5,000", desc: "The complete study experience", points: ["Highest usage limits", "All premium study tools", "Priority support"] }
];

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [active, setActive] = useState("Overview");
  const [docs, setDocs] = useState<StudyDoc[]>([]);
  const [usage, setUsage] = useState<Usage[]>([]);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      loadDocuments();
      loadUsage();
    } else {
      setDocs([]);
      setUsage([]);
    }
  }, [session]);

  async function loadDocuments() {
    if (!supabase || !session?.user) return;
    const { data, error } = await supabase.from("documents").select("id,file_name,storage_path,created_at").order("created_at", { ascending: false });
    if (!error && data) setDocs(data as StudyDoc[]);
  }

  async function loadUsage() {
    if (!supabase || !session?.user) return;
    const { data, error } = await supabase.from("feature_usage").select("feature_key,trials_remaining");
    if (!error && data) setUsage(data as Usage[]);
  }

  async function handleAuth(e: FormEvent) {
    e.preventDefault();
    if (!supabase) { setAuthMessage("Add your Supabase URL and publishable key to the .env file first."); return; }
    setAuthBusy(true); setAuthMessage("");
    try {
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName } }
        });
        if (error) throw error;
        if (data.session) setSession(data.session);
        else setAuthMessage("Account created. Check your email for the confirmation link, then return here to sign in.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setSession(data.session);
      }
    } catch (err) {
      setAuthMessage(err instanceof Error ? err.message : "Authentication failed. Please try again.");
    } finally { setAuthBusy(false); }
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
  }

  async function uploadPdf(e: FormEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = "";
    if (!file || !supabase || !session?.user) return;
    if (file.type !== "application/pdf") { setUploadMessage("Please choose a PDF file."); return; }
    if (file.size > 25 * 1024 * 1024) { setUploadMessage("This starter version allows PDFs up to 25 MB."); return; }
    setUploadBusy(true); setUploadMessage("");
    const path = `${session.user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    try {
      const { error: storageError } = await supabase.storage.from("study-pdfs").upload(path, file, { contentType: "application/pdf", upsert: false });
      if (storageError) throw storageError;
      const { error: rowError } = await supabase.from("documents").insert({
        user_id: session.user.id, file_name: file.name, storage_path: path
      });
      if (rowError) {
        await supabase.storage.from("study-pdfs").remove([path]);
        throw rowError;
      }
      setUploadMessage("PDF uploaded successfully.");
      await loadDocuments();
    } catch (err) {
      setUploadMessage(err instanceof Error ? err.message : "Upload failed. Check the storage setup and try again.");
    } finally { setUploadBusy(false); }
  }

  async function openPdf(doc: StudyDoc) {
    if (!supabase || !doc.storage_path) return;
    const { data, error } = await supabase.storage.from("study-pdfs").createSignedUrl(doc.storage_path, 60);
    if (error) { setUploadMessage(error.message); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  const filteredDocs = useMemo(() => docs.filter(d => d.file_name.toLowerCase().includes(search.toLowerCase())), [docs, search]);
  const name = session?.user?.user_metadata?.full_name || session?.user?.email?.split("@")[0] || "Student";

  if (!session) return <AuthScreen
    mode={authMode} setMode={setAuthMode} email={email} setEmail={setEmail}
    password={password} setPassword={setPassword} fullName={fullName}
    setFullName={setFullName} onSubmit={handleAuth} busy={authBusy}
    message={authMessage} configured={isSupabaseConfigured}
  />;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "show" : ""}`}>
        <Brand />
        <div className="side-label">WORKSPACE</div>
        {["Overview", "My PDFs", "AI Study Tools", "CBT Practice", "Subscriptions"].map((item, i) => {
          const Icon = [Layers3, FileText, Sparkles, ClipboardList, Wallet][i];
          return <button key={item} className={`nav-item ${active === item ? "active" : ""}`} onClick={() => { setActive(item); setMobileNav(false); }}>
            <Icon size={18}/><span>{item}</span>{item === "AI Study Tools" && <span className="nav-count">8</span>}
          </button>;
        })}
        <div className="sidebar-bottom">
          <div className="help-card"><CircleHelp size={18}/><b>Need a hand?</b><span>Your study journey starts one topic at a time.</span></div>
          <button className="nav-item" onClick={signOut}><LogOut size={18}/>Sign out</button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileNav(!mobileNav)}><Menu size={20}/></button>
          <div className="crumb">Workspace <span>/</span> {active}</div>
          <div className="top-actions"><span className="plan-chip"><Zap size={14}/> Free plan</span><div className="avatar">{String(name).slice(0,1).toUpperCase()}</div></div>
        </header>

        <div className="content">
          {active === "Overview" && <>
            <section className="welcome-row">
              <div><div className="eyebrow">YOUR LEARNING SPACE</div><h1>Welcome back, {name.split(" ")[0]} <span className="wave">✦</span></h1><p>Your next breakthrough starts with one good study session.</p></div>
              <button className="gold-button" onClick={() => setActive("My PDFs")}><Upload size={17}/> Upload study PDF</button>
            </section>
            <section className="hero-panel">
              <div className="hero-copy"><span className="hero-kicker"><Sparkles size={14}/> YOUR AI STUDY COMPANION</span><h2>Make every study<br/>session <em>count.</em></h2><p>Organise your notes, understand complex topics and prepare for exams with one focused workspace.</p><button className="light-button" onClick={() => setActive("AI Study Tools")}>Explore AI study tools <ArrowRight size={16}/></button></div>
              <div className="hero-art"><div className="orbit orbit-one"></div><div className="orbit orbit-two"></div><div className="book-illustration"><BookOpen size={74}/><Sparkles className="sparkle s1"/><Sparkles className="sparkle s2"/></div><div className="floating-note note-one"><Brain size={16}/> Understand</div><div className="floating-note note-two"><ClipboardList size={16}/> Practise</div></div>
            </section>
            <section className="stat-grid">
              <Stat icon={<FileText/>} label="My study PDFs" value={String(docs.length)} note="Your uploaded library"/>
              <Stat icon={<Sparkles/>} label="AI study tools" value="8" note="Independent trial counters"/>
              <Stat icon={<Activity/>} label="Free plan" value="₦0" note="Upgrade when you're ready"/>
            </section>
            <SectionTitle title="Explore your study tools" subtitle="Choose a tool to make your learning clearer and more effective." action="View all" onAction={() => setActive("AI Study Tools")}/>
            <FeatureGrid usage={usage} onSelect={() => setActive("AI Study Tools")}/>
            <SectionTitle title="Recent study documents" subtitle="Pick up where you left off." action="View library" onAction={() => setActive("My PDFs")}/>
            <DocumentList docs={docs.slice(0,3)} onOpen={openPdf}/>
          </>}

          {active === "My PDFs" && <><SectionTitle title="My PDF library" subtitle="Keep your lecture notes and reading materials in one place."/><div className="upload-panel"><div className="upload-icon"><CloudUpload size={28}/></div><h3>{uploadBusy ? "Uploading your PDF…" : "Add a study document"}</h3><p>PDF files only · Maximum 25 MB per file</p><label className="gold-button upload-label"><Upload size={16}/> Choose PDF<input type="file" accept="application/pdf,.pdf" onChange={uploadPdf as any} disabled={uploadBusy}/></label>{uploadMessage && <div className="inline-message">{uploadMessage}</div>}</div><div className="library-toolbar"><h3>All documents <span className="muted-count">{docs.length}</span></h3><div className="search-box"><Search size={16}/><input placeholder="Search documents" value={search} onChange={e => setSearch(e.target.value)}/></div></div><DocumentList docs={filteredDocs} onOpen={openPdf}/></>}

          {active === "AI Study Tools" && <><SectionTitle title="AI study tools" subtitle="Each tool has its own free-trial allowance. Your current balances are shown below."/><FeatureGrid usage={usage} detailed/><div className="notice"><ShieldCheck size={18}/><span>AI generation is not connected yet. We will connect a secure AI service next; your API keys will stay on the server, never in this website.</span></div></>}

          {active === "CBT Practice" && <><SectionTitle title="CBT practice" subtitle="Build confidence with exam-style practice."/><div className="coming-panel"><div className="coming-icon"><ClipboardList size={32}/></div><h2>Your practice room is being prepared.</h2><p>Next we will connect question generation, timed tests, answer review and performance tracking.</p><button className="gold-button" onClick={() => setActive("AI Study Tools")}>Explore study tools <ArrowRight size={16}/></button></div></>}

          {active === "Subscriptions" && <><SectionTitle title="Choose your study plan" subtitle="Straightforward monthly pricing in Nigerian naira."/><div className="pricing-grid">{plans.map(p => <div className={`price-card ${p.featured ? "featured" : ""}`} key={p.name}>{p.featured && <div className="popular">MOST POPULAR</div>}<h3>{p.name}</h3><div className="price">{p.price}<small>/ month</small></div><p>{p.desc}</p><ul>{p.points.map(x => <li key={x}><Check size={16}/>{x}</li>)}</ul><button className={p.featured ? "gold-button" : "outline-button"} onClick={() => alert("Payments will be connected securely with a Nigerian payment provider in the next development stage.")}>{p.name === "Free" ? "Current plan" : "Choose " + p.name}</button></div>)}</div><div className="notice"><Wallet size={18}/><span>Payments are not activated yet. No payment will be taken. We will add a Nigerian payment gateway and verify transactions securely before enabling upgrades.</span></div></>}
        </div>
        <footer className="footer"><Brand small/><span>© {new Date().getFullYear()} Nobex Cademics. Built for curious minds.</span></footer>
      </main>
      {mobileNav && <button className="scrim" onClick={() => setMobileNav(false)} aria-label="Close menu"><X/></button>}
    </div>
  );
}

function Brand({ small = false }: { small?: boolean }) {
  return <div className={`brand ${small ? "brand-small" : ""}`}><div className="brand-mark"><GraduationCap size={small ? 17 : 22}/></div><div><b>NOBEX <span>CADEMICS</span></b>{!small && <small>UNIVERSITY STUDY, REIMAGINED</small>}</div></div>;
}
function Stat({ icon, label, value, note }: { icon: any; label: string; value: string; note: string }) {
  return <div className="stat-card"><div className="stat-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></div>;
}
function SectionTitle({ title, subtitle, action, onAction }: { title: string; subtitle: string; action?: string; onAction?: () => void }) {
  return <div className="section-title"><div><h2>{title}</h2><p>{subtitle}</p></div>{action && <button className="text-button" onClick={onAction}>{action} <ArrowRight size={15}/></button>}</div>;
}
function FeatureGrid({ usage, detailed = false, onSelect }: { usage: Usage[]; detailed?: boolean; onSelect?: () => void }) {
  return <div className="feature-grid">{features.map(f => {
    const Icon = f.icon; const balance = usage.find(u => u.feature_key === f.key)?.trials_remaining ?? 4;
    return <button className={`feature-card ${detailed ? "detailed" : ""}`} key={f.key} onClick={onSelect || (() => alert("This AI tool will be activated when the secure AI service is connected."))}>
      <div className="feature-top"><div className="feature-icon"><Icon size={20}/></div><span className="trial-pill">{balance} free {balance === 1 ? "trial" : "trials"}</span></div>
      <h3>{f.name}</h3><p>{f.detail}</p><div className="feature-bottom"><span>{f.tag}</span><ArrowRight size={16}/></div>
    </button>;
  })}</div>;
}
function DocumentList({ docs, onOpen }: { docs: StudyDoc[]; onOpen: (d: StudyDoc) => void }) {
  if (!docs.length) return <div className="empty-state"><div className="empty-icon"><FileText size={25}/></div><b>No PDFs yet</b><span>Upload your first lecture note to start building your study library.</span></div>;
  return <div className="document-list">{docs.map(d => <div className="document-row" key={d.id}><div className="pdf-icon"><FileText size={20}/></div><div className="document-info"><b>{d.file_name}</b><span>Added {new Date(d.created_at).toLocaleDateString()}</span></div><button className="outline-button compact" onClick={() => onOpen(d)}>Open PDF <ArrowRight size={14}/></button></div>)}</div>;
}
function AuthScreen(props: {
  mode: "login" | "signup"; setMode: (m: "login" | "signup") => void;
  email: string; setEmail: (s: string) => void; password: string; setPassword: (s: string) => void;
  fullName: string; setFullName: (s: string) => void; onSubmit: (e: FormEvent) => void;
  busy: boolean; message: string; configured: boolean;
}) {
  return <div className="auth-page"><div className="auth-left"><Brand/><div className="auth-pitch"><div className="eyebrow">YOUR UNIVERSITY STUDY COMPANION</div><h1>Learn with clarity.<br/><em>Achieve</em> with confidence.</h1><p>One focused space for your PDFs, explanations, practice questions and deeper learning.</p><div className="auth-points"><span><Check/> Your study materials, organised</span><span><Check/> Eight AI-powered study tools</span><span><Check/> Plans priced in Nigerian naira</span></div></div><div className="auth-foot">© 2026 Nobex Cademics</div></div><div className="auth-right"><div className="auth-card"><div className="mobile-brand"><Brand/></div><div className="eyebrow">WELCOME TO NOBEX CADEMICS</div><h2>{props.mode === "signup" ? "Create your student account" : "Welcome back"}</h2><p className="auth-sub">{props.mode === "signup" ? "Start building a smarter study routine today." : "Sign in to continue your learning journey."}</p>{!props.configured && <div className="setup-warning"><b>Setup required:</b> add your Supabase project URL and publishable key to the .env file. See README.md.</div>}<form onSubmit={props.onSubmit}>{props.mode === "signup" && <label>Full name<input value={props.fullName} onChange={e => props.setFullName(e.target.value)} placeholder="Your full name" required/></label>}<label>Email address<input type="email" value={props.email} onChange={e => props.setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required/></label><label>Password<input type="password" value={props.password} onChange={e => props.setPassword(e.target.value)} placeholder="At least 8 characters" minLength={8} autoComplete={props.mode === "signup" ? "new-password" : "current-password"} required/></label><button className="gold-button auth-submit" disabled={props.busy}>{props.busy ? "Please wait…" : props.mode === "signup" ? "Create account" : "Sign in"} <ArrowRight size={17}/></button></form>{props.message && <div className="inline-message">{props.message}</div>}<div className="auth-switch">{props.mode === "signup" ? "Already have an account?" : "New to Nobex Cademics?"} <button onClick={() => props.setMode(props.mode === "signup" ? "login" : "signup")}>{props.mode === "signup" ? "Sign in" : "Create account"}</button></div><div className="secure-note"><ShieldCheck size={15}/> Secure email authentication powered by Supabase</div></div></div></div>;
}