import React, { useState, useEffect, useRef } from "react";
import {
  Plus, X, Link as LinkIcon, Search, Trash2, ShoppingBag,
  Home, Heart, Bookmark, User, Settings, Sun, Moon, ChevronLeft, Camera, LogOut, Ban
} from "lucide-react";
import { supabase } from "./supabaseClient";

const ITEM_TYPES = ["Top", "Jumper", "Shirt", "Jacket", "Trousers", "Jeans", "Shoes", "Bag", "Accessory"];
const PREFS_KEY = "fitboard-prefs";
const ADMIN_EMAILS = ["kakhifn@gmail.com"];
const STYLE_OPTIONS = ["Y2K", "Streetwear", "Baggy", "Emo", "Grunge", "Sporty", "Preppy", "Minimalist", "Cottagecore", "Techwear", "Vintage", "Formal"];

const THEMES = {
  dark: {
    bg: "#0a0a0a", card: "#161616", cardAlt: "#1c1c1c", border: "#2a2a2a",
    text: "#ffffff", textMuted: "#999999", textFaint: "#666666",
    accent: "#E8442C", inputBg: "#1f1f1f", sheetBg: "#141414",
  },
  light: {
    bg: "#faf9f7", card: "#ffffff", cardAlt: "#f3f1ee", border: "#e6e2dc",
    text: "#181614", textMuted: "#6b6560", textFaint: "#9a938c",
    accent: "#E8442C", inputBg: "#f3f1ee", sheetBg: "#ffffff",
  },
};

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { theme: "dark", liked: [], saved: [] };
    return JSON.parse(raw);
  } catch {
    return { theme: "dark", liked: [], saved: [] };
  }
}

function savePrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {}
}

