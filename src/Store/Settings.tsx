import { useEffect, useState } from "react";
import "./style.scss";

type SettingsState = {
    profile: {
        displayName: string;
        headline: string;
        bio: string;
    };
    contact: {
        email: string;
        website: string;
    };
    social: {
        instagram: string;
        twitter: string;
        youtube: string;
        tiktok: string;
        github: string;
        linkedin: string;
    };
    preferences: {
        theme: "system" | "light" | "dark";
        showDrafts: boolean;
        showAdminPanels: boolean;
    };
    api: {
        baseUrl: string;
    };
};

const LS_SETTINGS = "myshortbiz.settings.v1";

function safeParse<T>(raw: string | null, fallback: T): T {
    try {
        if (!raw) return fallback;
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

export default function Settings() {
    const [toast, setToast] = useState(false);

    const [settings, setSettings] = useState<SettingsState>(() => {
        const stored = safeParse<SettingsState>(localStorage.getItem(LS_SETTINGS), null as any);
        if (stored) return stored;

        const seed: SettingsState = {
            profile: {
                displayName: "Creator",
                headline: "Ex. Innovative Solutions to Social Media Marketing",
                bio: "Write a short bio here. AI implementation?",
            },
            contact: { email: "", website: "" },
            social: {
                instagram: "",
                twitter: "",
                youtube: "",
                tiktok: "",
                github: "",
                linkedin: "",
            },
            preferences: {
                theme: "system",
                showDrafts: true,
                showAdminPanels: true,
            },
            api: {
                baseUrl: "http://127.0.0.1:8000",
            },
        };

        localStorage.setItem(LS_SETTINGS, JSON.stringify(seed));
        return seed;
    });

    useEffect(() => {
        localStorage.setItem(LS_SETTINGS, JSON.stringify(settings));
    }, [settings]);

    useEffect(() => {
        const root = document.documentElement; // <html>
        const theme = settings.preferences.theme;

        if (theme === "system") {
            root.removeAttribute("data-theme");
        } else {
            root.setAttribute("data-theme", theme); // "light" | "dark"
        }
    }, [settings.preferences.theme]);


    function saveNow() {
        localStorage.setItem(LS_SETTINGS, JSON.stringify(settings));
        setToast(true);
        window.setTimeout(() => setToast(false), 1200);
    }

    function resetAll() {
        localStorage.removeItem(LS_SETTINGS);
        window.location.reload();
    }

    return (
        <div className="settingsPage">
            <div className="settingsPage__scroll">
                <header className="settingsHeader">
                    <div>
                        <h1 className="settingsHeader__title">Settings</h1>
                        <p className="settingsHeader__subtitle">Profile + preferences. </p>
                    </div>

                    <div className="settingsHeader__actions">
                        <button className="btn" onClick={saveNow}>Save</button>
                        <button className="btn btn--danger" onClick={resetAll}>Reset</button>
                        {toast && <div className="toast">Saved</div>}
                    </div>
                </header>

                <div className="settingsGrid">
                    {/* Profile section */}
                    <section className="card">
                        <div className="sectionTitle">Profile</div>

                        <label className="field">
                            <div className="field__label">Display name</div>
                            <input
                                className="input"
                                value={settings.profile.displayName}
                                onChange={(e) =>
                                    setSettings((p) => ({ ...p, profile: { ...p.profile, displayName: e.target.value } }))
                                }
                            />
                        </label>

                        <label className="field">
                            <div className="field__label">Headline</div>
                            <input
                                className="input"
                                value={settings.profile.headline}
                                onChange={(e) =>
                                    setSettings((p) => ({ ...p, profile: { ...p.profile, headline: e.target.value } }))
                                }
                            />
                        </label>

                        <label className="field">
                            <div className="field__label">Bio</div>
                            <textarea
                                className="textarea"
                                rows={5}
                                value={settings.profile.bio}
                                onChange={(e) =>
                                    setSettings((p) => ({ ...p, profile: { ...p.profile, bio: e.target.value } }))
                                }
                            />
                        </label>

                        {/* Placeholder per guidance */}
                        <div className="aiPlaceholder">AI bio rewrite placeholder (later).</div>
                    </section>

                    {/* Contact section */}
                    <section className="card">
                        <div className="sectionTitle">Contact</div>

                        <label className="field">
                            <div className="field__label">Email</div>
                            <input
                                className="input"
                                value={settings.contact.email}
                                onChange={(e) =>
                                    setSettings((p) => ({ ...p, contact: { ...p.contact, email: e.target.value } }))
                                }
                                placeholder="name@email.com"
                            />
                        </label>

                        <label className="field">
                            <div className="field__label">Website</div>
                            <input
                                className="input"
                                value={settings.contact.website}
                                onChange={(e) =>
                                    setSettings((p) => ({ ...p, contact: { ...p.contact, website: e.target.value } }))
                                }
                                placeholder="https://..."
                            />
                        </label>
                    </section>

                    {/* Social section */}
                    <section className="card settingsGrid__span2">
                        <div className="sectionTitle">Social</div>

                        <div className="row2">
                            <label className="field">
                                <div className="field__label">Instagram</div>
                                <input
                                    className="input"
                                    value={settings.social.instagram}
                                    onChange={(e) => setSettings((p) => ({ ...p, social: { ...p.social, instagram: e.target.value } }))}
                                    placeholder="https://instagram.com/..."
                                />
                            </label>

                            <label className="field">
                                <div className="field__label">Twitter/X</div>
                                <input
                                    className="input"
                                    value={settings.social.twitter}
                                    onChange={(e) => setSettings((p) => ({ ...p, social: { ...p.social, twitter: e.target.value } }))}
                                    placeholder="https://x.com/..."
                                />
                            </label>

                            <label className="field">
                                <div className="field__label">YouTube</div>
                                <input
                                    className="input"
                                    value={settings.social.youtube}
                                    onChange={(e) => setSettings((p) => ({ ...p, social: { ...p.social, youtube: e.target.value } }))}
                                    placeholder="https://youtube.com/..."
                                />
                            </label>

                            <label className="field">
                                <div className="field__label">TikTok</div>
                                <input
                                    className="input"
                                    value={settings.social.tiktok}
                                    onChange={(e) => setSettings((p) => ({ ...p, social: { ...p.social, tiktok: e.target.value } }))}
                                    placeholder="https://tiktok.com/@..."
                                />
                            </label>

                            <label className="field">
                                <div className="field__label">GitHub</div>
                                <input
                                    className="input"
                                    value={settings.social.github}
                                    onChange={(e) => setSettings((p) => ({ ...p, social: { ...p.social, github: e.target.value } }))}
                                    placeholder="https://github.com/..."
                                />
                            </label>

                            <label className="field">
                                <div className="field__label">LinkedIn</div>
                                <input
                                    className="input"
                                    value={settings.social.linkedin}
                                    onChange={(e) => setSettings((p) => ({ ...p, social: { ...p.social, linkedin: e.target.value } }))}
                                    placeholder="https://linkedin.com/in/..."
                                />
                            </label>
                        </div>
                    </section>

                    {/* Preferences section */}
                    <section className="card">
                        <div className="sectionTitle">Preferences</div>

                        <label className="field">
                            <div className="field__label">Theme</div>
                            <select
                                className="select"
                                value={settings.preferences.theme}
                                onChange={(e) =>
                                    setSettings((p) => ({ ...p, preferences: { ...p.preferences, theme: e.target.value as any } }))
                                }
                            >
                                <option value="system">system</option>
                                <option value="light">light</option>
                                <option value="dark">dark</option>
                            </select>
                        </label>

                        <label className="check">
                            <input
                                type="checkbox"
                                checked={settings.preferences.showDrafts}
                                onChange={(e) =>
                                    setSettings((p) => ({ ...p, preferences: { ...p.preferences, showDrafts: e.target.checked } }))
                                }
                            />
                            Show drafts in UI
                        </label>

                        <label className="check">
                            <input
                                type="checkbox"
                                checked={settings.preferences.showAdminPanels}
                                onChange={(e) =>
                                    setSettings((p) => ({
                                        ...p,
                                        preferences: { ...p.preferences, showAdminPanels: e.target.checked },
                                    }))
                                }
                            />
                            Show admin panels
                        </label>
                    </section>

                    {/* API section */}
                    <section className="card">
                        <div className="sectionTitle">API (later)</div>

                        <label className="field">
                            <div className="field__label">Base URL</div>
                            <input
                                className="input"
                                value={settings.api.baseUrl}
                                onChange={(e) => setSettings((p) => ({ ...p, api: { ...p.api, baseUrl: e.target.value } }))}
                                placeholder="http://127.0.0.1:8000"
                            />
                        </label>

                        <div className="muted">
                            Use this later when wiring frontend to backend (AI + storage).
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
