import { useMemo, useState } from "react";
import "./style.scss";

type ProductCategory = "Digital" | "Physical" | "Service";
type ProductStatus = "active" | "draft";

type Product = {
    id: string;
    name: string;
    price: number;
    category: ProductCategory;
    status: ProductStatus;
    description: string;
};

type CartItem = {
    productId: string;
    qty: number;
};

const LS_PRODUCTS = "myshortbiz.store.products.v1";
const LS_CART = "myshortbiz.store.cart.v1";

function uid(): string {
    return Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);
}

function money(n: number): string {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function safeParse<T>(raw: string | null, fallback: T): T {
    try {
        if (!raw) return fallback;
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

export default function Store() {
    // ----- data state -----
    const [products, setProducts] = useState<Product[]>(() => {
        const stored = safeParse<Product[]>(localStorage.getItem(LS_PRODUCTS), []);
        if (stored.length) return stored;

        const seed: Product[] = [
            {
                id: uid(),
                name: "Starter Template Pack",
                price: 9.99,
                category: "Digital",
                status: "active",
                description: "A small set of templates you can build on.",
            },
            {
                id: uid(),
                name: "1:1 Coaching Call",
                price: 49.0,
                category: "Service",
                status: "draft",
                description: "A 30 minute call (publish when ready).",
            },
            {
                id: uid(),
                name: "Merch Hoodie",
                price: 39.99,
                category: "Physical",
                status: "active",
                description: "Limited run hoodie.",
            },
        ];

        localStorage.setItem(LS_PRODUCTS, JSON.stringify(seed));
        return seed;
    });

    const [cart, setCart] = useState<CartItem[]>(() => {
        const stored = safeParse<CartItem[]>(localStorage.getItem(LS_CART), []);
        if (stored.length) return stored;
        localStorage.setItem(LS_CART, JSON.stringify([]));
        return [];
    });

    // ----- UI state -----
    const [query, setQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<"all" | ProductCategory>("all");
    const [statusFilter, setStatusFilter] = useState<"all" | ProductStatus>("all");
    const [showAdminPanel, setShowAdminPanel] = useState(true);

    // ----- admin draft form -----
    const [draft, setDraft] = useState<Omit<Product, "id">>({
        name: "",
        price: 0,
        category: "Digital",
        status: "draft",
        description: "",
    });

    // ----- derived -----
    const filteredProducts = useMemo(() => {
        const q = query.trim().toLowerCase();
        return products
            .filter((p) => (categoryFilter === "all" ? true : p.category === categoryFilter))
            .filter((p) => (statusFilter === "all" ? true : p.status === statusFilter))
            .filter((p) => {
                if (!q) return true;
                return (
                    p.name.toLowerCase().includes(q) ||
                    p.description.toLowerCase().includes(q) ||
                    p.category.toLowerCase().includes(q) ||
                    p.status.toLowerCase().includes(q)
                );
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [products, query, categoryFilter, statusFilter]);

    const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);

    const cartTotal = useMemo(() => {
        const byId = new Map(products.map((p) => [p.id, p]));
        return cart.reduce((sum, item) => {
            const p = byId.get(item.productId);
            if (!p) return sum;
            return sum + p.price * item.qty;
        }, 0);
    }, [cart, products]);

    // ----- helpers -----
    function persist(nextProducts: Product[], nextCart: CartItem[]) {
        localStorage.setItem(LS_PRODUCTS, JSON.stringify(nextProducts));
        localStorage.setItem(LS_CART, JSON.stringify(nextCart));
    }

    function addToCart(productId: string) {
        const nextCart = (() => {
            const existing = cart.find((c) => c.productId === productId);
            if (existing) {
                return cart.map((c) => (c.productId === productId ? { ...c, qty: c.qty + 1 } : c));
            }
            return [...cart, { productId, qty: 1 }];
        })();

        setCart(nextCart);
        persist(products, nextCart);
    }

    function setQty(productId: string, qty: number) {
        const nextCart = cart
            .map((c) => (c.productId === productId ? { ...c, qty } : c))
            .filter((c) => c.qty > 0);

        setCart(nextCart);
        persist(products, nextCart);
    }

    function clearCart() {
        setCart([]);
        persist(products, []);
    }

    function createProduct() {
        const name = draft.name.trim();
        if (!name) return;

        const newProduct: Product = { id: uid(), ...draft, name };
        const nextProducts = [newProduct, ...products];

        setProducts(nextProducts);
        setDraft({ name: "", price: 0, category: "Digital", status: "draft", description: "" });
        persist(nextProducts, cart);
    }

    function togglePublish(id: string) {
        const nextProducts = products.map((p) =>
            p.id === id ? { ...p, status: p.status === "active" ? "draft" : "active" } : p
        );
        setProducts(nextProducts);
        persist(nextProducts, cart);
    }

    function deleteProduct(id: string) {
        const nextProducts = products.filter((p) => p.id !== id);
        const nextCart = cart.filter((c) => c.productId !== id);
        setProducts(nextProducts);
        setCart(nextCart);
        persist(nextProducts, nextCart);
    }

    return (
        <div className="shopPage">
            <div className="shopPage__scroll">
                <header className="shopHeader">
                    <div className="shopHeader__left">
                        <h1 className="shopHeader__title">Store</h1>
                        <p className="shopHeader__subtitle">Products and offers. Need to implement Payments + AI later...</p>
                    </div>

                    <div className="shopHeader__right">
                        <button className="btn btn--secondary" onClick={() => setShowAdminPanel((v) => !v)}>
                            {showAdminPanel ? "Hide Admin" : "Show Admin"}
                        </button>

                        <div className="shopHeader__cartChip" title="Cart summary">
                            Cart: <strong>{cartCount}</strong> | <strong>{money(cartTotal)}</strong>
                        </div>
                    </div>
                </header>

                <section className="shopFilters">
                    <input
                        className="input"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search products..."
                    />

                    <select className="select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as any)}>
                        <option value="all">All categories</option>
                        <option value="Digital">Digital</option>
                        <option value="Physical">Physical</option>
                        <option value="Service">Service</option>
                    </select>

                    <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
                        <option value="all">All statuses</option>
                        <option value="active">Active</option>
                        <option value="draft">Draft</option>
                    </select>

                    <button className="btn btn--danger" onClick={clearCart} disabled={cart.length === 0}>
                        Clear Cart
                    </button>
                </section>

                <div className="shopGrid">
                    <section className="shopGrid__left">
                        <div className="shopCards">
                            {filteredProducts.map((p) => (
                                <article key={p.id} className="card productCard">
                                    <div className="productCard__top">
                                        <div className="productCard__info">
                                            <div className="productCard__name">{p.name}</div>
                                            <div className="productCard__meta">
                                                {p.category} | <span className={`pill pill--${p.status}`}>{p.status}</span>
                                            </div>
                                        </div>

                                        <div className="productCard__price">{money(p.price)}</div>
                                    </div>

                                    <div className="productCard__desc">{p.description || "No description yet."}</div>

                                    <div className="productCard__actions">
                                        <button
                                            className="btn"
                                            onClick={() => addToCart(p.id)}
                                            disabled={p.status !== "active"}
                                            title={p.status !== "active" ? "Publish to enable purchase..." : "Add to cart"}
                                        >
                                            Add to Cart
                                        </button>

                                        {showAdminPanel && (
                                            <>
                                                <button className="btn btn--secondary" onClick={() => togglePublish(p.id)}>
                                                    {p.status === "active" ? "Unpublish" : "Publish"}
                                                </button>
                                                <button className="btn btn--danger" onClick={() => deleteProduct(p.id)}>
                                                    Delete
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </article>
                            ))}

                            {filteredProducts.length === 0 && <div className="emptyState">No products match your filters.</div>}
                        </div>
                    </section>

                    <aside className="shopGrid__right">
                        <div className="card sideCard">
                            <div className="sideCard__title">Cart</div>

                            {cart.length === 0 ? (
                                <div className="muted">Cart is empty.</div>
                            ) : (
                                <div className="cartList">
                                    {cart.map((item) => {
                                        const p = products.find((x) => x.id === item.productId);
                                        if (!p) return null;

                                        return (
                                            <div key={item.productId} className="cartRow">
                                                <div className="cartRow__left">
                                                    <div className="cartRow__name">{p.name}</div>
                                                    <div className="muted">{money(p.price)} each</div>
                                                </div>

                                                <div className="cartRow__qty">
                                                    <button className="qtyBtn" onClick={() => setQty(item.productId, item.qty - 1)}>
                                                        -
                                                    </button>
                                                    <div className="qtyNum">{item.qty}</div>
                                                    <button className="qtyBtn" onClick={() => setQty(item.productId, item.qty + 1)}>
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="sideCard__footer">
                                <div className="totalRow">
                                    <span>Total</span>
                                    <strong>{money(cartTotal)}</strong>
                                </div>

                                <button className="btn" disabled={cart.length === 0} title="Payment flow later...">
                                    Checkout (later)
                                </button>

                                <div className="muted">This is UI/state only right now.</div>
                            </div>
                        </div>

                        {showAdminPanel && (
                            <div className="card sideCard">
                                <div className="sideCard__title">Admin: New Product</div>

                                <label className="field">
                                    <div className="field__label">Name</div>
                                    <input
                                        className="input"
                                        value={draft.name}
                                        onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                                        placeholder="e.g., Resume Template Pack"
                                    />
                                </label>

                                <div className="row2">
                                    <label className="field">
                                        <div className="field__label">Price (USD)</div>
                                        <input
                                            className="input"
                                            type="number"
                                            step="0.01"
                                            value={draft.price}
                                            onChange={(e) => setDraft((d) => ({ ...d, price: Number(e.target.value) }))}
                                        />
                                    </label>

                                    <label className="field">
                                        <div className="field__label">Category</div>
                                        <select
                                            className="select"
                                            value={draft.category}
                                            onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value as any }))}
                                        >
                                            <option value="Digital">Digital</option>
                                            <option value="Physical">Physical</option>
                                            <option value="Service">Service</option>
                                        </select>
                                    </label>
                                </div>

                                <label className="field">
                                    <div className="field__label">Status</div>
                                    <select
                                        className="select"
                                        value={draft.status}
                                        onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as any }))}
                                    >
                                        <option value="draft">draft</option>
                                        <option value="active">active</option>
                                    </select>
                                </label>

                                <label className="field">
                                    <div className="field__label">Description</div>
                                    <textarea
                                        className="textarea"
                                        rows={4}
                                        value={draft.description}
                                        onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                                        placeholder="Short description..."
                                    />
                                </label>

                                <button className="btn" onClick={createProduct} disabled={!draft.name.trim()}>
                                    Create Product
                                </button>

                                <div className="aiPlaceholder">AI product copy suggestions placeholder (later).</div>
                            </div>
                        )}
                    </aside>
                </div>
            </div>
        </div>
    );
}
