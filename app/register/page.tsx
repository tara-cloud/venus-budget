"use client";
import{useState,useEffect,Suspense}from"react";
import{useRouter,useSearchParams}from"next/navigation";
import Link from"next/link";
type TeamKey="finance"|"engineering"|"marketing"|"ops"|"default";
interface Theme{headerBg:string;pageBg:string;pageBgDark:string;cardBg:string;cardBgDark:string;inputBg:string;inputBgDark:string;inputBorder:string;inputBorderDark:string;inputText:string;inputTextDark:string;labelText:string;labelTextDark:string;btnBg:string;btnHover:string;focusBorder:string;toggleColor:string;toggleColorDark:string;subText:string;subTextDark:string;label:string;}
const T:Record<TeamKey,Theme>={
  finance:{headerBg:"linear-gradient(160deg,#064e3b 0%,#065f46 50%,#047857 100%)",pageBg:"#f0fdf4",pageBgDark:"#052e16",cardBg:"#fff",cardBgDark:"#1a2e1e",inputBg:"#f9fafb",inputBgDark:"#14261a",inputBorder:"#d1d5db",inputBorderDark:"#2d5a38",inputText:"#111827",inputTextDark:"#ecfdf5",labelText:"#374151",labelTextDark:"#a7f3d0",btnBg:"#047857",btnHover:"#065f46",focusBorder:"#059669",toggleColor:"#059669",toggleColorDark:"#34d399",subText:"#6b7280",subTextDark:"#6ee7b7",label:"Finance Team"},
  engineering:{headerBg:"linear-gradient(160deg,#1e1b4b 0%,#312e81 50%,#4338ca 100%)",pageBg:"#eef2ff",pageBgDark:"#1e1b4b",cardBg:"#fff",cardBgDark:"#1e1b4b",inputBg:"#f9fafb",inputBgDark:"#312e81",inputBorder:"#d1d5db",inputBorderDark:"#4338ca",inputText:"#111827",inputTextDark:"#e0e7ff",labelText:"#374151",labelTextDark:"#c7d2fe",btnBg:"#4338ca",btnHover:"#3730a3",focusBorder:"#6366f1",toggleColor:"#6366f1",toggleColorDark:"#818cf8",subText:"#6b7280",subTextDark:"#a5b4fc",label:"Engineering Team"},
  marketing:{headerBg:"linear-gradient(160deg,#7f1d1d 0%,#9f1239 50%,#be185d 100%)",pageBg:"#fff1f2",pageBgDark:"#4c0519",cardBg:"#fff",cardBgDark:"#3b0d1f",inputBg:"#f9fafb",inputBgDark:"#4c0519",inputBorder:"#d1d5db",inputBorderDark:"#881337",inputText:"#111827",inputTextDark:"#ffe4e6",labelText:"#374151",labelTextDark:"#fda4af",btnBg:"#be185d",btnHover:"#9f1239",focusBorder:"#f43f5e",toggleColor:"#e11d48",toggleColorDark:"#fb7185",subText:"#6b7280",subTextDark:"#fda4af",label:"Marketing Team"},
  ops:{headerBg:"linear-gradient(160deg,#0c0a09 0%,#1c1917 50%,#292524 100%)",pageBg:"#f5f5f4",pageBgDark:"#0c0a09",cardBg:"#fff",cardBgDark:"#1c1917",inputBg:"#f9fafb",inputBgDark:"#292524",inputBorder:"#d1d5db",inputBorderDark:"#57534e",inputText:"#111827",inputTextDark:"#f5f5f4",labelText:"#374151",labelTextDark:"#d6d3d1",btnBg:"#292524",btnHover:"#1c1917",focusBorder:"#78716c",toggleColor:"#57534e",toggleColorDark:"#a8a29e",subText:"#6b7280",subTextDark:"#a8a29e",label:"Operations Team"},
  default:{headerBg:"linear-gradient(160deg,#4f46e5 0%,#6366f1 60%,#818cf8 100%)",pageBg:"#f8fafc",pageBgDark:"#0f172a",cardBg:"#fff",cardBgDark:"#1e293b",inputBg:"#f9fafb",inputBgDark:"#0f172a",inputBorder:"#d1d5db",inputBorderDark:"#334155",inputText:"#111827",inputTextDark:"#f1f5f9",labelText:"#374151",labelTextDark:"#cbd5e1",btnBg:"#4f46e5",btnHover:"#4338ca",focusBorder:"#6366f1",toggleColor:"#4f46e5",toggleColorDark:"#818cf8",subText:"#6b7280",subTextDark:"#94a3b8",label:""},
};

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [error,    setError]    = useState<string|null>(null);
  const [loading,  setLoading]  = useState(false);
  const [dark,     setDark]     = useState<boolean|null>(null);
  const raw = params.get("team") ?? "default";
  const teamKey = (raw in T ? raw : "default") as TeamKey;
  const th = T[teamKey];
  useEffect(() => {
    const stored = localStorage.getItem("theme-preference");
    if (stored === "dark")  { setDark(true);  return; }
    if (stored === "light") { setDark(false); return; }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setDark(mq.matches);
    const h = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password }),
      });
      if (res.ok) {
        router.push(teamKey !== "default" ? "/login?registered=1&team=" + teamKey : "/login?registered=1");
      } else {
        const data = await res.json();
        setError(data.error ?? "Registration failed.");
      }
    } catch { setError("Unexpected error. Please try again."); }
    finally { setLoading(false); }
  }
  if (dark === null) return null;
  const d = dark;
  const pageBg      = d ? th.pageBgDark      : th.pageBg;
  const cardBg      = d ? th.cardBgDark      : th.cardBg;
  const inputBg     = d ? th.inputBgDark     : th.inputBg;
  const inputBorder = d ? th.inputBorderDark : th.inputBorder;
  const inputText   = d ? th.inputTextDark   : th.inputText;
  const labelText   = d ? th.labelTextDark   : th.labelText;
  const toggleColor = d ? th.toggleColorDark : th.toggleColor;
  const subText     = d ? th.subTextDark     : th.subText;
  const disabled    = loading || !email || !password;
  const inp = (b: string) => ({
    width: "100%", height: 44, padding: "0 12px", borderRadius: 8,
    border: "1.5px solid " + b, fontSize: 14, color: inputText,
    background: inputBg, outline: "none", boxSizing: "border-box" as const,
  });
  return (
    <div style={{minHeight:"100dvh",display:"flex",alignItems:"center",justifyContent:"center",background:pageBg,padding:"16px",transition:"background 0.3s"}}>
      <div style={{width:"100%",maxWidth:384,borderRadius:20,overflow:"hidden",boxShadow:d?"0 8px 40px rgba(0,0,0,0.5)":"0 8px 40px rgba(0,0,0,0.15)"}}>
        <div style={{background:th.headerBg,display:"flex",flexDirection:"column",alignItems:"center",padding:"32px 32px 28px"}}>
          <div style={{width:56,height:56,borderRadius:14,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:12}}>
            <span style={{color:"#fff",fontWeight:800,fontSize:26}}>&#8377;</span>
          </div>
          <h1 style={{color:"#fff",fontWeight:800,fontSize:22,margin:0}}>Venus</h1>
          <p style={{color:"rgba(255,255,255,0.65)",fontSize:10,fontWeight:600,letterSpacing:"0.15em",textTransform:"uppercase",margin:"5px 0 0"}}>Track &middot; Budget &middot; Forecast</p>
          {th.label && <span style={{marginTop:10,padding:"3px 14px",borderRadius:999,background:"rgba(255,255,255,0.2)",color:"#fff",fontSize:11,fontWeight:600}}>{th.label}</span>}
          <p style={{color:"rgba(255,255,255,0.75)",fontSize:13,marginTop:10}}>Create your account</p>
        </div>
        <div style={{background:cardBg,padding:"28px 32px 24px",transition:"background 0.3s"}}>
          <h2 style={{fontSize:18,fontWeight:700,color:labelText,margin:"0 0 4px"}}>Create account</h2>
          <p style={{fontSize:13,color:subText,margin:"0 0 20px"}}>Start managing your finances today.</p>
          {error && <div style={{marginBottom:16,padding:"9px 13px",borderRadius:8,background:d?"#450a0a":"#fef2f2",border:"1px solid "+(d?"#7f1d1d":"#fecaca"),color:d?"#fca5a5":"#991b1b",fontSize:13}}>{error}</div>}
          <form onSubmit={submit} noValidate>
            <div style={{marginBottom:14}}>
              <label htmlFor="r-name" style={{display:"block",fontSize:13,fontWeight:600,color:labelText,marginBottom:5}}>
                Name <span style={{fontWeight:400,color:subText}}>(optional)</span>
              </label>
              <input id="r-name" type="text" autoComplete="name" placeholder="Your name" value={name}
                onChange={e => setName(e.target.value)} style={inp(inputBorder)}
                onFocus={e => (e.currentTarget.style.borderColor = th.focusBorder)}
                onBlur={e  => (e.currentTarget.style.borderColor = inputBorder)} />
            </div>
            <div style={{marginBottom:14}}>
              <label htmlFor="r-email" style={{display:"block",fontSize:13,fontWeight:600,color:labelText,marginBottom:5}}>Email address</label>
              <input id="r-email" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={email} required
                onChange={e => setEmail(e.target.value)} style={inp(inputBorder)}
                onFocus={e => (e.currentTarget.style.borderColor = th.focusBorder)}
                onBlur={e  => (e.currentTarget.style.borderColor = inputBorder)} />
            </div>
            <div style={{marginBottom:22}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                <label htmlFor="r-pwd" style={{fontSize:13,fontWeight:600,color:labelText}}>Password</label>
                <span role="button" tabIndex={0}
                  aria-label={showPwd ? "Hide password" : "Show password"}
                  style={{fontSize:12,fontWeight:600,color:toggleColor,cursor:"pointer",userSelect:"none"}}
                  onClick={() => setShowPwd(v => !v)}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setShowPwd(v => !v); }}>
                  {showPwd ? "Hide" : "Show"}
                </span>
              </div>
              <input id="r-pwd" type={showPwd ? "text" : "password"} autoComplete="new-password"
                placeholder="Min. 8 characters" value={password} required
                onChange={e => setPassword(e.target.value)} style={inp(inputBorder)}
                onFocus={e => (e.currentTarget.style.borderColor = th.focusBorder)}
                onBlur={e  => (e.currentTarget.style.borderColor = inputBorder)} />
              {password && password.length < 8 && <p style={{margin:"4px 0 0",fontSize:12,color:d?"#f87171":"#ef4444"}}>At least 8 characters required</p>}
            </div>
            <button type="submit" disabled={disabled}
              style={{width:"100%",height:44,borderRadius:10,background:disabled?"#9ca3af":th.btnBg,color:"#fff",fontWeight:700,fontSize:14,border:"none",cursor:disabled?"not-allowed":"pointer",transition:"background 0.15s"}}
              onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = th.btnHover; }}
              onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = th.btnBg; }}>
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
          <p style={{textAlign:"center",fontSize:13,color:subText,marginTop:18,marginBottom:0}}>
            Already have an account?{" "}
            <Link href={teamKey !== "default" ? "/login?team=" + teamKey : "/login"}
              style={{color:toggleColor,fontWeight:600,textDecoration:"none"}}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
