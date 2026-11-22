
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Activity, ArrowRight, BookOpen, Brain, Check, ChevronDown, CircleHelp,
  ClipboardList, CloudUpload, FileText, FlaskConical, GraduationCap, Image,
  Layers3, LogOut, Menu, Microscope, PlayCircle, Search, ShieldCheck,
  Sparkles, Upload, Wallet, X, Zap
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "./supabase";

type StudyDoc = {
  id: string;
  file_name: string;
  storage_path: string | null;
  created_at: string;
};

type Usage = {
  feature_key: string;
  trials_remaining: number;
};

const features = [
  { key: "pdf_summarizer", name: "PDF Summarizer", detail: "Turn long lecture notes into clear, structured summaries.", icon: FileText, tag: "Save study time" },
  { key: "better_explanations", name: "Better Explanations", detail: "Break difficult concepts into simple, step-by-step lessons.", icon: Brain, tag: "Understand deeply" },
  { key: "image_explainer", name: "Image Explanations", detail: "Explore diagrams, charts and labelled academic images.", icon: Image, tag: "Learn visually" },
  { key: "cbt_generator", name: "CBT & Practice", detail: "Practise with multiple-choice questions and explanations.", icon: ClipboardList, tag: "Test yourself" },
  { key: "deep_research", name: "Deep Research", detail: "Build a research brief from a focused academic question.", icon: Microscope, tag: "Go further" },
  { key: "deep_thinking", name: "Deep Thinking", detail: "Work through complex topics with a detailed reasoning plan.", icon: FlaskConical, tag: "Explore ideas" },
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

  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMessage, setAiMessage] = useState("");

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

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

    const { data, error } = await supabase
      .from("documents")
      .select("id,file_name,storage_path,created_at")
      .order("created_at", { ascending: false });

    if (!error && data) setDocs(data as StudyDoc[]);
  }

  async function loadUsage() {
    if (!supabase || !session?.user) return;

    const { data, error } = await supabase
      .from("feature_usage")
      .select("feature_key,trials_remaining");

    if (!error && data) setUsage(data as Usage[]);
  }

  async function generateWithAI(e: FormEvent) {
    e.preventDefault();

    if (!supabase || !session?.access_token || !selectedFeature) {
      setAiMessage("Please sign in and select an AI tool.");
      return;
    }

    if (!aiPrompt.trim()) {
      setAiMessage("Please enter your question.");
      return;
    }

    setAiBusy(true);
    setAiMessage("");
    setAiAnswer("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          tool: selectedFeature
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "AI generation failed.");
      }

      setAiAnswer(data.answer || "No answer was returned.");
      await loadUsage();
    } catch (error) {
      setAiMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
      await loadUsage();
    } finally {
      setAiBusy(false);
    }
  }

  async function handleAuth(e: FormEvent) {
    e.preventDefault();

    if (!supabase) {
      setAuthMessage("Add your Supabase URL and publishable key to the .env file first.");
      return;
    }

    setAuthBusy(true);
    setAuthMessage("");

    try {
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
        });

        if (error) throw error;

        if (data.session) {
          setSession(data.session);
        } else {
          setAuthMessage("Account created. Check your email for the confirmation link, then return here to sign in.");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;
        setSession(data.session);
      }
    } catch (err) {
      setAuthMessage(
        err instanceof Error ? err.message : "Authentication failed. Please try again."
      );
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    setSelectedFeature(null);
  }

  async function uploadPdf(e: FormEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = "";

    if (!file || !supabase || !session?.user) return;

    if (file.type !== "application/pdf") {
      setUploadMessage("Please choose a PDF file.");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setUploadMessage("This version allows PDFs up to 25 MB.");
      return;
    }

    setUploadBusy(true);
    setUploadMessage("");

    const path = `${session.user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    try {
      const { error: storageError } = await supabase.storage
        .from("study-pdfs")
        .upload(path, file, {
          contentType: "application/pdf",
          upsert: false
        });

      if (storageError) throw storageError;

      const { error: rowError } = await supabase.from("documents").insert({
        user_id: session.user.id,
        file_name: file.name,
        storage_path: path
      });

      if (rowError) {
        await supabase.storage.from("study-pdfs").remove([path]);
        throw rowError;
      }

      setUploadMessage("PDF uploaded successfully.");
      await loadDocuments();
    } catch (err) {
      setUploadMessage(
        err instanceof Error ? err.message : "Upload failed. Check the storage setup and try again."
      );
    } finally {
      setUploadBusy(false);
    }
  }

  async function openPdf(doc: StudyDoc) {
    if (!supabase || !doc.storage_path) return;

    const { data, error } = await supabase.storage
      .from("study-pdfs")
      .createSignedUrl(doc.storage_path, 60);

    if (error) {
      setUploadMessage(error.message);
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  function chooseFeature(key: string) {
    setSelectedFeature(key);
    setAiPrompt("");
    setAiAnswer("");
    setAiMessage("");
    setActive("AI Study Tools");
  }

  const filteredDocs = useMemo(
    () => docs.filter(d => d.file_name.toLowerCase().includes(search.toLowerCase())),
    [docs, search]
  );

  const name =
    session?.user?.user_metadata?.full_name ||
    session?.user?.email?.split("@")[0] ||
    "Student";

  const selectedFeatureInfo = features.find(f => f.key === selectedFeature);
  const selectedBalance =
    usage.find(u => u.feature_key === selectedFeature)?.trials_remaining ?? 4;

  if (!session) {
    return (
      <AuthScreen
        mode={authMode}
        setMode={setAuthMode}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        fullName={fullName}
        setFullName={setFullName}
        onSubmit={handleAuth}
        busy={authBusy}
        message={authMessage}
        configured={isSupabaseConfigured}
      />
    );
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "show" : ""}`}>
        <Brand />
        <div className="side-label">WORKSPACE</div>

        {["Overview", "My PDFs", "AI Study Tools", "CBT Practice", "Subscriptions"].map((item, i) => {
          const Icon = [Layers3, FileText, Sparkles, ClipboardList, Wallet][i];

          return (
            <button
              key={item}
              className={`nav-item ${active === item ? "active" : ""}`}
              onClick={() => {
                setActive(item);
                setMobileNav(false);
                if (item === "AI Study Tools") setSelectedFeature(null);
              }}
            >
              <Icon size={18} />
              <span>{item}</span>
              {item === "AI Study Tools" && <span className="nav-count">8</span>}
            </button>
          );
        })}

        <div className="sidebar-bottom">
          <div className="help-card">
            <CircleHelp size={18} />
            <b>Need a hand?</b>
            <span>Your study journey starts one topic at a time.</span>
          </div>
          <button className="nav-item" onClick={signOut}>
            <LogOut size={18} /> Sign out
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileNav(!mobileNav)}>
            <Menu size={20} />
          </button>
          <div className="crumb">Workspace <span>/</span> {active}</div>
          <div className="top-actions">
            <span className="plan-chip"><Zap size={14} /> Free plan</span>
            <div className="avatar">{String(name).slice(0, 1).toUpperCase()}</div>
          </div>
        </header>

        <div className="content">
          {active === "Overview" && (
            <>
              <section className="welcome-row">
                <div>
                  <div className="eyebrow">YOUR LEARNING SPACE</div>
                  <h1>Welcome back, {name.split(" ")[0]} <span className="wave">✦</span></h1>
                  <p>Your next breakthrough starts with one good study session.</p>
                </div>
                <button className="gold-button" onClick={() => setActive("My PDFs")}>
                  <Upload size={17} /> Upload study PDF
                </button>
              </section>

              <section className="hero-panel">
                <div className="hero-copy">
                  <span className="hero-kicker"><Sparkles size={14} /> YOUR AI STUDY COMPANION</span>
                  <h2>Make every study<br /><em>session count.</em></h2>
                  <p>Organise your notes, understand complex topics and prepare for exams with one focused workspace.</p>
                  <button className="light-button" onClick={() => setActive("AI Study Tools")}>
                    Explore AI study tools <ArrowRight size={16} />
                  </button>
                </div>
                <div className="hero-art">
                  <div className="orbit orbit-one"></div>
                  <div className="orbit orbit-two"></div>
                  <div className="book-illustration">
                    <BookOpen size={74} />
                    <Sparkles className="sparkle s1" />
                    <Sparkles className="sparkle s2" />
                  </div>
                  <div className="floating-note note-one"><Brain size={16} /> Understand</div>
                  <div className="floating-note note-two"><ClipboardList size={16} /> Practise</div>
                </div>
              </section>

              <section className="stat-grid">
                <Stat icon={<FileText />} label="My study PDFs" value={String(docs.length)} note="Your uploaded library" />
                <Stat icon={<Sparkles />} label="AI study tools" value="8" note="Independent trial counters" />
                <Stat icon={<Activity />} label="Free plan" value="₦0" note="Upgrade when you're ready" />
              </section>

              <SectionTitle
                title="Explore your study tools"
                subtitle="Choose a tool to make your learning clearer and more effective."
                action="View all"
                onAction={() => setActive("AI Study Tools")}
              />
              <FeatureGrid usage={usage} onSelect={chooseFeature} />

              <SectionTitle
                title="Recent study documents"
                subtitle="Pick up where you left off."
                action="View library"
                onAction={() => setActive("My PDFs")}
              />
              <DocumentList docs={docs.slice(0, 3)} onOpen={openPdf} />
            </>
          )}

          {active === "My PDFs" && (
            <>
              <SectionTitle
                title="My PDF library"
                subtitle="Keep your lecture notes and reading materials in one place."
              />
              <div className="upload-panel">
                <div className="upload-icon"><CloudUpload size={28} /></div>
                <h3>{uploadBusy ? "Uploading your PDF…" : "Add a study document"}</h3>
                <p>PDF files only · Maximum 25 MB per file</p>
                <label className="gold-button upload-label">
                  <Upload size={16} /> Choose PDF
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={uploadPdf as any}
                    disabled={uploadBusy}
                  />
                </label>
                {uploadMessage && <div className="inline-message">{uploadMessage}</div>}
              </div>

              <div className="library-toolbar">
                <h3>All documents <span className="muted-count">{docs.length}</span></h3>
                <div className="search-box">
                  <Search size={16} />
                  <input
                    placeholder="Search documents"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <DocumentList docs={filteredDocs} onOpen={openPdf} />
            </>
          )}

          {active === "AI Study Tools" && (
            <>
              <SectionTitle
                title="AI study tools"
                subtitle="Each tool has its own free-trial allowance."
              />

              {!selectedFeature ? (
                <>
                  <FeatureGrid usage={usage} detailed onSelect={chooseFeature} />
                  <div className="notice">
                    <ShieldCheck size={18} />
                    <span>Select a tool to open its workspace. Text-based AI requests are connected to the secure server endpoint.</span>
                  </div>
                </>
              ) : (
                <div className="coming-panel">
                  <button
                    className="outline-button compact"
                    onClick={() => {
                      setSelectedFeature(null);
                      setAiPrompt("");
                      setAiAnswer("");
                      setAiMessage("");
                    }}
                  >
                    ← Back to all tools
                  </button>

                  <div className="coming-icon">
                    {selectedFeatureInfo && <selectedFeatureInfo.icon size={32} />}
                  </div>

                  <h2>{selectedFeatureInfo?.name}</h2>
                  <p>{selectedFeatureInfo?.detail}</p>

                  <div className="trial-pill">
                    {selectedBalance} free {selectedBalance === 1 ? "trial" : "trials"} remaining
                  </div>

                  <form onSubmit={generateWithAI} className="ai-workspace-form">
                    <label htmlFor="ai-prompt">What would you like to learn?</label>
                    <textarea
                      id="ai-prompt"
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      placeholder="Enter your topic or academic question here..."
                      rows={6}
                      maxLength={12000}
                      required
                    />

                    <button className="gold-button" type="submit" disabled={aiBusy}>
                      {aiBusy ? "Generating your answer…" : "Generate answer"}
                      <Sparkles size={17} />
                    </button>
                  </form>

                  {aiMessage && <div className="inline-message">{aiMessage}</div>}

                  {aiAnswer && (
                    <div className="notice ai-answer">
                      <div>
                        <h3>Your AI answer</h3>
                        <p style={{ whiteSpace: "pre-wrap" }}>{aiAnswer}</p>
                      </div>
                    </div>
                  )}

                  <p className="secure-note">
                    <ShieldCheck size={15} />
                    Your request is sent through the secure Nobex Cademics server.
                  </p>
                </div>
              )}
            </>
          )}

          {active === "CBT Practice" && (
            <>
              <SectionTitle
                title="CBT practice"
                subtitle="Build confidence with exam-style practice."
              />
              <div className="coming-panel">
                <div className="coming-icon"><ClipboardList size={32} /></div>
                <h2>Your practice room is being prepared.</h2>
                <p>Next we will connect question generation, timed tests, answer review and performance tracking.</p>
                <button className="gold-button" onClick={() => setActive("AI Study Tools")}>
                  Explore study tools <ArrowRight size={16} />
                </button>
              </div>
            </>

  

  
