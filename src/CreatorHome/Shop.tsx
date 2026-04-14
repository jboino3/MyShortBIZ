import { useMemo, useState } from "react";

/* ─── Types ──────────────────────────────────────────────── */
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

type CartItem = { productId: string; qty: number };

/* ─── Constants ──────────────────────────────────────────── */
const LS_PRODUCTS = "myshortbiz.shop.products.v2";
const LS_CART = "myshortbiz.shop.cart.v2";
const LS_CREATORS = "myshortbiz.shop.creators.v2";

const CAT_COLOR: Record<ProductCategory, string> = {
    Digital: "#7c3aed",
    Physical: "#0ea5e9",
    Service: "#059669",
};
const CAT_BG: Record<ProductCategory, string> = {
    Digital: "#f3f0ff",
    Physical: "#e0f5ff",
    Service: "#ecfdf5",
};
const CAT_EMOJI: Record<ProductCategory, string> = {
    Digital: "💾", Physical: "📦", Service: "🤝",
};

/* ─── Helpers ────────────────────────────────────────────── */
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function money(n: number) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}
function safeParse<T>(raw: string | null, fallback: T): T {
    try { return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
}

/* ─── Seed data ──────────────────────────────────────────── */
const SEED_CREATORS: Creator[] = [
    { id: "c1", handle: "@alexdesigns", displayName: "Alex Chen", avatar: "🤡", bio: "UI/UX designer & template creator", verified: true },
    { id: "c2", handle: "@coachmark", displayName: "Mark Rivera", avatar: "🏋️", bio: "Certified coach & course creator", verified: true },
    { id: "c3", handle: "@zoemaker", displayName: "Zoe Park", avatar: "✨", bio: "Merch designer & brand builder", verified: false },
    { id: "you", handle: "@you", displayName: "You", avatar: "😎", bio: "Your creator profile", verified: false },
];

function makeSeed(): Product[] {
    return [
        { id: uid(), creatorId: "c1", name: "Premium UI Kit", price: 29.99, category: "Digital", status: "active", description: "150+ Figma components for modern web apps. Dark & light variants included.", image: "🎨", featured: true },
        { id: uid(), creatorId: "c1", name: "Icon Pack Vol.2", price: 14.99, category: "Digital", status: "active", description: "600 hand-crafted SVG icons in 3 styles. Free updates forever.", image: "*", featured: false },
        { id: uid(), creatorId: "c2", name: "1:1 Coaching Call", price: 49.00, category: "Service", status: "active", description: "30 minutes of focused coaching. Walk away with a clear action plan.", image: "🎯", featured: false },
        { id: uid(), creatorId: "c2", name: "Notion Life OS", price: 19.99, category: "Digital", status: "active", description: "All-in-one productivity system. Templates for goals, habits, projects.", image: "🗂️", featured: true },
        { id: uid(), creatorId: "c3", name: "Merch Hoodie", price: 39.99, category: "Physical", status: "active", description: "Heavyweight 400gsm hoodie. Embroidered logo. Ships in 5–7 days.", image: "👕", featured: false },
        { id: uid(), creatorId: "c3", name: "Enamel Pin Set", price: 12.99, category: "Physical", status: "active", description: "Set of 4 collector pins. Hard enamel, gold plating.", image: "📌", featured: false },
        { id: uid(), creatorId: "you", name: "Starter Template Pack", price: 9.99, category: "Digital", status: "active", description: "A curated set of templates you can build on. Perfect for launching fast.", image: "🍾", featured: false },
        { id: uid(), creatorId: "you", name: "My Draft Product", price: 0, category: "Service", status: "draft", description: "Work in progress — publish when ready.", image: "🚧", featured: false },
    ];
}

/* ════════════════════════════════════════════════════════════
   Component
════════════════════════════════════════════════════════════ */
export default function Shop() {
    /* ── State ── */
    const [products, setProducts] = useState<Product[]>(() => {
        const s = safeParse<Product[]>(localStorage.getItem(LS_PRODUCTS), []);
        if (s.length) return s;
        const seed = makeSeed();
        localStorage.setItem(LS_PRODUCTS, JSON.stringify(seed));
        return seed;
    });

    const [creators] = useState<Creator[]>(() => {
        const s = safeParse<Creator[]>(localStorage.getItem(LS_CREATORS), []);
        if (s.length) return s;
        localStorage.setItem(LS_CREATORS, JSON.stringify(SEED_CREATORS));
        return SEED_CREATORS;
    });

    const [cart, setCart] = useState<CartItem[]>(() =>
        safeParse<CartItem[]>(localStorage.getItem(LS_CART), [])
    );

    const [query, setQuery] = useState("");
    const [catFilter, setCatFilter] = useState<"all" | ProductCategory>("all");
    const [creatorFilter, setCreatorFilter] = useState<string>("all");
    const [activeTab, setActiveTab] = useState<"browse" | "cart" | "admin">("browse");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const emptyDraft = (): Omit<Product, "id"> => ({
        creatorId: "you", name: "", price: 0, category: "Digital",
        status: "draft", description: "", image: "🛍️", featured: false,
    });
    const [draft, setDraft] = useState<Omit<Product, "id">>(emptyDraft());

    /* ── Derived ── */
    const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
    const creatorMap = useMemo(() => new Map(creators.map((c) => [c.id, c])), [creators]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return products
            .filter((p) => catFilter === "all" || p.category === catFilter)
            .filter((p) => creatorFilter === "all" || p.creatorId === creatorFilter)
            .filter((p) => p.status === "active")
            .filter((p) => !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
            .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || a.name.localeCompare(b.name));
    }, [products, query, catFilter, creatorFilter]);

    const featured = useMemo(() => products.filter((p) => p.featured && p.status === "active"), [products]);
    const myProducts = useMemo(() => products.filter((p) => p.creatorId === "you"), [products]);
    const cartCount = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart]);
    const cartTotal = useMemo(() =>
        cart.reduce((s, i) => s + (byId.get(i.productId)?.price ?? 0) * i.qty, 0),
        [cart, byId]
    );

    /* ── Helpers ── */
    function persist(p: Product[], c: CartItem[]) {
        localStorage.setItem(LS_PRODUCTS, JSON.stringify(p));
        localStorage.setItem(LS_CART, JSON.stringify(c));
    }
    function addToCart(productId: string) {
        const e = cart.find((c) => c.productId === productId);
        const next = e
            ? cart.map((c) => (c.productId === productId ? { ...c, qty: c.qty + 1 } : c))
            : [...cart, { productId, qty: 1 }];
        setCart(next); persist(products, next);
    }
    function setQty(productId: string, qty: number) {
        const next = cart.map((c) => (c.productId === productId ? { ...c, qty } : c)).filter((c) => c.qty > 0);
        setCart(next); persist(products, next);
    }
    function createProduct() {
        if (!draft.name.trim()) return;
        const next = [{ id: uid(), ...draft, name: draft.name.trim() }, ...products];
        setProducts(next); setDraft(emptyDraft()); persist(next, cart);
    }
    function saveEdit(id: string) {
        const next = products.map((p) => (p.id === id ? { ...p, ...draft } : p));
        setProducts(next); setEditingId(null); setDraft(emptyDraft()); persist(next, cart);
    }
    function startEdit(p: Product) {
        setDraft({
            creatorId: p.creatorId, name: p.name, price: p.price, category: p.category,
            status: p.status, description: p.description, image: p.image, featured: p.featured
        });
        setEditingId(p.id); setActiveTab("admin");
    }
    function togglePublish(id: string) {
        const next = products.map((p) =>
            p.id === id ? { ...p, status: (p.status === "active" ? "draft" : "active") as ProductStatus } : p
        );
        setProducts(next); persist(next, cart);
    }
    function deleteProduct(id: string) {
        const np = products.filter((p) => p.id !== id);
        const nc = cart.filter((c) => c.productId !== id);
        setProducts(np); setCart(nc); persist(np, nc);
        if (editingId === id) { setEditingId(null); setDraft(emptyDraft()); }
    }

    /* ── Shareable link helpers ── */
    function makeLink(p: Product): string {
        const cr = creatorMap.get(p.creatorId);
        const handle = cr ? encodeURIComponent(cr.handle) : "you";
        const base = window.location.origin;
        // HashRouter URLs use /#/path?params format
        return `${base}/#/store?handle=${handle}&product=${p.id}`;
    }

    function copyLink(p: Product) {
        navigator.clipboard.writeText(makeLink(p)).then(() => {
            setCopiedId(p.id);
            setTimeout(() => setCopiedId(null), 2000);
        });
    }

    /* ════════════════════════════════════════════════════════
       JSX
    ════════════════════════════════════════════════════════ */
    return (
        <>
            {/* ───────────── Styles ───────────── */}
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Lora:ital,wght@0,600;1,500&display=swap');

        :root {
          /* inherit global tokens from style.scss */
          --brand:        var(--shop-brand-dark, #6d28d9);
          --brand-mid:    var(--shop-brand, #7c3aed);
          --brand-light:  var(--shop-brand-light, #ede9fe);
          --brand-xl:     var(--shop-brand-xl, #f5f3ff);
          /* local palette — uses SCSS globals where possible */
          --text:         var(--text, #18181b);
          --text-2:       #52525b;
          --text-3:       #a1a1aa;
          --border:       var(--border, #e4e4e7);
          --border-2:     #d1d5db;
          --bg:           var(--bg, #ffffff);
          --bg-2:         #fafafa;
          --bg-3:         #f4f4f5;
          --green:        #059669;  --green-bg: #ecfdf5;
          --amber:        #d97706;  --amber-bg: #fffbeb;
          --red:          #dc2626;  --red-bg:   #fef2f2;
          --shadow-sm:    var(--shop-shadow-sm, 0 1px 3px rgba(0,0,0,0.07));
          --shadow:       var(--shop-shadow, 0 4px 16px rgba(0,0,0,0.08));
          --shadow-brand: var(--shop-shadow-brand, 0 8px 28px rgba(109,40,217,0.18));
          --radius:       10px;
          --radius-lg:    14px;
          --font:         'Plus Jakarta Sans', sans-serif;
          --font-serif:   'Lora', Georgia, serif;
          --ease:         180ms cubic-bezier(0.4,0,0.2,1);
        }

        /* reset */
        .ms *, .ms *::before, .ms *::after { box-sizing: border-box; }
        .ms { font-family: var(--font); color: var(--text); background: var(--bg); }

        /* layout */
        .ms-wrap { display: grid; grid-template-columns: 1fr 340px; min-height: 100vh; }
        @media(max-width:860px){ .ms-wrap { grid-template-columns:1fr; } }
        .ms-left  { overflow-y: auto; }

        /* hero */
        .ms-hero { padding: 36px 32px 32px; }
        .ms-hero__eyebrow { display:inline-flex; align-items:center; gap:5px; background:var(--brand-light); color:var(--brand); font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; padding:3px 10px; border-radius:20px; margin-bottom:12px; }
        .ms-hero__h { font-size:2.1rem; font-weight:800; letter-spacing:-0.04em; line-height:1.1; }
        .ms-hero__h em { font-family:var(--font-serif); font-style:italic; color:var(--brand-mid); font-weight:500; }
        .ms-hero__sub { color:var(--text-2); font-size:0.9rem; margin-top:8px; line-height:1.65; max-width:440px; }
        .ms-stats { display:flex; gap:28px; margin-top:22px; flex-wrap:wrap; }
        .ms-stat__v { font-size:1.45rem; font-weight:800; color:var(--brand-mid); letter-spacing:-0.03em; }
        .ms-stat__l { font-size:0.73rem; color:var(--text-3); margin-top:1px; font-weight:500; }

        /* featured */
        .ms-feat { padding:24px 32px 0; }
        .ms-feat__lbl { font-size:0.69rem; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:var(--text-3); margin-bottom:12px; }
        .ms-feat-row { display:flex; gap:12px; overflow-x:auto; padding-bottom:2px; scrollbar-width:none; }
        .ms-feat-row::-webkit-scrollbar { display:none; }
        .fc { flex-shrink:0; width:200px; border:1px solid var(--border); border-radius:var(--radius-lg); overflow:hidden; cursor:pointer; transition:all var(--ease); background:var(--bg); box-shadow:var(--shadow-sm); }
        .fc:hover { box-shadow:var(--shadow-brand); transform:translateY(-3px); border-color:#c4b5fd; }
        .fc__img { height:82px; display:flex; align-items:center; justify-content:center; font-size:2.4rem; }
        .fc__body { padding:9px 12px 13px; }
        .fc__by { font-size:0.68rem; color:var(--text-3); font-weight:600; }
        .fc__name { font-size:0.875rem; font-weight:700; margin-top:2px; line-height:1.25; }
        .fc__price { font-size:0.82rem; font-weight:700; color:var(--brand-mid); margin-top:5px; }

        /* filter bar */
        .ms-bar { padding:16px 32px; display:flex; flex-wrap:wrap; gap:8px; align-items:center; border-bottom:1px solid var(--border); background:var(--bg); position:sticky; top:0; z-index:10; }
        .ms-srch { flex:1; min-width:160px; position:relative; }
        .ms-srch input { width:100%; padding:8px 12px 8px 34px; border:1.5px solid var(--border-2); border-radius:8px; font-family:var(--font); font-size:0.85rem; color:var(--text); background:var(--bg-2); outline:none; transition:border var(--ease),box-shadow var(--ease); }
        .ms-srch input:focus { border-color:var(--brand-mid); box-shadow:0 0 0 3px rgba(124,58,237,0.09); }
        .ms-srch input::placeholder { color:var(--text-3); }
        .ms-srch__ic { position:absolute; left:10px; top:50%; transform:translateY(-50%); font-size:0.85rem; color:var(--text-3); pointer-events:none; }
        .chip { padding:5px 13px; border-radius:20px; border:1.5px solid var(--border); background:transparent; color:var(--text-2); font-size:0.78rem; font-weight:600; cursor:pointer; transition:all var(--ease); font-family:var(--font); white-space:nowrap; }
        .chip:hover { border-color:#c4b5fd; color:var(--brand-mid); background:var(--brand-xl); }
        .chip.on { border-color:var(--brand-mid); background:var(--brand-light); color:var(--brand); }
        .cpill { display:flex; align-items:center; gap:5px; padding:4px 11px 4px 5px; border-radius:20px; border:1.5px solid var(--border); background:transparent; font-size:0.76rem; font-weight:600; cursor:pointer; transition:all var(--ease); font-family:var(--font); color:var(--text-2); }
        .cpill__av { width:20px; height:20px; border-radius:50%; background:var(--brand-light); display:flex; align-items:center; justify-content:center; font-size:0.7rem; }
        .cpill:hover, .cpill.on { border-color:var(--brand-mid); background:var(--brand-xl); color:var(--brand); }
        .ms-bar__div { width:100%; height:1px; background:var(--border); }

        /* grid */
        .ms-count { padding:14px 32px 4px; font-size:0.78rem; color:var(--text-3); font-weight:500; }
        .ms-grid { padding:10px 32px 40px; display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:16px; }

        /* product card */
        .pcard { background:var(--bg); border:1px solid var(--border); border-radius:var(--radius-lg); overflow:hidden; display:flex; flex-direction:column; box-shadow:var(--shadow-sm); transition:all var(--ease); animation:up 220ms ease both; }
        .pcard:hover { box-shadow:var(--shadow-brand); transform:translateY(-3px); border-color:#c4b5fd; }
        @keyframes up { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .pcard__img { height:110px; display:flex; align-items:center; justify-content:center; font-size:2.8rem; position:relative; }
        .pcard__feat-flag { position:absolute; top:9px; left:9px; background:linear-gradient(135deg,#7c3aed,#06b6d4); color:#fff; font-size:0.62rem; font-weight:700; padding:2px 8px; border-radius:20px; text-transform:uppercase; letter-spacing:0.06em; }
        .pcard__cat-tag { position:absolute; top:9px; right:9px; font-size:0.65rem; font-weight:700; padding:3px 9px; border-radius:20px; text-transform:uppercase; letter-spacing:0.05em; }
        .pcard__byline { padding:8px 14px 0; display:flex; align-items:center; gap:6px; }
        .pcard__av { width:20px; height:20px; border-radius:50%; background:var(--brand-light); display:flex; align-items:center; justify-content:center; font-size:0.68rem; flex-shrink:0; }
        .pcard__handle { font-size:0.72rem; color:var(--text-3); font-weight:600; }
        .pcard__check { color:var(--brand-mid); font-size:0.68rem; }
        .pcard__body { padding:8px 14px 14px; flex:1; display:flex; flex-direction:column; gap:5px; }
        .pcard__name { font-size:0.96rem; font-weight:700; line-height:1.3; letter-spacing:-0.02em; }
        .pcard__desc { font-size:0.78rem; color:var(--text-2); line-height:1.55; flex:1; }
        .pcard__foot { padding:11px 14px; border-top:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; gap:8px; }
        .pcard__price { font-size:1.1rem; font-weight:800; letter-spacing:-0.02em; }
        .pcard__acts { display:flex; gap:5px; }

        /* right panel */
        .ms-panel { background:var(--bg-2); border-left:1px solid var(--border); display:flex; flex-direction:column; position:sticky; top:0; height:100vh; }
        .ms-tabs { display:flex; background:var(--bg); border-bottom:1px solid var(--border); }
        .ptab { flex:1; padding:12px 8px; text-align:center; font-size:0.74rem; font-weight:700; color:var(--text-3); cursor:pointer; border-bottom:2px solid transparent; transition:all var(--ease); font-family:var(--font); text-transform:uppercase; letter-spacing:0.06em; position:relative; }
        .ptab.on { color:var(--brand-mid); border-bottom-color:var(--brand-mid); background:var(--brand-xl); }
        .ptab:hover:not(.on) { color:var(--text); background:var(--bg-3); }
        .ptab__dot { position:absolute; top:7px; right:10px; background:var(--brand-mid); color:#fff; font-size:0.58rem; min-width:15px; height:15px; border-radius:8px; display:flex; align-items:center; justify-content:center; padding:0 3px; font-weight:800; }
        .ms-pbody { flex:1; overflow-y:auto; padding:18px; display:flex; flex-direction:column; gap:12px; scrollbar-width:thin; scrollbar-color:var(--border) transparent; }

        /* cart */
        .cart-empty { text-align:center; padding:50px 20px; color:var(--text-3); font-size:0.85rem; }
        .cart-empty__icon { font-size:2.4rem; display:block; margin-bottom:8px; }
        .crow { display:flex; align-items:center; gap:10px; padding:10px 12px; background:var(--bg); border:1px solid var(--border); border-radius:10px; }
        .crow__ic { font-size:1.45rem; flex-shrink:0; }
        .crow__info { flex:1; min-width:0; }
        .crow__name { font-size:0.82rem; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .crow__sub { font-size:0.7rem; color:var(--text-3); margin-top:2px; }
        .qty-c { display:flex; align-items:center; gap:4px; }
        .qbtn { width:23px; height:23px; border-radius:6px; border:1.5px solid var(--border-2); background:var(--bg-2); color:var(--text); font-size:0.95rem; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all var(--ease); font-family:var(--font); font-weight:700; }
        .qbtn:hover { border-color:var(--brand-mid); color:var(--brand-mid); background:var(--brand-xl); }
        .qnum { font-size:0.82rem; font-weight:700; min-width:17px; text-align:center; }
        .cart-sum { background:linear-gradient(135deg,var(--brand-xl),#e0f2fe); border:1.5px solid var(--brand-light); border-radius:var(--radius); padding:13px 15px; display:flex; justify-content:space-between; align-items:center; }
        .cart-sum__l { font-size:0.72rem; color:var(--text-2); font-weight:700; text-transform:uppercase; letter-spacing:0.07em; }
        .cart-sum__v { font-size:1.25rem; font-weight:800; color:var(--brand-mid); letter-spacing:-0.03em; }
        .cart-note { font-size:0.7rem; color:var(--text-3); text-align:center; line-height:1.55; }

        /* admin */
        .sec-title { font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:var(--text-3); padding-bottom:8px; border-bottom:1px solid var(--border); }
        .mpr { display:flex; align-items:center; gap:10px; padding:9px 11px; border:1px solid var(--border); border-radius:10px; background:var(--bg); transition:all var(--ease); }
        .mpr:hover { border-color:var(--border-2); }
        .mpr__ic { font-size:1.4rem; flex-shrink:0; }
        .mpr__info { flex:1; min-width:0; }
        .mpr__name { font-size:0.82rem; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .mpr__meta { font-size:0.7rem; color:var(--text-3); margin-top:2px; display:flex; align-items:center; gap:6px; }
        .mpr__acts { display:flex; gap:3px; flex-shrink:0; }
        .badge { display:inline-flex; font-size:0.65rem; font-weight:700; padding:2px 7px; border-radius:20px; text-transform:uppercase; letter-spacing:0.05em; }
        .badge--active { background:var(--green-bg); color:var(--green); }
        .badge--draft { background:var(--bg-3); color:var(--text-3); }
        .edit-notice { background:var(--amber-bg); border:1.5px solid #fcd34d; border-radius:8px; padding:9px 12px; font-size:0.77rem; color:var(--amber); font-weight:600; }

        /* form */
        .field { display:flex; flex-direction:column; gap:4px; }
        .field__lbl { font-size:0.69rem; font-weight:700; color:var(--text-3); text-transform:uppercase; letter-spacing:0.08em; }
        .inp,.sel,.ta { padding:8px 11px; background:var(--bg); border:1.5px solid var(--border-2); border-radius:8px; color:var(--text); font-family:var(--font); font-size:0.855rem; outline:none; transition:border var(--ease),box-shadow var(--ease); width:100%; }
        .inp:focus,.sel:focus,.ta:focus { border-color:var(--brand-mid); box-shadow:0 0 0 3px rgba(124,58,237,0.08); }
        .inp::placeholder,.ta::placeholder { color:var(--text-3); }
        .sel { appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='%23a1a1aa' d='M5 7L1 3h8z'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 9px center; padding-right:26px; }
        .ta { resize:vertical; }
        .row2 { display:grid; grid-template-columns:1fr 1fr; gap:9px; }
        .ai-hint { background:linear-gradient(135deg,#f3f0ff,#e0f2fe); border:1.5px dashed #c4b5fd; border-radius:10px; padding:11px 14px; font-size:0.77rem; color:var(--brand); text-align:center; font-weight:600; }
        .ai-hint span { color:var(--text-3); font-weight:400; font-size:0.71rem; display:block; margin-top:3px; }
        .hdiv { height:1px; background:var(--border); }

        /* browse tab – creator cards */
        .cc { background:var(--bg); border:1px solid var(--border); border-radius:var(--radius); padding:13px 14px; cursor:pointer; transition:all var(--ease); }
        .cc:hover { border-color:#c4b5fd; box-shadow:var(--shadow); }
        .cc__top { display:flex; align-items:center; gap:10px; }
        .cc__av { width:34px; height:34px; border-radius:50%; background:var(--brand-light); display:flex; align-items:center; justify-content:center; font-size:1.1rem; flex-shrink:0; }
        .cc__name { font-weight:700; font-size:0.855rem; display:flex; align-items:center; gap:6px; }
        .cc__vtag { color:var(--brand-mid); font-size:0.67rem; background:var(--brand-light); padding:1px 6px; border-radius:10px; font-weight:700; }
        .cc__handle { font-size:0.72rem; color:var(--text-3); margin-top:1px; }
        .cc__bio { font-size:0.74rem; color:var(--text-2); margin-top:8px; line-height:1.55; }

        /* ── Shareable link row (below each product card) ── */
        .pcard__link-row { padding:8px 14px 12px; display:flex; align-items:center; gap:8px; border-top:1px dashed var(--border); background:var(--bg-3); }
        .pcard__link-url { flex:1; font-size:0.7rem; color:var(--text-3); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-family:ui-monospace,monospace; }
        .pcard__link-copy { flex-shrink:0; padding:4px 10px; border-radius:6px; border:1.5px solid var(--border-2); background:var(--bg); color:var(--text-2); font-family:var(--font); font-size:0.72rem; font-weight:600; cursor:pointer; transition:all var(--ease); white-space:nowrap; }
        .pcard__link-copy:hover { border-color:var(--brand-mid); color:var(--brand-mid); background:var(--brand-xl); }
        .pcard__link-copy--copied { border-color:var(--green); color:var(--green); background:var(--green-bg); }

        /* ── Copied state for panel link button ── */
        .btn--copied { border-color:var(--green) !important; color:var(--green) !important; background:var(--green-bg) !important; }

        /* buttons */
        .btn { display:inline-flex; align-items:center; gap:4px; padding:7px 14px; border-radius:8px; border:1.5px solid var(--border-2); background:var(--bg); color:var(--text); font-family:var(--font); font-size:0.835rem; font-weight:600; cursor:pointer; transition:all var(--ease); white-space:nowrap; }
        .btn:hover { border-color:var(--brand-mid); color:var(--brand-mid); background:var(--brand-xl); }
        .btn:disabled { opacity:0.38; cursor:not-allowed; }
        .btn--brand { background:var(--brand-mid); border-color:var(--brand-mid); color:#fff; }
        .btn--brand:hover { background:var(--brand); border-color:var(--brand); color:#fff; box-shadow:0 4px 14px rgba(124,58,237,0.3); }
        .btn--ghost { background:transparent; border-color:transparent; color:var(--text-2); }
        .btn--ghost:hover { background:var(--bg-3); border-color:transparent; color:var(--text); }
        .btn--danger { border-color:#fecaca; color:var(--red); background:var(--red-bg); }
        .btn--danger:hover { border-color:var(--red); background:#fee2e2; }
        .btn--sm  { padding:5px 10px; font-size:0.775rem; border-radius:7px; }
        .btn--xs  { padding:3px 7px;  font-size:0.7rem;   border-radius:6px; }
        .btn--full { width:100%; justify-content:center; }
      `}</style>

            <div className="ms">
                <div className="ms-wrap">

                    {/* ══════════════ LEFT ══════════════ */}
                    <main className="ms-left">

                        {/* Hero */}
                        <div className="ms-hero">
                            <div className="ms-hero__eyebrow">&#9733; Marketplace</div>
                            <div className="ms-hero__h">Shop from <em>every</em> creator</div>
                            <div className="ms-hero__sub">
                                Browse digital products, physical goods, and services from all creators on MyShort.Biz — in one place.
                            </div>
                            <div className="ms-stats">
                                <div><div className="ms-stat__v">{products.filter(p => p.status === "active").length}</div><div className="ms-stat__l">Products listed</div></div>
                                <div><div className="ms-stat__v">{creators.length}</div><div className="ms-stat__l">Creators</div></div>
                                <div><div className="ms-stat__v">{creators.filter(c => c.verified).length}</div><div className="ms-stat__l">Verified sellers</div></div>
                            </div>
                        </div>

                        {/* Featured strip */}
                        {featured.length > 0 && (
                            <div className="ms-feat">
                                <div className="ms-feat__lbl">&#9733; Featured picks</div>
                                <div className="ms-feat-row">
                                    {featured.map((p) => {
                                        const cr = creatorMap.get(p.creatorId);
                                        return (
                                            <div key={p.id} className="fc" onClick={() => {
                                                if (p.buyUrl) window.open(p.buyUrl, "_blank", "noopener,noreferrer");
                                            }} style={{ cursor: p.buyUrl ? "pointer" : "default" }}>
                                                <div className={`fc__img fc__img--${p.category.toLowerCase()}`}>{p.image}</div>
                                                <div className="fc__body">
                                                    <div className="fc__by">{cr?.handle}</div>
                                                    <div className="fc__name">{p.name}</div>
                                                    <div className="fc__price">{money(p.price)}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Filter bar */}
                        <div className="ms-bar">
                            <div className="ms-srch">
                                <span className="ms-srch__ic">&#128269;</span>
                                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search all products…" />
                            </div>

                            {(["all", "Digital", "Physical", "Service"] as const).map((c) => (
                                <button key={c} className={`chip ${catFilter === c ? "on" : ""}`} onClick={() => setCatFilter(c)}>
                                    {c === "all" ? "All" : `${CAT_EMOJI[c]} ${c}`}
                                </button>
                            ))}

                            <div className="ms-bar__div" />

                            <button className={`cpill ${creatorFilter === "all" ? "on" : ""}`} onClick={() => setCreatorFilter("all")}>
                                <div className="cpill__av">&#127760;</div>All creators
                            </button>
                            {creators.map((c) => (
                                <button key={c.id} className={`cpill ${creatorFilter === c.id ? "on" : ""}`} onClick={() => setCreatorFilter(c.id)}>
                                    <div className="cpill__av">{c.avatar}</div>
                                    {c.displayName}
                                    {c.verified && <span style={{ color: "var(--brand-mid)", fontSize: "0.65rem" }}>&#10003;</span>}
                                </button>
                            ))}
                        </div>

                        {/* Count */}
                        <div className="ms-count">
                            {filtered.length} product{filtered.length !== 1 ? "s" : ""}{query ? ` matching "${query}"` : ""}
                        </div>

                        {/* Grid */}
                        <div className="ms-grid">
                            {filtered.length === 0 ? (
                                <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "80px 24px", color: "var(--text-3)" }}>
                                    <div style={{ fontSize: "2.5rem", marginBottom: 10 }}>🔍</div>
                                    <div style={{ fontWeight: 700, color: "var(--text-2)", marginBottom: 6 }}>Nothing found</div>
                                    <div>Try a different filter or search term.</div>
                                </div>
                            ) : filtered.map((p, i) => {
                                const cr = creatorMap.get(p.creatorId);
                                const own = p.creatorId === "you";
                                return (
                                    <article key={p.id} className="pcard" style={{ animationDelay: `${i * 30}ms` }}>
                                        <div className={`pcard__img pcard__img--${p.category.toLowerCase()}`}>
                                            {p.image}
                                            {p.featured && <div className="pcard__feat-flag">&#9733; Featured</div>}
                                            <div className={`pcard__cat-tag pcard__cat-tag--${p.category.toLowerCase()}`}>
                                                {p.category}
                                            </div>
                                        </div>
                                        {cr && (
                                            <div className="pcard__byline">
                                                <div className="pcard__av">{cr.avatar}</div>
                                                <span className="pcard__handle">{cr.handle}</span>
                                                {cr.verified && <span className="pcard__check">&#10003;</span>}
                                            </div>
                                        )}
                                        <div className="pcard__body">
                                            <div className="pcard__name">{p.name}</div>
                                            <div className="pcard__desc">{p.description}</div>
                                        </div>
                                        <div className="pcard__foot">
                                            <div className="pcard__price">{money(p.price)}</div>
                                            <div className="pcard__acts">
                                                <button
                                                    className="btn btn--brand btn--sm"
                                                    onClick={() => {
                                                        if (p.buyUrl) {
                                                            window.open(p.buyUrl, "_blank", "noopener,noreferrer");
                                                        }
                                                    }}
                                                    disabled={!p.buyUrl}
                                                    title={p.buyUrl ? "Go to storefront" : "No buy link set"}
                                                >
                                                    {p.buyUrl ? "Buy now →" : "No link set"}
                                                </button>
                                                {own && <>
                                                    <button className="btn btn--sm btn--ghost" onClick={() => startEdit(p)} title="Edit">✏️</button>
                                                    <button className="btn btn--xs btn--danger" onClick={() => deleteProduct(p.id)} title="Delete">🗑</button>
                                                </>}
                                            </div>
                                        </div>
                                        <div className="pcard__link-row">
                                            <span className="pcard__link-url" title={makeLink(p)}>{makeLink(p)}</span>
                                            <button
                                                className={`pcard__link-copy ${copiedId === p.id ? "pcard__link-copy--copied" : ""}`}
                                                onClick={() => copyLink(p)}
                                            >
                                                {copiedId === p.id ? "&#10003; Copied!" : "Copy link"}
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </main>

                    {/* ══════════════ RIGHT PANEL ══════════════ */}
                    <aside className="ms-panel">
                        <div className="ms-tabs">
                            <div className={`ptab ${activeTab === "browse" ? "on" : ""}`} onClick={() => setActiveTab("browse")}>Creators</div>
                            <div className={`ptab ${activeTab === "admin" ? "on" : ""}`} onClick={() => setActiveTab("admin")}>My Shop</div>
                        </div>

                        <div className="ms-pbody">

                            {/* Browse / Creators */}
                            {activeTab === "browse" && (
                                <>
                                    <div className="sec-title">Creators on MyShort.Biz</div>
                                    {creators.map((c) => {
                                        const n = products.filter(p => p.creatorId === c.id && p.status === "active").length;
                                        return (
                                            <div key={c.id} className="cc" onClick={() => { setCreatorFilter(c.id); }}>
                                                <div className="cc__top">
                                                    <div className="cc__av">{c.avatar}</div>
                                                    <div>
                                                        <div className="cc__name">
                                                            {c.displayName}
                                                            {c.verified && <span className="cc__vtag">&#10003; Verified</span>}
                                                        </div>
                                                        <div className="cc__handle">{c.handle} · {n} product{n !== 1 ? "s" : ""}</div>
                                                    </div>
                                                </div>
                                                <div className="cc__bio">{c.bio}</div>
                                            </div>
                                        );
                                    })}
                                    <div className="ai-hint">
                                        &#9733; Creator storefronts
                                        <span>Full profiles, follower system & social links — coming soon</span>
                                    </div>
                                </>
                            )}

                            {/* Cart */}
                            {activeTab === "cart" && (
                                <>
                                    {cart.length === 0 ? (
                                        <div className="cart-empty">
                                            <span className="cart-empty__icon">🛒</span>
                                            Your cart is empty.<br />
                                            <span style={{ fontSize: "0.78rem" }}>Find something you love in the store!</span>
                                        </div>
                                    ) : <>
                                        {cart.map((item) => {
                                            const p = byId.get(item.productId);
                                            if (!p) return null;
                                            const cr = creatorMap.get(p.creatorId);
                                            return (
                                                <div key={item.productId} className="crow">
                                                    <div className="crow__ic">{p.image}</div>
                                                    <div className="crow__info">
                                                        <div className="crow__name">{p.name}</div>
                                                        <div className="crow__sub">{cr?.handle} · {money(p.price)} each</div>
                                                    </div>
                                                    <div className="qty-c">
                                                        <button className="qbtn" onClick={() => setQty(item.productId, item.qty - 1)}>&#8722;</button>
                                                        <span className="qnum">{item.qty}</span>
                                                        <button className="qbtn" onClick={() => setQty(item.productId, item.qty + 1)}>+</button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div className="cart-sum">
                                            <div className="cart-sum__l">Order Total</div>
                                            <div className="cart-sum__v">{money(cartTotal)}</div>
                                        </div>
                                        <button className="btn btn--brand btn--full" style={{ padding: "12px" }} disabled>
                                            Checkout — Stripe coming soon
                                        </button>
                                        <button className="btn btn--ghost btn--full btn--sm" onClick={() => { setCart([]); localStorage.setItem(LS_CART, "[]"); }}>
                                            Clear cart
                                        </button>
                                        <div className="cart-note">Payments connect to your FastAPI backend via Stripe webhooks.</div>
                                    </>}
                                </>
                            )}

                            {/* Admin / My Shop */}
                            {activeTab === "admin" && (
                                <>
                                    <div className="sec-title">My Products ({myProducts.length})</div>

                                    {myProducts.length === 0 && (
                                        <div style={{ textAlign: "center", color: "var(--text-3)", fontSize: "0.8rem", padding: "16px 0" }}>
                                            No products yet — create your first below!
                                        </div>
                                    )}

                                    {myProducts.map((p) => (
                                        <div key={p.id} className="mpr">
                                            <div className="mpr__ic">{p.image}</div>
                                            <div className="mpr__info">
                                                <div className="mpr__name">{p.name}</div>
                                                <div className="mpr__meta">
                                                    <span className={`badge badge--${p.status}`}>{p.status}</span>
                                                    <span>{money(p.price)}</span>
                                                    <span className={`mpr__cat mpr__cat--${p.category.toLowerCase()}`}>{p.category}</span>
                                                </div>
                                            </div>
                                            <div className="mpr__acts">
                                                <button className="btn btn--xs" onClick={() => togglePublish(p.id)} title={p.status === "active" ? "Unpublish" : "Publish"}>
                                                    {p.status === "active" ? "Pause" : "Publish"}
                                                </button>
                                                <button className="btn btn--xs" onClick={() => startEdit(p)}>✏️</button>
                                                <button
                                                    className={`btn btn--xs ${copiedId === p.id ? "btn--copied" : ""}`}
                                                    onClick={() => copyLink(p)}
                                                    title="Copy shareable link"
                                                >
                                                    {copiedId === p.id ? "&#10003;" : "&#128279;"}
                                                </button>
                                                <button className="btn btn--xs btn--danger" onClick={() => deleteProduct(p.id)}>🗑</button>
                                            </div>
                                        </div>
                                    ))}

                                    <div className="hdiv" />

                                    {editingId && (
                                        <div className="edit-notice">
                                            ✏️ Editing: <strong>{products.find(p => p.id === editingId)?.name}</strong>
                                        </div>
                                    )}

                                    <div className="sec-title">{editingId ? "Edit Product" : "New Product"}</div>

                                    <label className="field">
                                        <div className="field__lbl">Name</div>
                                        <input className="inp" value={draft.name} onChange={(e) => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="e.g. Resume Template Pack" />
                                    </label>

                                    <div className="row2">
                                        <label className="field">
                                            <div className="field__lbl">Price (USD)</div>
                                            <input className="inp" type="number" step="0.01" min="0" value={draft.price} onChange={(e) => setDraft(d => ({ ...d, price: Number(e.target.value) }))} />
                                        </label>
                                        <label className="field">
                                            <div className="field__lbl">Icon</div>
                                            <input className="inp" value={draft.image ?? ""} onChange={(e) => setDraft(d => ({ ...d, image: e.target.value }))} placeholder="🛍️" />
                                        </label>
                                    </div>

                                    <div className="row2">
                                        <label className="field">
                                            <div className="field__lbl">Category</div>
                                            <select className="sel" value={draft.category} onChange={(e) => setDraft(d => ({ ...d, category: e.target.value as ProductCategory }))}>
                                                <option>Digital</option><option>Physical</option><option>Service</option>
                                            </select>
                                        </label>
                                        <label className="field">
                                            <div className="field__lbl">Status</div>
                                            <select className="sel" value={draft.status} onChange={(e) => setDraft(d => ({ ...d, status: e.target.value as ProductStatus }))}>
                                                <option value="draft">Draft</option><option value="active">Active</option>
                                            </select>
                                        </label>
                                    </div>

                                    <label className="field">
                                        <div className="field__lbl">Description</div>
                                        <textarea className="ta" rows={3} value={draft.description} onChange={(e) => setDraft(d => ({ ...d, description: e.target.value }))} placeholder="What's included? Who is it for?" />
                                    </label>

                                    <label className="field">
                                        <div className="field__lbl">Buy Link (Amazon, Etsy, Gumroad, etc.)</div>
                                        <input className="inp" value={draft.buyUrl ?? ""} onChange={(e) => setDraft(d => ({ ...d, buyUrl: e.target.value }))} placeholder="https://www.etsy.com/listing/..." />
                                    </label>

                                    <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-2)" }}>
                                        <input type="checkbox" checked={draft.featured ?? false} onChange={(e) => setDraft(d => ({ ...d, featured: e.target.checked }))} style={{ accentColor: "var(--brand-mid)", width: 14, height: 14 }} />
                                        Mark as featured
                                    </label>

                                    {editingId ? (
                                        <div style={{ display: "flex", gap: 8 }}>
                                            <button className="btn btn--brand" style={{ flex: 1, justifyContent: "center" }} onClick={() => saveEdit(editingId)} disabled={!draft.name.trim()}>
                                                Save Changes
                                            </button>
                                            <button className="btn" onClick={() => { setEditingId(null); setDraft(emptyDraft()); }}>Cancel</button>
                                        </div>
                                    ) : (
                                        <button className="btn btn--brand btn--full" style={{ padding: "10px" }} onClick={createProduct} disabled={!draft.name.trim()}>
                                            + Create Product
                                        </button>
                                    )}

                                    <div className="ai-hint">
                                        &#9733; AI Copy Generator
                                        <span>Auto-write product descriptions — coming soon</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </aside>
                </div>
            </div>
        </>
    );
}