export default function App() {
  const [session, setSession] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authMode, setAuthMode] = useState("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");

  const [items, setItems] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [viewingProfileId, setViewingProfileId] = useState(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("feed");
  const [showSettings, setShowSettings] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);

  const [profilesLoaded, setProfilesLoaded] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [obGender, setObGender] = useState("");
  const [obStyles, setObStyles] = useState([]);
  const [obSaving, setObSaving] = useState(false);

  const initialPrefs = loadPrefs();
  const [themeName, setThemeName] = useState(initialPrefs.theme);
  const [liked, setLiked] = useState(initialPrefs.liked);
  const [saved, setSaved] = useState(initialPrefs.saved);

  const [imgFile, setImgFile] = useState(null);
  const [imgPreview, setImgPreview] = useState(null);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [links, setLinks] = useState([]);
  const [linkType, setLinkType] = useState(ITEM_TYPES[0]);
  const [linkUrl, setLinkUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputId = useRef(`file-${Math.random().toString(36).slice(2)}`);
  const avatarInputId = useRef(`avatar-${Math.random().toString(36).slice(2)}`);

  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatar, setEditAvatar] = useState(null);

  const t = THEMES[themeName];
  const isAdmin = session && ADMIN_EMAILS.includes((session.user.email || "").toLowerCase());

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthChecked(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      loadItems();
      loadProfiles();
    }
  }, [session]);

  function persist(next) {
    const merged = {
      theme: next.theme !== undefined ? next.theme : themeName,
      liked: next.liked !== undefined ? next.liked : liked,
      saved: next.saved !== undefined ? next.saved : saved,
    };
    savePrefs(merged);
  }

  async function loadItems() {
    setLoading(true);
    setLoadError("");
    const { data, error: fetchError } = await supabase
      .from("outfits")
      .select("*")
      .order("created_at", { ascending: false });
    if (fetchError) {
      setLoadError("Couldn't load the feed.");
      setItems([]);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  }

  async function loadProfiles() {
    const { data } = await supabase.from("profiles").select("*");
    const map = {};
    if (data) data.forEach((p) => { map[p.user_id] = p; });
    setProfiles(map);
    setProfilesLoaded(true);
  }

  useEffect(() => {
    if (session && profilesLoaded) {
      const p = profiles[session.user.id];
      if (!p || !p.onboarded) setShowOnboarding(true);
    }
  }, [session, profilesLoaded]);

  async function handleGoogleLogin() {
    setAuthError("");
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (oauthError) setAuthError("Google sign-in failed — try again.");
  }

  async function handleEmailAuth() {
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError("Enter both email and password.");
      return;
    }
    setAuthBusy(true);
    setAuthError("");
    setAuthMessage("");
    if (authMode === "signup") {
      const { error: signUpError } = await supabase.auth.signUp({
        email: authEmail.trim(),
        password: authPassword,
      });
      if (signUpError) {
        setAuthError(signUpError.message);
      } else {
        setAuthMessage("Check your email to confirm your account, then sign in.");
        setAuthMode("signin");
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: authEmail.trim(),
        password: authPassword,
      });
      if (signInError) setAuthError(signInError.message);
    }
    setAuthBusy(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setShowSettings(false);
    setTab("feed");
  }

  function toggleTheme() {
    const next = themeName === "dark" ? "light" : "dark";
    setThemeName(next);
    persist({ theme: next });
  }

  async function toggleLiked(item) {
    const alreadyLiked = liked.includes(item.id);
    const next = alreadyLiked ? liked.filter((x) => x !== item.id) : [...liked, item.id];
    setLiked(next);
    persist({ liked: next });

    const newCount = Math.max(0, (item.like_count || 0) + (alreadyLiked ? -1 : 1));
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, like_count: newCount } : i)));
    if (showDetail && showDetail.id === item.id) {
      setShowDetail({ ...showDetail, like_count: newCount });
    }
    await supabase.from("outfits").update({ like_count: newCount }).eq("id", item.id);
  }

  function toggleSaved(id) {
    const next = saved.includes(id) ? saved.filter((x) => x !== id) : [...saved, id];
    setSaved(next);
    persist({ saved: next });
  }

  function handleFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("That file isn't an image.");
    if (file.size > 5 * 1024 * 1024) return setError("Image too large — pick something under 5MB.");
    setError("");
    setImgFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImgPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  function handleAvatarFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 3 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = (ev) => setEditAvatar(ev.target.result);
    reader.readAsDataURL(file);
  }

  function addLink() {
    if (!linkUrl.trim()) return setError("Paste a link first.");
    const url = linkUrl.trim().startsWith("http") ? linkUrl.trim() : `https://${linkUrl.trim()}`;
    setLinks([...links, { type: linkType, url }]);
    setLinkUrl("");
    setError("");
  }

  function removeLink(idx) {
    setLinks(links.filter((_, i) => i !== idx));
  }

  function resetForm() {
    setImgFile(null);
    setImgPreview(null);
    setTitle("");
    setPrice("");
    setLinks([]);
    setLinkUrl("");
    setError("");
  }

  function currentProfile() {
    return (session && profiles[session.user.id]) || { username: "", bio: "", avatar_url: null };
  }

  async function handleUpload() {
    if (!imgFile) return setError("Add a photo first.");
    if (!title.trim()) return setError("Add a title.");
    if (!price.trim()) return setError("Add a price.");
    if (links.length === 0) return setError("Add at least one item link.");

    setSaving(true);
    setError("");
    try {
      const fileExt = imgFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("outfit-images")
        .upload(fileName, imgFile);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("outfit-images")
        .getPublicUrl(fileName);

      const myProfile = currentProfile();

      const { error: insertError } = await supabase.from("outfits").insert({
        title: title.trim(),
        price: price.trim(),
        image_url: urlData.publicUrl,
        links,
        author: myProfile.username || session.user.email.split("@")[0],
        user_id: session.user.id,
        like_count: 0,
      });
      if (insertError) throw insertError;

      resetForm();
      setShowModal(false);
      loadItems();
    } catch (e) {
      setError(e.message && e.message.includes("row-level security") ? "You've been restricted from posting." : "Upload failed — try again.");
    }
    setSaving(false);
  }

  async function handleDelete(item) {
    if (!window.confirm("Delete this outfit? This can't be undone.")) return;
    const { error: deleteError } = await supabase.from("outfits").delete().eq("id", item.id);
    if (deleteError) {
      setError("Couldn't delete — try again.");
      return;
    }
    setShowDetail(null);
    loadItems();
  }

  async function handleBanUser(userId) {
    if (!window.confirm("Ban this user? They won't be able to post anymore.")) return;
    const { error: banError } = await supabase.from("banned_users").insert({ user_id: userId });
    if (banError) {
      alert("Couldn't ban — they may already be banned, or you may need to re-check admin setup.");
    } else {
      alert("User banned.");
    }
  }

  function openEditProfile() {
    const p = currentProfile();
    setEditUsername(p.username || "");
    setEditBio(p.bio || "");
    setEditAvatar(p.avatar_url || null);
    setShowEditProfile(true);
  }

  async function saveProfile() {
    const existing = currentProfile();
    const payload = {
      user_id: session.user.id,
      username: editUsername.trim(),
      bio: editBio.trim(),
      avatar_url: editAvatar,
      gender: existing.gender || null,
      styles: existing.styles || [],
      onboarded: true,
      updated_at: new Date().toISOString(),
    };
    const { error: upsertError } = await supabase.from("profiles").upsert(payload);
    if (upsertError) {
      setError("Couldn't save profile — try again.");
      return;
    }
    setProfiles((prev) => ({ ...prev, [session.user.id]: payload }));
    setShowEditProfile(false);
  }

  function toggleStyle(s) {
    setObStyles((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  async function saveOnboarding() {
    setObSaving(true);
    const existing = profiles[session.user.id] || {};
    const payload = {
      user_id: session.user.id,
      username: existing.username || "",
      bio: existing.bio || "",
      avatar_url: existing.avatar_url || null,
      gender: obGender,
      styles: obStyles,
      onboarded: true,
      updated_at: new Date().toISOString(),
    };
    const { error: upsertError } = await supabase.from("profiles").upsert(payload);
    if (!upsertError) {
      setProfiles((prev) => ({ ...prev, [session.user.id]: payload }));
      setShowOnboarding(false);
    }
    setObSaving(false);
  }

  const baseList =
    tab === "liked" ? items.filter((i) => liked.includes(i.id)) :
    tab === "saved" ? items.filter((i) => saved.includes(i.id)) :
    items;

  const filtered = baseList.filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    if ((item.title || "").toLowerCase().includes(q)) return true;
    if (String(item.price).toLowerCase().includes(q)) return true;
    return (item.links || []).some((l) => l.type.toLowerCase().includes(q));
  });

  const isMine = (item) => session && (item.user_id === session.user.id || isAdmin);

  function authorLabel(item) {
    const p = profiles[item.user_id];
    return (p && p.username) || item.author || "Anonymous";
  }

  if (!authChecked) {
    return (
      <div style={{ ...styles.page, background: THEMES.dark.bg, color: THEMES.dark.text, display: "flex", alignItems: "center", justifyContent: "center" }}>
        Loading…
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ ...styles.page, background: t.bg, color: t.text, display: "flex", flexDirection: "column", justifyContent: "center", padding: 24 }}>
        <style>{`
          * { box-sizing: border-box; }
          .auth-input {
            width: 100%; background: ${t.inputBg}; border: 1px solid ${t.border}; border-radius: 12px;
            padding: 14px; color: ${t.text}; font-size: 15px; outline: none; margin-top: 10px;
          }
          .auth-input:focus { border-color: ${t.accent}; }
          .auth-btn {
            width: 100%; padding: 14px; border-radius: 12px; font-weight: 700; font-size: 15px;
            border: none; cursor: pointer; margin-top: 14px;
          }
          .auth-google { background: #fff; color: #1a1a1a; display: flex; align-items: center; justify-content: center; gap: 10px; }
          .auth-primary { background: ${t.accent}; color: #fff; }
          .auth-switch { text-align: center; margin-top: 18px; font-size: 13px; color: ${t.textMuted}; }
          .auth-switch span { color: ${t.accent}; font-weight: 700; cursor: pointer; }
        `}</style>
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{ fontSize: 30, fontWeight: 900 }}><span style={{ color: t.accent }}>Fit</span>Board</div>
          <div style={{ fontSize: 13, color: t.textMuted, marginTop: 6 }}>Post your fits. Shop everyone else's.</div>
        </div>

        <button className="auth-btn auth-google" onClick={handleGoogleLogin}>
          Continue with Google
        </button>

        <div style={{ textAlign: "center", color: t.textFaint, fontSize: 12, margin: "18px 0" }}>or</div>

        <input className="auth-input" type="email" placeholder="Email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} />
        <input className="auth-input" type="password" placeholder="Password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} />

        {authError && <div style={{ color: "#ff6b5e", fontSize: 13, marginTop: 10 }}>{authError}</div>}
        {authMessage && <div style={{ color: "#5eb8ff", fontSize: 13, marginTop: 10 }}>{authMessage}</div>}

        <button className="auth-btn auth-primary" onClick={handleEmailAuth} disabled={authBusy}>
          {authBusy ? "Please wait…" : authMode === "signup" ? "Create account" : "Sign in"}
        </button>

        <div className="auth-switch">
          {authMode === "signup" ? (
            <>Already have an account? <span onClick={() => { setAuthMode("signin"); setAuthError(""); }}>Sign in</span></>
          ) : (
            <>New here? <span onClick={() => { setAuthMode("signup"); setAuthError(""); }}>Create an account</span></>
          )}
        </div>
      </div>
    );
  }

  if (session && showOnboarding) {
    return (
      <div style={{ ...styles.page, background: t.bg, color: t.text, padding: 24 }}>
        <style>{`
          * { box-sizing: border-box; }
          .ob-title { font-size: 22px; font-weight: 900; margin-top: 20px; }
          .ob-sub { font-size: 13px; color: ${t.textMuted}; margin-top: 6px; margin-bottom: 20px; }
          .ob-gender-row { display: flex; gap: 10px; }
          .ob-gender-btn {
            flex: 1; padding: 14px; border-radius: 12px; border: 1px solid ${t.border};
            background: ${t.cardAlt}; color: ${t.text}; font-weight: 700; font-size: 14px; cursor: pointer;
          }
          .ob-gender-btn.active { border-color: ${t.accent}; color: ${t.accent}; }
          .ob-style-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px; }
          .ob-style-chip {
            padding: 10px 16px; border-radius: 20px; border: 1px solid ${t.border};
            background: ${t.cardAlt}; color: ${t.text}; font-weight: 700; font-size: 13px; cursor: pointer;
          }
          .ob-style-chip.active { background: ${t.accent}; border-color: ${t.accent}; color: #fff; }
          .ob-continue {
            width: 100%; margin-top: 28px; background: ${t.accent}; color: #fff; font-weight: 700;
            font-size: 15px; border: none; border-radius: 14px; padding: 15px; cursor: pointer;
          }
          .ob-continue:disabled { opacity: 0.5; }
          .ob-skip { text-align: center; margin-top: 14px; color: ${t.textFaint}; font-size: 13px; cursor: pointer; }
        `}</style>
        <div className="ob-title">What's your vibe?</div>
        <div className="ob-sub">This helps us show you outfits you'll actually like.</div>

        <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: t.textMuted, marginBottom: 10 }}>
          Gender
        </div>
        <div className="ob-gender-row">
          {["Female", "Male", "Other"].map((g) => (
            <button key={g} className={`ob-gender-btn ${obGender === g ? "active" : ""}`} onClick={() => setObGender(g)}>
              {g}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: t.textMuted, marginTop: 24 }}>
          Styles you're into (pick as many as you like)
        </div>
        <div className="ob-style-grid">
          {STYLE_OPTIONS.map((s) => (
            <button key={s} className={`ob-style-chip ${obStyles.includes(s) ? "active" : ""}`} onClick={() => toggleStyle(s)}>
              {s}
            </button>
          ))}
        </div>

        <button className="ob-continue" onClick={saveOnboarding} disabled={obSaving}>
          {obSaving ? "Saving…" : "Continue"}
        </button>
        <div className="ob-skip" onClick={saveOnboarding}>Skip for now</div>
      </div>
    );
  }

  const viewingProfile = viewingProfileId ? (profiles[viewingProfileId] || {}) : null;
  const viewingProfilePosts = viewingProfileId ? items.filter((i) => i.user_id === viewingProfileId) : [];

  return (
    <div style={{ ...styles.page, background: t.bg, color: t.text }}>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
        .masonry { columns: 2; column-gap: 10px; padding: 10px; }
        @media (min-width: 640px) { .masonry { columns: 3; } }
        @media (min-width: 900px) { .masonry { columns: 4; } }
        .card {
          break-inside: avoid; margin-bottom: 10px; border-radius: 16px; overflow: hidden;
          background: ${t.card}; border: 1px solid ${t.border}; position: relative; cursor: pointer;
          transition: transform 0.15s ease;
        }
        .card:active { transform: scale(0.97); }
        .card img { width: 100%; display: block; }
        .price-tag {
          position: absolute; top: 8px; left: 8px; background: rgba(20,20,20,0.85); backdrop-filter: blur(4px);
          color: #fff; font-weight: 700; font-size: 13px; padding: 5px 10px; border-radius: 20px;
        }
        .like-badge {
          position: absolute; top: 8px; right: 8px; background: rgba(20,20,20,0.85); backdrop-filter: blur(4px);
          color: #fff; font-weight: 700; font-size: 11px; padding: 4px 8px; border-radius: 20px;
          display: flex; align-items: center; gap: 3px;
        }
        .card-footer { padding: 8px 10px 10px; }
        .card-title {
          font-size: 12px; font-weight: 700; color: ${t.text};
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .card-author {
          font-size: 11px; color: ${t.textFaint}; margin-top: 2px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .fab {
          position: fixed; bottom: 78px; right: 20px; width: 56px; height: 56px; border-radius: 50%;
          background: ${t.accent}; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 8px 24px rgba(232,68,44,0.4); border: none; cursor: pointer; z-index: 30;
        }
        .fab:active { transform: scale(0.94); }
        .modal-backdrop, .detail-backdrop {
          position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: flex-end; z-index: 40;
        }
        .detail-backdrop { align-items: center; justify-content: center; padding: 16px; }
        .modal-sheet {
          background: ${t.sheetBg}; width: 100%; border-radius: 22px 22px 0 0; padding: 20px 18px 26px;
          max-height: 90vh; overflow-y: auto; border-top: 1px solid ${t.border}; position: relative;
        }
        .detail-card {
          background: ${t.sheetBg}; border-radius: 20px; max-width: 420px; width: 100%;
          max-height: 88vh; overflow-y: auto; border: 1px solid ${t.border};
        }
        .detail-img { width: 100%; display: block; }
        .detail-body { padding: 16px; }
        .drop-label {
          border: 1.5px dashed ${t.border}; border-radius: 16px; height: 220px; display: flex;
          flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: ${t.textFaint};
          cursor: pointer; overflow: hidden; position: relative;
        }
        .drop-label img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .field-label {
          font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
          color: ${t.textMuted}; margin: 18px 0 8px; display: flex; align-items: center; gap: 6px;
        }
        .field-input {
          width: 100%; background: ${t.inputBg}; border: 1px solid ${t.border}; border-radius: 12px;
          padding: 13px 14px; color: ${t.text}; font-size: 15px; outline: none;
        }
        .field-input:focus { border-color: ${t.accent}; }
        .link-row { display: flex; gap: 8px; }
        .link-select {
          background: ${t.inputBg}; border: 1px solid ${t.border}; border-radius: 12px; color: ${t.text};
          font-size: 14px; padding: 0 10px; flex: 0 0 118px;
        }
        .add-link-btn {
          flex: 0 0 auto; background: ${t.cardAlt}; border: 1px solid ${t.border}; color: ${t.text};
          font-weight: 700; font-size: 13px; border-radius: 12px; padding: 0 16px; cursor: pointer;
        }
        .link-chip {
          display: flex; align-items: center; justify-content: space-between; background: ${t.cardAlt};
          border: 1px solid ${t.border}; border-radius: 12px; padding: 10px 12px; margin-top: 8px;
        }
        .link-chip-label { font-size: 13px; font-weight: 700; color: ${t.accent}; margin-right: 8px; }
        .link-chip-url { font-size: 12px; color: ${t.textMuted}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
        .upload-cta {
          margin-top: 22px; width: 100%; background: ${t.accent}; color: #fff; font-weight: 700; font-size: 15px;
          border: none; border-radius: 14px; padding: 15px; cursor: pointer;
        }
        .upload-cta:disabled { opacity: 0.5; }
        .search-wrap { margin: 0 12px 4px; position: relative; }
        .search-input {
          width: 100%; background: ${t.card}; border: 1px solid ${t.border}; border-radius: 14px;
          padding: 12px 14px 12px 40px; color: ${t.text}; font-size: 14px; outline: none;
        }
        .search-input:focus { border-color: ${t.accent}; }
        .search-icon { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: ${t.textFaint}; }
        .buy-link-btn {
          display: flex; align-items: center; justify-content: space-between; background: ${t.cardAlt};
          border: 1px solid ${t.border}; border-radius: 12px; padding: 13px 14px; margin-top: 10px;
          cursor: pointer; text-decoration: none; color: ${t.text};
        }
        .action-row { display: flex; gap: 10px; margin-top: 14px; }
        .action-btn {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
          background: ${t.cardAlt}; border: 1px solid ${t.border}; border-radius: 12px; padding: 11px;
          cursor: pointer; font-weight: 700; font-size: 13px; color: ${t.text};
        }
        .action-btn.active { border-color: ${t.accent}; color: ${t.accent}; }
        .action-btn.danger { color: #ff6b5e; }
        .bottom-nav {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 25; display: flex; background: ${t.sheetBg};
          border-top: 1px solid ${t.border}; padding: 8px 6px calc(8px + env(safe-area-inset-bottom));
        }
        .nav-btn {
          flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; background: none;
          border: none; cursor: pointer; padding: 6px 0; color: ${t.textFaint}; font-size: 10.5px; font-weight: 700;
        }
        .nav-btn.active { color: ${t.accent}; }
        .top-bar { display: flex; align-items: center; justify-content: space-between; padding: 18px 16px 12px; }
        .icon-btn {
          background: ${t.cardAlt}; border: 1px solid ${t.border}; border-radius: 12px; width: 38px; height: 38px;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
        }
        .settings-row {
          display: flex; align-items: center; justify-content: space-between; background: ${t.cardAlt};
          border: 1px solid ${t.border}; border-radius: 14px; padding: 14px; margin-top: 10px; cursor: pointer;
        }
        .toggle-track {
          width: 46px; height: 26px; border-radius: 20px; background: ${themeName === "dark" ? t.accent : t.border};
          position: relative; cursor: pointer; transition: background 0.2s;
        }
        .toggle-thumb {
          width: 20px; height: 20px; border-radius: 50%; background: #fff; position: absolute; top: 3px;
          left: ${themeName === "dark" ? "23px" : "3px"}; transition: left 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        .profile-header { display: flex; flex-direction: column; align-items: center; padding: 24px 20px 10px; text-align: center; }
        .avatar-lg {
          width: 84px; height: 84px; border-radius: 50%; background: ${t.cardAlt}; border: 2px solid ${t.border};
          display: flex; align-items: center; justify-content: center; overflow: hidden; margin-bottom: 12px;
        }
        .avatar-lg img { width: 100%; height: 100%; object-fit: cover; }
        .edit-profile-btn {
          margin-top: 14px; background: ${t.cardAlt}; border: 1px solid ${t.border}; color: ${t.text};
          font-weight: 700; font-size: 13px; padding: 10px 20px; border-radius: 20px; cursor: pointer;
        }
        .avatar-picker {
          width: 90px; height: 90px; border-radius: 50%; margin: 0 auto; background: ${t.cardAlt};
          border: 1.5px dashed ${t.border}; display: flex; align-items: center; justify-content: center;
          overflow: hidden; cursor: pointer; position: relative;
        }
        .avatar-picker img { width: 100%; height: 100%; object-fit: cover; }
        .sheet-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
        .back-btn {
          background: none; border: none; color: ${t.text}; cursor: pointer; display: flex; align-items: center;
          gap: 4px; font-weight: 700; font-size: 14px;
        }
        .hidden-file-input { position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden; }
        .author-link { cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
      `}</style>

      {tab === "profile" ? (
        <>
          <div className="top-bar">
            <span style={{ fontWeight: 900, fontSize: 18 }}>Profile</span>
            <button className="icon-btn" onClick={() => setShowSettings(true)} aria-label="Settings">
              <Settings size={18} />
            </button>
          </div>
          <div className="profile-header">
            <div className="avatar-lg">
              {currentProfile().avatar_url ? <img src={currentProfile().avatar_url} alt="avatar" /> : <User size={34} color={t.textFaint} />}
            </div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>{currentProfile().username || session.user.email}</div>
            <div style={{ fontSize: 13, color: t.textMuted, marginTop: 4, maxWidth: 280 }}>
              {currentProfile().bio || "No bio yet — tell people what your fits are about."}
            </div>
            <button className="edit-profile-btn" onClick={openEditProfile}>Edit profile</button>
          </div>

          <div style={{ display: "flex", gap: 10, padding: "18px 16px 4px" }}>
            <div className="action-btn" style={{ cursor: "default" }}><Heart size={14} /> {liked.length} liked</div>
            <div className="action-btn" style={{ cursor: "default" }}><Bookmark size={14} /> {saved.length} saved</div>
          </div>

          <div style={{ padding: "16px 16px 0", fontSize: 12, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Your uploads
          </div>
          {items.filter((i) => i.user_id === session.user.id).length === 0 ? (
            <div style={styles.empty}>Nothing posted yet.</div>
          ) : (
            <div className="masonry">
              {items.filter((i) => i.user_id === session.user.id).map((item) => (
                <div className="card" key={item.id} onClick={() => setShowDetail(item)}>
                  <img src={item.image_url} alt={item.title || "Outfit"} />
                  <div className="price-tag">€{item.price}</div>
                  <div className="like-badge"><Heart size={10} /> {item.like_count || 0}</div>
                  <div className="card-footer">
                    {item.title && <div className="card-title">{item.title}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="top-bar">
            <span style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-0.02em" }}>
              <span style={{ color: t.accent }}>Fit</span>Board
            </span>
            <button className="icon-btn" onClick={() => setShowSettings(true)} aria-label="Settings">
              <Settings size={18} />
            </button>
          </div>

          <div className="search-wrap">
            <Search className="search-icon" size={16} />
            <input
              className="search-input"
              placeholder="Search by title, price, or item — e.g. y2k"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {loading ? (
            <div style={styles.empty}>Loading looks…</div>
          ) : loadError ? (
            <div style={styles.empty}>{loadError}</div>
          ) : filtered.length === 0 ? (
            <div style={styles.empty}>
              {tab === "liked" && "No liked outfits yet."}
              {tab === "saved" && "No saved outfits yet."}
              {tab === "feed" && (items.length === 0 ? <>No looks yet.<br />Tap + to post the first one.</> : `No matches for "${query}"`)}
            </div>
          ) : (
            <div className="masonry">
              {filtered.map((item) => (
                <div className="card" key={item.id} onClick={() => setShowDetail(item)}>
                  <img src={item.image_url} alt={item.title || "Outfit"} />
                  <div className="price-tag">€{item.price}</div>
                  <div className="like-badge"><Heart size={10} /> {item.like_count || 0}</div>
                  <div className="card-footer">
                    {item.title && <div className="card-title">{item.title}</div>}
                    <div
                      className="card-author author-link"
                      onClick={(e) => { e.stopPropagation(); setViewingProfileId(item.user_id); }}
                    >
                      by {authorLabel(item)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "feed" && (
        <button className="fab" onClick={() => setShowModal(true)} aria-label="Add outfit">
          <Plus color="#fff" size={26} strokeWidth={2.5} />
        </button>
      )}

      <nav className="bottom-nav">
        <button className={`nav-btn ${tab === "feed" ? "active" : ""}`} onClick={() => setTab("feed")}><Home size={20} /> Feed</button>
        <button className={`nav-btn ${tab === "liked" ? "active" : ""}`} onClick={() => setTab("liked")}><Heart size={20} /> Liked</button>
        <button className={`nav-btn ${tab === "saved" ? "active" : ""}`} onClick={() => setTab("saved")}><Bookmark size={20} /> Saved</button>
        <button className={`nav-btn ${tab === "profile" ? "active" : ""}`} onClick={() => setTab("profile")}><User size={20} /> Profile</button>
      </nav>

      {showDetail && (
        <div className="detail-backdrop" onClick={() => setShowDetail(null)}>
          <div className="detail-card" onClick={(e) => e.stopPropagation()}>
            <img className="detail-img" src={showDetail.image_url} alt="Outfit" />
            <div className="detail-body">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  {showDetail.title && (
                    <div style={{ fontSize: 13, fontWeight: 700, color: t.textMuted, marginBottom: 4 }}>{showDetail.title}</div>
                  )}
                  <span style={{ fontSize: 20, fontWeight: 900 }}>€{showDetail.price}</span>
                  <div
                    className="author-link"
                    style={{ fontSize: 12, color: t.textFaint, marginTop: 4 }}
                    onClick={() => { setShowDetail(null); setViewingProfileId(showDetail.user_id); }}
                  >
                    by {authorLabel(showDetail)}
                  </div>
                </div>
                <button onClick={() => setShowDetail(null)} style={{ background: "none", border: "none", color: t.textMuted, cursor: "pointer" }}>
                  <X size={20} />
                </button>
              </div>

              <div className="action-row">
                <button className={`action-btn ${liked.includes(showDetail.id) ? "active" : ""}`} onClick={() => toggleLiked(showDetail)}>
                  <Heart size={15} fill={liked.includes(showDetail.id) ? t.accent : "none"} /> Like · {showDetail.like_count || 0}
                </button>
                <button className={`action-btn ${saved.includes(showDetail.id) ? "active" : ""}`} onClick={() => toggleSaved(showDetail.id)}>
                  <Bookmark size={15} fill={saved.includes(showDetail.id) ? t.accent : "none"} /> Save
                </button>
              </div>

              {isMine(showDetail) && (
                <button className="action-btn danger" style={{ width: "100%", marginTop: 10 }} onClick={() => handleDelete(showDetail)}>
                  <Trash2 size={15} /> Delete this outfit
                </button>
              )}

              {isAdmin && showDetail.user_id !== session.user.id && (
                <button className="action-btn danger" style={{ width: "100%", marginTop: 10 }} onClick={() => handleBanUser(showDetail.user_id)}>
                  <Ban size={15} /> Ban this user
                </button>
              )}

              <div className="field-label" style={{ marginTop: 16 }}>Shop this look</div>
              {(showDetail.links || []).map((l, i) => (
                <a key={i} className="buy-link-btn" href={l.url} target="_blank" rel="noopener noreferrer">
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{l.type}</span>
                  <span style={{ color: t.accent, fontWeight: 700, fontSize: 13 }}>Shop →</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewingProfileId && (
        <div className="detail-backdrop" onClick={() => setViewingProfileId(null)}>
          <div className="detail-card" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "80vh" }}>
            <div style={{ padding: 16 }}>
              <div className="sheet-header">
                <span style={{ fontWeight: 800, fontSize: 16 }}>Profile</span>
                <button onClick={() => setViewingProfileId(null)} style={{ background: "none", border: "none", color: t.textMuted, cursor: "pointer" }}>
                  <X size={20} />
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 0" }}>
                <div className="avatar-lg">
                  {viewingProfile && viewingProfile.avatar_url ? (
                    <img src={viewingProfile.avatar_url} alt="avatar" />
                  ) : (
                    <User size={30} color={t.textFaint} />
                  )}
                </div>
                <div style={{ fontWeight: 900, fontSize: 17 }}>
                  {(viewingProfile && viewingProfile.username) || "Anonymous"}
                </div>
                {viewingProfile && viewingProfile.bio && (
                  <div style={{ fontSize: 13, color: t.textMuted, marginTop: 4, textAlign: "center" }}>{viewingProfile.bio}</div>
                )}
                {isAdmin && viewingProfileId !== session.user.id && (
                  <button className="action-btn danger" style={{ marginTop: 14, padding: "9px 18px" }} onClick={() => handleBanUser(viewingProfileId)}>
                    <Ban size={14} /> Ban this user
                  </button>
                )}
              </div>
            </div>
            <div style={{ padding: "0 16px 16px", fontSize: 12, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {viewingProfilePosts.length} {viewingProfilePosts.length === 1 ? "post" : "posts"}
            </div>
            <div className="masonry" style={{ padding: "0 6px 16px" }}>
              {viewingProfilePosts.map((item) => (
                <div
                  className="card"
                  key={item.id}
                  onClick={() => { setViewingProfileId(null); setShowDetail(item); }}
                >
                  <img src={item.image_url} alt={item.title || "Outfit"} />
                  <div className="price-tag">€{item.price}</div>
                  <div className="like-badge"><Heart size={10} /> {item.like_count || 0}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-header">
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Post a fit</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} style={{ background: "none", border: "none", color: t.textMuted, cursor: "pointer" }}>
                <X size={22} />
              </button>
            </div>

            <div className="field-label">Photo</div>
            <label htmlFor={fileInputId.current} className="drop-label">
              {imgPreview ? <img src={imgPreview} alt="preview" /> : (
                <><Plus size={26} color={t.textFaint} /><span style={{ fontSize: 13 }}>Tap to add a photo</span></>
              )}
            </label>
            <input id={fileInputId.current} type="file" accept="image/*" onChange={handleFile} className="hidden-file-input" />

            <div className="field-label">Title</div>
            <input className="field-input" type="text" placeholder="e.g. Y2K black and white" value={title} onChange={(e) => setTitle(e.target.value)} />

            <div className="field-label">Price (€)</div>
            <input className="field-input" type="number" inputMode="decimal" placeholder="e.g. 45" value={price} onChange={(e) => setPrice(e.target.value)} />

            <div className="field-label"><LinkIcon size={13} /> Item links</div>
            <div className="link-row">
              <select className="link-select" value={linkType} onChange={(e) => setLinkType(e.target.value)}>
                {ITEM_TYPES.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
              </select>
              <input className="field-input" style={{ flex: 1 }} type="text" placeholder="Paste product link" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
              <button className="add-link-btn" onClick={addLink}>Add</button>
            </div>

            {links.map((l, i) => (
              <div className="link-chip" key={i}>
                <div style={{ display: "flex", alignItems: "center", overflow: "hidden" }}>
                  <span className="link-chip-label">{l.type}</span>
                  <span className="link-chip-url">{l.url}</span>
                </div>
                <button onClick={() => removeLink(i)} style={{ background: "none", border: "none", color: t.textMuted, cursor: "pointer", flexShrink: 0, marginLeft: 8 }}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}

            {error && <div style={{ color: "#ff6b5e", fontSize: 13, marginTop: 12 }}>{error}</div>}

            <button className="upload-cta" onClick={handleUpload} disabled={saving}>
              {saving ? "Uploading…" : "Upload"}
            </button>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="modal-backdrop" onClick={() => setShowSettings(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-header">
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Settings</h2>
              <button onClick={() => setShowSettings(false)} style={{ background: "none", border: "none", color: t.textMuted, cursor: "pointer" }}>
                <X size={22} />
              </button>
            </div>

            <div style={{ fontSize: 12, color: t.textFaint, marginTop: 10 }}>
              Signed in as {session.user.email}{isAdmin ? " · Admin" : ""}
            </div>

            <div className="settings-row" style={{ cursor: "default" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {themeName === "dark" ? <Moon size={17} /> : <Sun size={17} />}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Dark mode</div>
                  <div style={{ fontSize: 12, color: t.textMuted }}>{themeName === "dark" ? "On" : "Off"}</div>
                </div>
              </div>
              <div className="toggle-track" onClick={toggleTheme}><div className="toggle-thumb" /></div>
            </div>

            <div className="settings-row" onClick={() => { setShowSettings(false); openEditProfile(); }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <User size={17} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Edit profile</div>
                  <div style={{ fontSize: 12, color: t.textMuted }}>Username, bio, photo</div>
                </div>
              </div>
              <span style={{ color: t.textFaint }}>›</span>
            </div>

            <div className="settings-row" onClick={handleSignOut}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <LogOut size={17} color="#ff6b5e" />
                <div style={{ fontWeight: 700, fontSize: 14, color: "#ff6b5e" }}>Sign out</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditProfile && (
        <div className="modal-backdrop" onClick={() => setShowEditProfile(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-header">
              <button className="back-btn" onClick={() => setShowEditProfile(false)}><ChevronLeft size={18} /> Back</button>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Edit profile</h2>
              <div style={{ width: 40 }} />
            </div>

            <label htmlFor={avatarInputId.current} className="avatar-picker" style={{ marginTop: 14 }}>
              {editAvatar ? <img src={editAvatar} alt="avatar preview" /> : <Camera size={22} color={t.textFaint} />}
            </label>
            <input id={avatarInputId.current} type="file" accept="image/*" onChange={handleAvatarFile} className="hidden-file-input" />

            <div className="field-label">Username</div>
            <input className="field-input" type="text" placeholder="e.g. jaxfits" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />

            <div className="field-label">Bio</div>
            <input className="field-input" type="text" placeholder="A line about your style" value={editBio} onChange={(e) => setEditBio(e.target.value)} />

            {error && <div style={{ color: "#ff6b5e", fontSize: 13, marginTop: 12 }}>{error}</div>}

            <button className="upload-cta" onClick={saveProfile}>Save profile</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", paddingBottom: 80 },
  empty: { textAlign: "center", color: "#888", padding: "60px 20px", fontSize: 14, lineHeight: 1.6 },
};
