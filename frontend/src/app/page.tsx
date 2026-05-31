"use client";

import { useState } from "react";

export default function Home() {
  const [jdMode, setJdMode] = useState<"text" | "file">("text");
  const [jd, setJd] = useState("");
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedResumeText, setSelectedResumeText] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleJdFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setJdFile(e.target.files[0]);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((jdMode === "text" && !jd) || (jdMode === "file" && !jdFile) || files.length === 0) return;

    setLoading(true);
    try {
      const formData = new FormData();
      if (jdMode === "text") {
        formData.append("job_description", jd);
      } else if (jdFile) {
        formData.append("jd_file", jdFile);
      }
      
      files.forEach((file) => {
        formData.append("files", file);
      });

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/api/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to analyze resumes");
      }

      const data = await res.json();
      setResults(data.results);
    } catch (error) {
      console.error(error);
      alert("Error analyzing resumes. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    window.open(`${apiUrl}/api/export`, "_blank");
  };

  const filteredResults = results?.filter(c => {
    const q = searchQuery.toLowerCase();
    const nameMatch = c.name.toLowerCase().includes(q);
    const skillMatch = c.matched_skills?.some((s: string) => s.toLowerCase().includes(q));
    return nameMatch || skillMatch;
  });

  if (results) {
    return (
      <main className="min-h-screen bg-background text-foreground py-32 px-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12 flex flex-col items-center text-center">
            <h1 className="font-serif text-5xl md:text-7xl mb-6 text-foreground">
              Candidate Rankings
            </h1>
            <div className="h-px w-24 bg-accent mb-6" />
            <p className="text-muted-foreground text-lg max-w-2xl mb-8">
              The AI has completed its analysis. Candidates are ranked from highest to lowest fit based on the provided job description.
            </p>
            
            <div className="flex flex-col md:flex-row gap-4 w-full justify-between items-center bg-card p-4 rounded-lg border border-border shadow-sm">
              <input 
                type="text" 
                placeholder="Search by candidate name or skill..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:max-w-md bg-transparent border border-border rounded-md px-4 py-2 focus:ring-2 focus:ring-accent outline-none"
              />
              <button 
                onClick={handleExport}
                className="w-full md:w-auto bg-accent text-white px-6 py-2 rounded-md hover:bg-accent-secondary transition-colors whitespace-nowrap"
              >
                Download CSV Export
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8">
            {filteredResults?.map((candidate, idx) => (
              <div 
                key={candidate.id} 
                className="bg-card border border-border rounded-lg p-10 shadow-sm transition-all duration-200 hover:shadow-md hover:bg-muted/30 relative"
              >
                {idx === 0 && !searchQuery && (
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent rounded-t-lg" />
                )}
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <div className="small-caps text-accent mb-2">Rank {candidate.rank}</div>
                    <h2 className="font-serif text-3xl font-semibold text-foreground">
                      {candidate.name}
                    </h2>
                    <button 
                      onClick={() => setSelectedResumeText(candidate.resume_text)}
                      className="mt-2 text-sm text-muted-foreground hover:text-accent underline underline-offset-4"
                    >
                      Preview Resume Text
                    </button>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <div className="font-serif text-5xl text-foreground">
                      {candidate.final_score}
                    </div>
                    <div className="small-caps text-muted-foreground mt-1">
                      Match Score
                    </div>
                  </div>
                </div>

                <div className="h-px w-full bg-border my-6" />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="col-span-1 md:col-span-2">
                    <div className="small-caps text-muted-foreground mb-3">Skill Analysis</div>
                    <div className="mb-4">
                      <p className="text-sm text-foreground mb-2">Matched Skills:</p>
                      <div className="flex flex-wrap gap-2">
                        {candidate.matched_skills?.length ? candidate.matched_skills.map((skill: string) => (
                          <span key={skill} className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider">
                            {skill}
                          </span>
                        )) : <span className="text-sm text-muted-foreground">None identified</span>}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-foreground mb-2">Missing Skills:</p>
                      <div className="flex flex-wrap gap-2">
                        {candidate.missing_skills?.length ? candidate.missing_skills.map((skill: string) => (
                          <span key={skill} className="bg-muted text-muted-foreground border border-border px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider">
                            {skill}
                          </span>
                        )) : <span className="text-sm text-muted-foreground">None identified</span>}
                      </div>
                    </div>
                  </div>
                  <div className="col-span-1 border-l border-border pl-6 flex flex-col justify-center space-y-4">
                    <div>
                      <div className="small-caps text-muted-foreground mb-1">TF-IDF Score</div>
                      <div className="text-xl font-medium">{candidate.tfidf_score}</div>
                    </div>
                    <div>
                      <div className="small-caps text-muted-foreground mb-1">BERT Score</div>
                      <div className="text-xl font-medium">{candidate.bert_score}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredResults?.length === 0 && (
              <div className="text-center py-12 border border-dashed border-border rounded-lg text-muted-foreground">
                No candidates match your search.
              </div>
            )}
          </div>

          <div className="mt-16 text-center">
            <button 
              onClick={() => {
                setResults(null);
                setSearchQuery("");
              }}
              className="bg-transparent border border-foreground text-foreground hover:bg-muted hover:border-accent hover:text-accent transition-all duration-200 rounded-md px-8 py-3 min-h-[44px]"
            >
              Analyze Another Batch
            </button>
          </div>
          
          {/* Resume Modal */}
          {selectedResumeText && (
            <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-card w-full max-w-3xl max-h-[80vh] flex flex-col rounded-xl shadow-2xl border border-border overflow-hidden">
                <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
                  <h3 className="font-serif text-xl">Resume Text Preview</h3>
                  <button onClick={() => setSelectedResumeText(null)} className="text-muted-foreground hover:text-foreground text-2xl leading-none">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto whitespace-pre-wrap text-sm font-mono text-muted-foreground">
                  {selectedResumeText}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground py-32 px-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-20 text-center flex flex-col items-center">
          <div className="mb-6 flex items-center justify-center gap-4 w-full max-w-lg mx-auto">
            <span className="h-px flex-1 bg-border" />
            <span className="small-caps text-accent font-bold tracking-widest text-3xl px-2">
              SCREENER
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
          
          <h1 className="font-serif text-6xl md:text-7xl tracking-tight mb-8">
            Identify the ideal candidate.
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Elevate your hiring process with our AI-powered screening tool. 
            Upload resumes and a job description, and let intelligent models surface the best talent.
          </p>
        </div>

        <form onSubmit={handleAnalyze} className="max-w-3xl mx-auto bg-card border border-border p-10 md:p-14 rounded-lg shadow-sm">
          
          <div className="mb-10">
            <div className="flex justify-between items-end mb-4">
              <label className="block font-serif text-2xl">Job Description</label>
              <div className="flex bg-muted p-1 rounded-md">
                <button
                  type="button"
                  onClick={() => setJdMode("text")}
                  className={`px-3 py-1 text-sm rounded-sm transition-colors ${jdMode === "text" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Paste Text
                </button>
                <button
                  type="button"
                  onClick={() => setJdMode("file")}
                  className={`px-3 py-1 text-sm rounded-sm transition-colors ${jdMode === "file" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Upload File
                </button>
              </div>
            </div>
            
            {jdMode === "text" ? (
              <textarea 
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="Paste the full job description here..."
                className="w-full h-48 bg-transparent border border-border rounded-md p-6 focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:border-accent transition-all duration-150 resize-none outline-none"
                required={jdMode === "text"}
              />
            ) : (
              <div className="border border-border border-dashed rounded-md p-8 text-center hover:border-accent transition-colors duration-200">
                <input 
                  type="file" 
                  accept=".pdf,.docx"
                  onChange={handleJdFileChange}
                  className="block w-full text-sm text-muted-foreground
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-accent file:text-white
                    hover:file:bg-accent-secondary
                    cursor-pointer"
                  required={jdMode === "file"}
                />
                <p className="mt-4 text-sm text-muted-foreground">
                  Supported formats: PDF, DOCX
                </p>
              </div>
            )}
          </div>

          <div className="mb-12">
            <label className="block font-serif text-2xl mb-4">Candidate Resumes</label>
            <div className="border border-border border-dashed rounded-md p-8 text-center hover:border-accent transition-colors duration-200">
              <input 
                type="file" 
                multiple 
                accept=".pdf,.docx"
                onChange={handleFileChange}
                className="block w-full text-sm text-muted-foreground
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-accent file:text-white
                  hover:file:bg-accent-secondary
                  cursor-pointer"
                required
              />
              <p className="mt-4 text-sm text-muted-foreground">
                Supported formats: PDF, DOCX
              </p>
            </div>
            {files.length > 0 && (
              <div className="mt-4">
                <div className="small-caps text-muted-foreground mb-2">Selected Files</div>
                <ul className="text-sm border border-border rounded-md divide-y divide-border">
                  {files.map(f => (
                    <li key={f.name} className="px-4 py-2">{f.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-accent text-white font-medium tracking-wide rounded-md px-8 py-4 min-h-[44px] hover:bg-accent-secondary hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {loading ? "Analyzing Candidates..." : "Analyze & Rank Candidates"}
          </button>
        </form>
      </div>
    </main>
  );
}
