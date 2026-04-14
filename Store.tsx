/**
 * src/CreatorHome/Store.tsx
 *
 * Public-facing creator storefront — Amazon-style product detail page.
 * Route: /store?handle=alexdesigns
 *
 * No handle param → shows a directory of all creators.
 * With handle     → Amazon-style layout for the featured product:
 *   - Left: image gallery (uploaded photos or emoji fallback)
 *   - Right: sticky buy box
 *   - Below: scrollable info sections (About, Details, From the Creator, FAQs)
 *   - Admin panel (only visible when ?admin=1 in URL or toggled) to edit all content
 *
 * Data comes from the same localStorage keys as Shop.tsx (v2).
 * Extra store-page data (gallery images, sections) stored in LS_STORE_META.
 */

import { useMemo, useState, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";

/* ─── Shared types (mirror Shop.tsx) ─────────────────────── */
type ProductCategory = "Digital" | "Physical" | "Service";
type ProductStatus = "active" | "draft";

type Creator = {
    id: string;
    handle: string;
    displayName: string;
    avatar: string;
    bio: string;
    verified: boolean;
};

type Product = {
    id: string;
    creatorId: string;
    name: string;
    price: number;
    category: ProductCategory;
    status: ProductStatus;
    description: string;
    image: string;
    featured?: boolean;
    buyUrl?: string;
};

/* ─── Store-page-specific metadata (admin-editable) ──────── */
type InfoSection = {
    id: string;
    heading: string;
    body: string;
    open: boolean; // default expanded state
};

type StoreMeta = {
    productId: string;
    galleryImages: string[]; // base64 data URLs
    highlights: string[];    // bullet points shown in buy-box area
    badge: string;           // e.g. "Bestseller" or ""
    sections: InfoSection[];
};

/* ─── Constants ──────────────────────────────────────────── */
const LS_PRODUCTS = "myshortbiz.shop.products.v2";
const LS_CREATORS = "myshortbiz.shop.creators.v2";
const LS_STORE_META = "myshortbiz.store.meta.v1"; // new key

const CAT_BG: Record<ProductCategory, string> = {
    Digital: "#f3f0ff",
    Physical: "#e0f5ff",
    Service: "#ecfdf5",
};
const CAT_FG: Record<ProductCategory, string> = {
    Digital: "#7c3aed",
    Physical: "#0ea5e9",
    Service: "#059669",
};

function money(n: number) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}
function safeParse<T>(raw: string | null, fallback: T): T {
    try { return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
}
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

function defaultMeta(productId: string): StoreMeta {
    return {
        productId,
        galleryImages: [],
        highlights: ["Instant access after purchase", "Includes all future updates", "Secure checkout"],
        badge: "",
        sections: [
            { id: uid(), heading: "About this product", body: "Tell customers what makes this product special. Describe the value, use cases, and what's included.", open: true },
            { id: uid(), heading: "What's included", body: "List everything in the package:\n• Item one\n• Item two\n• Item three", open: true },
            { id: uid(), heading: "From the creator", body: "Share your story, process, or a personal message about why you made this.", open: false },
            { id: uid(), heading: "Frequently asked questions", body: "Q: Can I use this commercially?\nA: Yes, single-license commercial use is included.\n\nQ: Do you offer refunds?\nA: Reach out within 7 days if you're not satisfied.", open: false },
        ],
    };
}

/* ═══════════════════════════════════════════════════════════
   Component
═══════════════════════════════════════════════════════════ */
export default function Store() {
    const [searchParams] = useSearchParams();
    const handleParam = searchParams.get("handle");
    const productParam = searchParams.get("product");
    const adminParam = searchParams.get("admin") === "1";

    /* ── Read shared localStorage data ── */
    const allProducts = safeParse<Product[]>(localStorage.getItem(LS_PRODUCTS), []);
    const allCreators = safeParse<Creator[]>(localStorage.getItem(LS_CREATORS), []);

    const [toastMsg, setToastMsg] = useState<string | null>(null);

    /* ── Resolve current creator ── */
    const creator = useMemo(
        () => allCreators.find((c) => c.handle === handleParam) ?? null,
        [allCreators, handleParam]
    );

    /* ── Creator's active products ── */
    const products = useMemo(() => {
        if (!creator) return [];
        return allProducts
            .filter((p) => p.creatorId === creator.id && p.status === "active")
            .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }, [allProducts, creator]);

    const featured = useMemo(() => {
        if (productParam) {
            const linked = products.find((p) => p.id === productParam);
            if (linked) return linked;
        }
        return products.find((p) => p.featured) ?? products[0] ?? null;
    }, [products, productParam]);

    /* ── Buy URL ── */
    function openBuyUrl(product: Product) {
        if (product.buyUrl) {
            window.open(product.buyUrl, "_blank", "noopener,noreferrer");
        } else {
            setToastMsg("No purchase link set for this product yet.");
            setTimeout(() => setToastMsg(null), 2500);
        }
    }

    const rest = products.filter((p) => p.id !== featured?.id);

    /* ── Store meta (admin-editable per product) ── */
    const allMeta = safeParse<StoreMeta[]>(localStorage.getItem(LS_STORE_META), []);

    const [meta, setMeta] = useState<StoreMeta>(() => {
        if (!featured) return defaultMeta("");
        return allMeta.find((m) => m.productId === featured.id) ?? defaultMeta(featured.id);
    });

    function saveMeta(next: StoreMeta) {
        setMeta(next);
        const updated = allMeta.filter((m) => m.productId !== next.productId).concat(next);
        localStorage.setItem(LS_STORE_META, JSON.stringify(updated));
    }

    /* ── Admin panel state ── */
    const [adminOpen, setAdminOpen] = useState(adminParam);
    const [activeTab, setActiveTab] = useState<"gallery" | "highlights" | "sections">("gallery");
    const [newHighlight, setNewHighlight] = useState("");
    const [editSecIdx, setEditSecIdx] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    /* ── Gallery ── */
    const [galIdx, setGalIdx] = useState(0);

    function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? []);
        files.forEach((file) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const url = ev.target?.result as string;
                saveMeta({ ...meta, galleryImages: [...meta.galleryImages, url] });
            };
            reader.readAsDataURL(file);
        });
        e.target.value = "";
    }

    function removeImage(idx: number) {
        const next = meta.galleryImages.filter((_, i) => i !== idx);
        saveMeta({ ...meta, galleryImages: next });
        setGalIdx(Math.min(galIdx, next.length - 1));
    }

    /* ── Highlights ── */
    function addHighlight() {
        if (!newHighlight.trim()) return;
        saveMeta({ ...meta, highlights: [...meta.highlights, newHighlight.trim()] });
        setNewHighlight("");
    }
    function removeHighlight(idx: number) {
        saveMeta({ ...meta, highlights: meta.highlights.filter((_, i) => i !== idx) });
    }

    /* ── Sections ── */
    function updateSection(idx: number, patch: Partial<InfoSection>) {
        const next = meta.sections.map((s, i) => i === idx ? { ...s, ...patch } : s);
        saveMeta({ ...meta, sections: next });
    }
    function addSection() {
        saveMeta({ ...meta, sections: [...meta.sections, { id: uid(), heading: "New section", body: "", open: false }] });
    }
    function removeSection(idx: number) {
        saveMeta({ ...meta, sections: meta.sections.filter((_, i) => i !== idx) });
        if (editSecIdx === idx) setEditSecIdx(null);
    }
    function moveSection(idx: number, dir: -1 | 1) {
        const arr = [...meta.sections];
        const target = idx + dir;
        if (target < 0 || target >= arr.length) return;
        [arr[idx], arr[target]] = [arr[target], arr[idx]];
        saveMeta({ ...meta, sections: arr });
    }

    /* ── Accordion open state (public view) ── */
    const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
        Object.fromEntries(meta.sections.map((s) => [s.id, s.open]))
    );
    function toggleSection(id: string) {
        setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
    }

    /* ════════════════════════════════════════════════════════
       Render
    ════════════════════════════════════════════════════════ */
    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,700;1,9..144,400&family=DM+Sans:wght@400;500;600&display=swap');

        :root {
          --st-brand:     #7c3aed;
          --st-brand-dk:  #6d28d9;
          --st-light:     #f5f3ff;
          --st-border:    #e8e3f0;
          --st-text:      #1a1523;
          --st-muted:     #6b6580;
          --st-bg:        #fdfcff;
          --st-card:      #ffffff;
          --st-shadow:    0 2px 12px rgba(109,40,217,0.08), 0 1px 3px rgba(0,0,0,0.05);
          --st-shadow-lg: 0 16px 48px rgba(109,40,217,0.14), 0 4px 12px rgba(0,0,0,0.06);
          --st-font:      'DM Sans', sans-serif;
          --st-serif:     'Fraunces', Georgia, serif;
          --st-ease:      200ms cubic-bezier(0.4,0,0.2,1);
          --st-orange:    #ea580c;
          --st-orange-bg: #fff7ed;
        }

        .st { font-family:var(--st-font); color:var(--st-text); background:var(--st-bg); min-height:100vh; }
        .st *, .st *::before, .st *::after { box-sizing:border-box; }

        /* ── Topbar ── */
        .st-top { display:flex; align-items:center; justify-content:space-between; padding:14px 32px; border-bottom:1px solid var(--st-border); background:var(--st-card); position:sticky; top:0; z-index:50; }
        .st-top__back { display:flex; align-items:center; gap:6px; font-size:0.82rem; font-weight:600; color:var(--st-muted); text-decoration:none; transition:color var(--st-ease); }
        .st-top__back:hover { color:var(--st-brand); }
        .st-top__brand { font-family:var(--st-serif); font-size:1.05rem; font-weight:700; color:var(--st-text); letter-spacing:-0.02em; }
        .st-top__right { display:flex; align-items:center; gap:10px; }
        .st-top__cart { display:flex; align-items:center; gap:6px; padding:7px 14px; border-radius:20px; border:1.5px solid var(--st-border); background:transparent; font-family:var(--st-font); font-size:0.82rem; font-weight:600; color:var(--st-text); cursor:pointer; transition:all var(--st-ease); }
        .st-top__cart:hover { border-color:var(--st-brand); color:var(--st-brand); background:var(--st-light); }
        .st-cart-badge { background:var(--st-brand); color:#fff; font-size:0.62rem; font-weight:800; min-width:17px; height:17px; border-radius:9px; display:flex; align-items:center; justify-content:center; padding:0 4px; }
        .st-top__admin-btn { display:flex; align-items:center; gap:5px; padding:7px 13px; border-radius:20px; border:1.5px solid #e0d5f5; background:var(--st-light); font-family:var(--st-font); font-size:0.78rem; font-weight:700; color:var(--st-brand); cursor:pointer; transition:all var(--st-ease); }
        .st-top__admin-btn:hover { background:#ede9fe; }
        .st-top__admin-btn.active { background:var(--st-brand); color:#fff; border-color:var(--st-brand); }

        /* ── Toast ── */
        .st-toast { position:fixed; bottom:28px; left:50%; transform:translateX(-50%); background:var(--st-text); color:#fff; padding:11px 20px; border-radius:10px; font-size:0.82rem; font-weight:600; z-index:200; white-space:nowrap; animation:toastIn 0.2s ease; box-shadow:0 8px 24px rgba(0,0,0,0.2); }
        @keyframes toastIn { from{opacity:0;transform:translateX(-50%) translateY(8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }

        /* ══════════════ PRODUCT DETAIL LAYOUT ══════════════ */

        .st-pdp { max-width:1100px; margin:0 auto; padding:40px 24px 80px; }

        /* breadcrumb */
        .st-breadcrumb { display:flex; align-items:center; gap:6px; font-size:0.78rem; color:var(--st-muted); margin-bottom:28px; flex-wrap:wrap; }
        .st-breadcrumb a { color:var(--st-brand); text-decoration:none; font-weight:500; }
        .st-breadcrumb a:hover { text-decoration:underline; }
        .st-breadcrumb__sep { color:var(--st-border); }

        /* two-column layout */
        .st-pdp__cols { display:grid; grid-template-columns:1fr 380px; gap:48px; align-items:start; }
        @media (max-width:820px) { .st-pdp__cols { grid-template-columns:1fr; gap:32px; } }

        /* ── Gallery ── */
        .st-gallery { display:flex; flex-direction:column; gap:12px; }
        .st-gallery__main { width:100%; aspect-ratio:1/1; border-radius:16px; border:1px solid var(--st-border); overflow:hidden; display:flex; align-items:center; justify-content:center; background:var(--st-light); position:relative; }
        .st-gallery__main img { width:100%; height:100%; object-fit:cover; }
        .st-gallery__emoji { font-size:7rem; line-height:1; }
        .st-gallery__thumbs { display:flex; gap:8px; flex-wrap:wrap; }
        .st-gallery__thumb { width:64px; height:64px; border-radius:8px; border:2px solid var(--st-border); overflow:hidden; cursor:pointer; display:flex; align-items:center; justify-content:center; background:var(--st-light); transition:border-color var(--st-ease); flex-shrink:0; }
        .st-gallery__thumb.active { border-color:var(--st-brand); }
        .st-gallery__thumb img { width:100%; height:100%; object-fit:cover; }
        .st-gallery__thumb-emoji { font-size:1.6rem; }

        /* ── Buy Box ── */
        .st-buybox { background:var(--st-card); border:1px solid var(--st-border); border-radius:20px; padding:28px 26px 30px; box-shadow:var(--st-shadow); position:sticky; top:80px; }
        .st-buybox__badge { display:inline-flex; align-items:center; gap:5px; background:var(--st-orange-bg); color:var(--st-orange); font-size:0.72rem; font-weight:800; padding:4px 10px; border-radius:20px; margin-bottom:14px; text-transform:uppercase; letter-spacing:0.06em; }
        .st-buybox__name { font-family:var(--st-serif); font-size:1.6rem; font-weight:700; letter-spacing:-0.03em; line-height:1.2; }
        .st-buybox__cat { display:inline-flex; align-items:center; gap:5px; margin-top:10px; font-size:0.72rem; font-weight:700; padding:4px 10px; border-radius:20px; text-transform:uppercase; letter-spacing:0.06em; }
        .st-buybox__price-row { display:flex; align-items:baseline; gap:6px; margin-top:18px; }
        .st-buybox__price { font-family:var(--st-serif); font-size:2.4rem; font-weight:700; letter-spacing:-0.04em; color:var(--st-text); }
        .st-buybox__price-label { font-size:0.78rem; color:var(--st-muted); font-weight:500; }
        .st-buybox__div { height:1px; background:var(--st-border); margin:18px 0; }
        .st-buybox__highlights { list-style:none; padding:0; margin:0 0 18px 0; display:flex; flex-direction:column; gap:8px; }
        .st-buybox__highlights li { display:flex; align-items:flex-start; gap:8px; font-size:0.85rem; color:var(--st-text); line-height:1.4; }
        .st-buybox__highlights li::before { content:'✓'; color:#059669; font-weight:800; font-size:0.9rem; flex-shrink:0; margin-top:1px; }
        .st-buybox__desc { font-size:0.88rem; color:var(--st-muted); line-height:1.65; margin-bottom:20px; }
        .st-buy-main { width:100%; padding:14px; border-radius:12px; background:var(--st-brand); border:none; color:#fff; font-family:var(--st-font); font-size:1rem; font-weight:700; cursor:pointer; transition:all var(--st-ease); letter-spacing:0.01em; margin-bottom:10px; }
        .st-buy-main:hover { background:var(--st-brand-dk); box-shadow:0 6px 20px rgba(124,58,237,0.35); transform:translateY(-1px); }
        .st-buy-main:active { transform:translateY(0); }
        .st-buy-secondary { width:100%; padding:12px; border-radius:12px; background:transparent; border:1.5px solid var(--st-border); color:var(--st-text); font-family:var(--st-font); font-size:0.9rem; font-weight:600; cursor:pointer; transition:all var(--st-ease); }
        .st-buy-secondary:hover { border-color:var(--st-brand); color:var(--st-brand); background:var(--st-light); }
        .st-buybox__creator { display:flex; align-items:center; gap:10px; margin-top:18px; padding-top:18px; border-top:1px solid var(--st-border); font-size:0.82rem; color:var(--st-muted); }
        .st-buybox__av { width:32px; height:32px; border-radius:50%; background:var(--st-light); display:flex; align-items:center; justify-content:center; font-size:1rem; flex-shrink:0; }

        /* ── Info sections (accordion) ── */
        .st-sections { margin-top:48px; }
        .st-section { border-top:1px solid var(--st-border); }
        .st-section:last-child { border-bottom:1px solid var(--st-border); }
        .st-section__hd { width:100%; background:none; border:none; display:flex; align-items:center; justify-content:space-between; padding:18px 0; cursor:pointer; font-family:var(--st-font); font-size:1rem; font-weight:700; color:var(--st-text); text-align:left; transition:color var(--st-ease); }
        .st-section__hd:hover { color:var(--st-brand); }
        .st-section__chevron { font-size:0.8rem; transition:transform 200ms ease; color:var(--st-muted); flex-shrink:0; }
        .st-section__chevron.open { transform:rotate(180deg); }
        .st-section__body { font-size:0.9rem; color:var(--st-muted); line-height:1.8; padding:0 0 22px 0; white-space:pre-wrap; max-width:680px; animation:secIn 180ms ease both; }
        @keyframes secIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }

        /* ── Also available ── */
        .st-also { max-width:1100px; margin:60px auto 0; padding:0 24px 80px; }
        .st-also__title { font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.12em; color:var(--st-muted); margin-bottom:20px; display:flex; align-items:center; gap:8px; }
        .st-also__title::after { content:''; flex:1; height:1px; background:var(--st-border); }
        .st-also__grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:14px; }
        .st-mini { background:var(--st-card); border:1px solid var(--st-border); border-radius:14px; overflow:hidden; transition:all var(--st-ease); cursor:pointer; box-shadow:var(--st-shadow); }
        .st-mini:hover { box-shadow:var(--st-shadow-lg); transform:translateY(-3px); border-color:#d8b4fe; }
        .st-mini__img { height:90px; display:flex; align-items:center; justify-content:center; font-size:2.2rem; }
        .st-mini__body { padding:12px 14px 14px; }
        .st-mini__name { font-size:0.9rem; font-weight:700; line-height:1.3; letter-spacing:-0.01em; }
        .st-mini__price { font-size:0.82rem; font-weight:700; color:var(--st-brand); margin-top:6px; }
        .st-mini__btn { display:block; width:100%; margin-top:10px; padding:8px; border-radius:8px; border:1.5px solid var(--st-border); background:transparent; font-family:var(--st-font); font-size:0.8rem; font-weight:600; color:var(--st-text); cursor:pointer; transition:all var(--st-ease); }
        .st-mini__btn:hover { border-color:var(--st-brand); color:var(--st-brand); background:var(--st-light); }

        /* ── Empty / not found ── */
        .st-empty { text-align:center; padding:100px 24px; color:var(--st-muted); }
        .st-empty__icon { font-size:3rem; margin-bottom:14px; }
        .st-empty__title { font-family:var(--st-serif); font-size:1.4rem; color:var(--st-text); font-weight:700; margin-bottom:8px; }

        /* ══════════════ CREATOR DIRECTORY ══════════════ */
        .st-dir { max-width:680px; margin:0 auto; padding:48px 24px 60px; }
        .st-dir__title { font-family:var(--st-serif); font-size:2rem; font-weight:700; letter-spacing:-0.03em; }
        .st-dir__sub { color:var(--st-muted); font-size:0.9rem; margin-top:6px; line-height:1.65; }
        .st-dir__list { display:grid; gap:14px; margin-top:32px; }
        .st-dir__card { background:var(--st-card); border:1px solid var(--st-border); border-radius:16px; padding:20px 22px; display:flex; align-items:center; gap:16px; text-decoration:none; color:inherit; transition:all var(--st-ease); box-shadow:var(--st-shadow); }
        .st-dir__card:hover { box-shadow:var(--st-shadow-lg); transform:translateY(-2px); border-color:#d8b4fe; }
        .st-dir__av { width:52px; height:52px; border-radius:50%; background:var(--st-light); display:flex; align-items:center; justify-content:center; font-size:1.6rem; flex-shrink:0; }
        .st-dir__info { flex:1; min-width:0; }
        .st-dir__name { font-weight:700; font-size:1rem; display:flex; align-items:center; gap:8px; }
        .st-dir__vtag { font-size:0.65rem; font-weight:700; background:var(--st-light); color:var(--st-brand); padding:2px 7px; border-radius:10px; }
        .st-dir__handle { font-size:0.78rem; color:var(--st-muted); margin-top:2px; }
        .st-dir__bio { font-size:0.82rem; color:var(--st-muted); margin-top:6px; line-height:1.5; }
        .st-dir__count { font-size:0.78rem; font-weight:700; color:var(--st-brand); flex-shrink:0; }
        .st-dir__arrow { color:var(--st-muted); flex-shrink:0; font-size:1.1rem; transition:transform var(--st-ease); }
        .st-dir__card:hover .st-dir__arrow { transform:translateX(4px); color:var(--st-brand); }

        /* ══════════════ ADMIN PANEL ══════════════ */
        .st-admin { background:#faf9ff; border-top:2px solid var(--st-brand); padding:36px 24px 52px; margin-top:40px; }
        .st-admin__inner { max-width:860px; margin:0 auto; }
        .st-admin__title { font-family:var(--st-serif); font-size:1.4rem; font-weight:700; letter-spacing:-0.02em; margin-bottom:6px; display:flex; align-items:center; gap:10px; }
        .st-admin__title span { font-size:0.72rem; background:var(--st-brand); color:#fff; padding:3px 9px; border-radius:10px; font-family:var(--st-font); font-weight:700; letter-spacing:0.06em; text-transform:uppercase; }
        .st-admin__sub { font-size:0.85rem; color:var(--st-muted); margin-bottom:24px; }
        .st-admin__tabs { display:flex; gap:6px; border-bottom:1px solid var(--st-border); margin-bottom:28px; }
        .st-admin__tab { padding:9px 16px; font-size:0.83rem; font-weight:700; color:var(--st-muted); background:none; border:none; border-bottom:2.5px solid transparent; cursor:pointer; font-family:var(--st-font); transition:all var(--st-ease); margin-bottom:-1px; }
        .st-admin__tab.active { color:var(--st-brand); border-bottom-color:var(--st-brand); }
        .st-admin__tab:hover { color:var(--st-text); }

        /* gallery admin */
        .st-adm-gallery { display:flex; flex-wrap:wrap; gap:12px; margin-bottom:16px; }
        .st-adm-img { width:88px; height:88px; border-radius:10px; border:1px solid var(--st-border); overflow:hidden; position:relative; flex-shrink:0; }
        .st-adm-img img { width:100%; height:100%; object-fit:cover; }
        .st-adm-img__del { position:absolute; top:4px; right:4px; background:rgba(0,0,0,0.55); color:#fff; border:none; border-radius:50%; width:20px; height:20px; font-size:0.65rem; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background var(--st-ease); }
        .st-adm-img__del:hover { background:rgba(200,0,0,0.8); }
        .st-adm-upload { display:flex; align-items:center; justify-content:center; flex-direction:column; gap:6px; width:88px; height:88px; border-radius:10px; border:2px dashed var(--st-border); cursor:pointer; font-size:0.75rem; color:var(--st-muted); font-weight:600; transition:all var(--st-ease); background:transparent; font-family:var(--st-font); }
        .st-adm-upload:hover { border-color:var(--st-brand); color:var(--st-brand); background:var(--st-light); }
        .st-adm-note { font-size:0.78rem; color:var(--st-muted); }

        /* badge */
        .st-adm-badge-row { display:flex; align-items:center; gap:10px; margin-top:20px; }
        .st-adm-badge-row label { font-size:0.82rem; font-weight:700; color:var(--st-text); }
        .st-adm-inp { border:1.5px solid var(--st-border); border-radius:8px; padding:7px 11px; font-size:0.85rem; font-family:var(--st-font); color:var(--st-text); outline:none; transition:border-color var(--st-ease); background:#fff; }
        .st-adm-inp:focus { border-color:var(--st-brand); }
        .st-adm-inp.wide { flex:1; }

        /* highlights */
        .st-adm-hlist { display:flex; flex-direction:column; gap:8px; margin-bottom:14px; }
        .st-adm-hitem { display:flex; align-items:center; gap:8px; font-size:0.85rem; background:#fff; border:1px solid var(--st-border); border-radius:8px; padding:8px 12px; }
        .st-adm-hitem span { flex:1; }
        .st-adm-hitem button { background:none; border:none; cursor:pointer; font-size:0.8rem; color:var(--st-muted); transition:color var(--st-ease); }
        .st-adm-hitem button:hover { color:#dc2626; }
        .st-adm-addrow { display:flex; gap:8px; }
        .st-adm-addbtn { padding:8px 16px; border-radius:8px; background:var(--st-brand); color:#fff; border:none; font-family:var(--st-font); font-size:0.82rem; font-weight:700; cursor:pointer; transition:background var(--st-ease); flex-shrink:0; }
        .st-adm-addbtn:hover { background:var(--st-brand-dk); }

        /* sections */
        .st-adm-seclist { display:flex; flex-direction:column; gap:10px; }
        .st-adm-sec { background:#fff; border:1px solid var(--st-border); border-radius:12px; overflow:hidden; }
        .st-adm-sec__hd { display:flex; align-items:center; gap:8px; padding:12px 14px; cursor:pointer; }
        .st-adm-sec__hd button { background:none; border:none; cursor:pointer; font-size:0.78rem; color:var(--st-muted); padding:3px 7px; border-radius:6px; transition:all var(--st-ease); font-family:var(--st-font); }
        .st-adm-sec__hd button:hover { background:var(--st-light); color:var(--st-brand); }
        .st-adm-sec__hd button.danger:hover { background:#fef2f2; color:#dc2626; }
        .st-adm-sec__title { flex:1; font-size:0.88rem; font-weight:700; color:var(--st-text); }
        .st-adm-sec__body { padding:0 14px 14px; display:flex; flex-direction:column; gap:8px; }
        .st-adm-ta { border:1.5px solid var(--st-border); border-radius:8px; padding:9px 11px; font-size:0.83rem; font-family:var(--st-font); color:var(--st-text); outline:none; transition:border-color var(--st-ease); resize:vertical; background:#fff; }
        .st-adm-ta:focus { border-color:var(--st-brand); }
        .st-adm-addsec { margin-top:14px; display:flex; justify-content:flex-start; }
        .st-adm-addsec button { padding:9px 18px; border-radius:10px; border:1.5px dashed var(--st-border); background:transparent; font-family:var(--st-font); font-size:0.82rem; font-weight:700; color:var(--st-muted); cursor:pointer; transition:all var(--st-ease); }
        .st-adm-addsec button:hover { border-color:var(--st-brand); color:var(--st-brand); background:var(--st-light); }
      `}</style>

            <div className="st">

                {/* ── Topbar ── */}
                <div className="st-top">
                    <Link to="/shop" className="st-top__back">
                        &#8592; Back to marketplace
                    </Link>
                    <div className="st-top__brand">MyShort.Biz</div>
                    <div className="st-top__right">
                        {creator && featured && (
                            <button
                                className={`st-top__admin-btn${adminOpen ? " active" : ""}`}
                                onClick={() => setAdminOpen((v) => !v)}
                            >
                                &#9881; {adminOpen ? "Close admin" : "Edit page"}
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Toast ── */}
                {toastMsg && <div className="st-toast">{toastMsg}</div>}

                {/* ════════ DIRECTORY ════════ */}
                {!handleParam && (
                    <div className="st-dir">
                        <div className="st-dir__title">Creator Directory</div>
                        <div className="st-dir__sub">Browse all creators on MyShort.Biz and visit their storefronts.</div>
                        <div className="st-dir__list">
                            {allCreators.map((c, i) => {
                                const n = allProducts.filter((p) => p.creatorId === c.id && p.status === "active").length;
                                return (
                                    <Link key={c.id} to={`/store?handle=${encodeURIComponent(c.handle)}`} className="st-dir__card" style={{ animationDelay: `${i * 60}ms` }}>
                                        <div className="st-dir__av">{c.avatar}</div>
                                        <div className="st-dir__info">
                                            <div className="st-dir__name">
                                                {c.displayName}
                                                {c.verified && <span className="st-dir__vtag">&#10003; Verified</span>}
                                            </div>
                                            <div className="st-dir__handle">{c.handle}</div>
                                            <div className="st-dir__bio">{c.bio}</div>
                                        </div>
                                        <div className="st-dir__count">{n} product{n !== 1 ? "s" : ""}</div>
                                        <div className="st-dir__arrow">&#8594;</div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ════════ CREATOR NOT FOUND ════════ */}
                {handleParam && !creator && (
                    <div className="st-empty">
                        <div className="st-empty__icon">&#128533;</div>
                        <div className="st-empty__title">Creator not found</div>
                        <p>No creator with the handle <strong>{handleParam}</strong> exists yet.</p>
                        <Link to="/store" style={{ color: "var(--st-brand)", fontWeight: 600, fontSize: "0.9rem" }}>
                            &#8592; View all creators
                        </Link>
                    </div>
                )}

                {/* ════════ STOREFRONT ════════ */}
                {creator && (
                    <>
                        {/* No products */}
                        {products.length === 0 && (
                            <div className="st-empty">
                                <div className="st-empty__icon">&#128736;</div>
                                <div className="st-empty__title">Nothing listed yet</div>
                                <p>{creator.displayName} hasn't published any products yet.</p>
                            </div>
                        )}

                        {/* ── Product detail page ── */}
                        {featured && (
                            <div className="st-pdp">

                                {/* breadcrumb */}
                                <div className="st-breadcrumb">
                                    <Link to="/store">All creators</Link>
                                    <span className="st-breadcrumb__sep">›</span>
                                    <Link to={`/store?handle=${encodeURIComponent(creator.handle)}`}>{creator.displayName}</Link>
                                    <span className="st-breadcrumb__sep">›</span>
                                    <span>{featured.name}</span>
                                </div>

                                <div className="st-pdp__cols">

                                    {/* LEFT — Gallery */}
                                    <div className="st-gallery">
                                        {/* Main image */}
                                        <div className="st-gallery__main" style={{ background: CAT_BG[featured.category] }}>
                                            {meta.galleryImages.length > 0
                                                ? <img src={meta.galleryImages[galIdx]} alt={featured.name} />
                                                : <span className="st-gallery__emoji">{featured.image}</span>
                                            }
                                        </div>

                                        {/* Thumbnails */}
                                        {(meta.galleryImages.length > 1) && (
                                            <div className="st-gallery__thumbs">
                                                {meta.galleryImages.map((src, i) => (
                                                    <div
                                                        key={i}
                                                        className={`st-gallery__thumb${galIdx === i ? " active" : ""}`}
                                                        onClick={() => setGalIdx(i)}
                                                    >
                                                        <img src={src} alt="" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Info sections accordion */}
                                        <div className="st-sections">
                                            {meta.sections.map((sec) => (
                                                <div key={sec.id} className="st-section">
                                                    <button
                                                        className="st-section__hd"
                                                        onClick={() => toggleSection(sec.id)}
                                                    >
                                                        {sec.heading}
                                                        <span className={`st-section__chevron${openSections[sec.id] ? " open" : ""}`}>▼</span>
                                                    </button>
                                                    {openSections[sec.id] && (
                                                        <div className="st-section__body">{sec.body}</div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* RIGHT — Buy box */}
                                    <div className="st-buybox">
                                        {meta.badge && (
                                            <div className="st-buybox__badge">&#11088; {meta.badge}</div>
                                        )}

                                        <div className="st-buybox__name">{featured.name}</div>

                                        <div
                                            className="st-buybox__cat"
                                            style={{ background: CAT_BG[featured.category], color: CAT_FG[featured.category] }}
                                        >
                                            {featured.category}
                                        </div>

                                        <div className="st-buybox__price-row">
                                            <div className="st-buybox__price">{money(featured.price)}</div>
                                        </div>

                                        <div className="st-buybox__div" />

                                        {/* Highlights */}
                                        {meta.highlights.length > 0 && (
                                            <ul className="st-buybox__highlights">
                                                {meta.highlights.map((h, i) => (
                                                    <li key={i}>{h}</li>
                                                ))}
                                            </ul>
                                        )}

                                        <button
                                            className="st-buy-main"
                                            onClick={() => openBuyUrl(featured)}
                                        >
                                            Buy now →
                                        </button>

                                        {/* Creator */}
                                        <div className="st-buybox__creator">
                                            <div className="st-buybox__av">{creator.avatar}</div>
                                            <span>
                                                Sold by <strong>{creator.displayName}</strong>
                                                {creator.verified && <> &#10003;</>}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Also available ── */}
                        {rest.length > 0 && (
                            <div className="st-also">
                                <div className="st-also__title">More from {creator.displayName}</div>
                                <div className="st-also__grid">
                                    {rest.map((p) => (
                                        <Link
                                            key={p.id}
                                            to={`/store?handle=${encodeURIComponent(creator.handle)}&product=${p.id}`}
                                            style={{ textDecoration: "none", color: "inherit" }}
                                        >
                                            <div className="st-mini">
                                                <div className="st-mini__img" style={{ background: CAT_BG[p.category] }}>{p.image}</div>
                                                <div className="st-mini__body">
                                                    <div className="st-mini__name">{p.name}</div>
                                                    <div className="st-mini__price">{money(p.price)}</div>
                                                    <button
                                                        className="st-mini__btn"
                                                        onClick={(e) => { e.preventDefault(); openBuyUrl(p); }}
                                                    >
                                                        Buy now →
                                                    </button>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ════════ ADMIN PANEL ════════ */}
                        {adminOpen && featured && (
                            <div className="st-admin">
                                <div className="st-admin__inner">
                                    <div className="st-admin__title">
                                        Store Page Editor <span>Admin</span>
                                    </div>
                                    <div className="st-admin__sub">
                                        Editing: <strong>{featured.name}</strong> — changes save automatically to localStorage.
                                    </div>

                                    {/* Buy URL */}
                                    <div style={{ marginBottom: 24 }}>
                                        <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--st-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                            🔗 Buy Link
                                        </div>
                                        <input
                                            className="st-adm-inp wide"
                                            value={featured.buyUrl ?? ""}
                                            placeholder="https://amazon.com/your-product or https://etsy.com/listing/..."
                                            onChange={(e) => {
                                                const updated = allProducts.map((p) =>
                                                    p.id === featured.id ? { ...p, buyUrl: e.target.value } : p
                                                );
                                                localStorage.setItem(LS_PRODUCTS, JSON.stringify(updated));
                                            }}
                                        />
                                        <div className="st-adm-note" style={{ marginTop: 6 }}>
                                            Where visitors go when they click "Buy now". Paste any storefront URL (Amazon, Etsy, Gumroad, Shopify, etc.).
                                        </div>
                                    </div>

                                    <div className="st-admin__tabs">
                                        {(["gallery", "highlights", "sections"] as const).map((t) => (
                                            <button
                                                key={t}
                                                className={`st-admin__tab${activeTab === t ? " active" : ""}`}
                                                onClick={() => setActiveTab(t)}
                                            >
                                                {t === "gallery" && "📷 Gallery & Badge"}
                                                {t === "highlights" && "✅ Highlights"}
                                                {t === "sections" && "📝 Info Sections"}
                                            </button>
                                        ))}
                                    </div>

                                    {/* TAB: Gallery */}
                                    {activeTab === "gallery" && (
                                        <>
                                            <div className="st-adm-gallery">
                                                {meta.galleryImages.map((src, i) => (
                                                    <div key={i} className="st-adm-img">
                                                        <img src={src} alt="" />
                                                        <button className="st-adm-img__del" onClick={() => removeImage(i)}>✕</button>
                                                    </div>
                                                ))}
                                                <button className="st-adm-upload" onClick={() => fileInputRef.current?.click()}>
                                                    <span style={{ fontSize: "1.4rem" }}>+</span>
                                                    Upload
                                                </button>
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    style={{ display: "none" }}
                                                    onChange={handleImageUpload}
                                                />
                                            </div>
                                            <div className="st-adm-note">
                                                Upload photos for this product. If none are uploaded, the product emoji is shown. Click a thumbnail on the store page to switch images.
                                            </div>

                                            <div className="st-adm-badge-row" style={{ marginTop: 24 }}>
                                                <label>Badge label</label>
                                                <input
                                                    className="st-adm-inp wide"
                                                    value={meta.badge}
                                                    placeholder='e.g. Bestseller, New, Limited'
                                                    onChange={(e) => saveMeta({ ...meta, badge: e.target.value })}
                                                />
                                            </div>
                                            <div className="st-adm-note" style={{ marginTop: 6 }}>
                                                Shows an orange badge in the buy box. Leave blank to hide.
                                            </div>
                                        </>
                                    )}

                                    {/* TAB: Highlights */}
                                    {activeTab === "highlights" && (
                                        <>
                                            <div className="st-adm-hlist">
                                                {meta.highlights.map((h, i) => (
                                                    <div key={i} className="st-adm-hitem">
                                                        <span>✓ {h}</span>
                                                        <button onClick={() => removeHighlight(i)}>✕</button>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="st-adm-addrow">
                                                <input
                                                    className="st-adm-inp wide"
                                                    placeholder="Add a highlight (e.g. Lifetime updates included)"
                                                    value={newHighlight}
                                                    onChange={(e) => setNewHighlight(e.target.value)}
                                                    onKeyDown={(e) => e.key === "Enter" && addHighlight()}
                                                />
                                                <button className="st-adm-addbtn" onClick={addHighlight}>Add</button>
                                            </div>
                                        </>
                                    )}

                                    {/* TAB: Sections */}
                                    {activeTab === "sections" && (
                                        <>
                                            <div className="st-adm-seclist">
                                                {meta.sections.map((sec, i) => (
                                                    <div key={sec.id} className="st-adm-sec">
                                                        <div className="st-adm-sec__hd">
                                                            <div className="st-adm-sec__title">{sec.heading || <em style={{ color: "var(--st-muted)" }}>Untitled section</em>}</div>
                                                            <button onClick={() => moveSection(i, -1)} title="Move up" disabled={i === 0}>↑</button>
                                                            <button onClick={() => moveSection(i, 1)} title="Move down" disabled={i === meta.sections.length - 1}>↓</button>
                                                            <button
                                                                onClick={() => setEditSecIdx(editSecIdx === i ? null : i)}
                                                            >
                                                                {editSecIdx === i ? "Done" : "Edit"}
                                                            </button>
                                                            <button className="danger" onClick={() => removeSection(i)}>Delete</button>
                                                        </div>
                                                        {editSecIdx === i && (
                                                            <div className="st-adm-sec__body">
                                                                <input
                                                                    className="st-adm-inp wide"
                                                                    placeholder="Section heading"
                                                                    value={sec.heading}
                                                                    onChange={(e) => updateSection(i, { heading: e.target.value })}
                                                                />
                                                                <textarea
                                                                    className="st-adm-ta wide"
                                                                    rows={6}
                                                                    placeholder="Section body — plain text, line breaks supported"
                                                                    value={sec.body}
                                                                    onChange={(e) => updateSection(i, { body: e.target.value })}
                                                                    style={{ width: "100%" }}
                                                                />
                                                                <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "0.8rem", fontWeight: 600, color: "var(--st-muted)", cursor: "pointer" }}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={sec.open}
                                                                        onChange={(e) => updateSection(i, { open: e.target.checked })}
                                                                        style={{ accentColor: "var(--st-brand)" }}
                                                                    />
                                                                    Expanded by default
                                                                </label>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="st-adm-addsec">
                                                <button onClick={addSection}>+ Add section</button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
}