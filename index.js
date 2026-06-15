import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CATS = ["nutrition","superfood","snack","apparel"];
const CAT_LABELS = { nutrition:"Nutrition", superfood:"Superfood", snack:"Snack", apparel:"Apparel" };
const CAT_COLORS = { nutrition:"#4A7C59", superfood:"#2E7D32", snack:"#D4962A", apparel:"#6B5EA0" };
const ORDER_STATUSES = ["pending","processing","shipped","delivered","cancelled"];
const STATUS_LABELS = { pending:"Pending", processing:"Processing", shipped:"Shipped", delivered:"Delivered", cancelled:"Cancelled" };
const STATUS_COLORS = { pending:"#D4962A", processing:"#4A7C59", shipped:"#2563eb", delivered:"#1A2E1A", cancelled:"#c0392b" };

const DEFAULT_PRODUCTS = [
  { id:1, name:"Homemade Protein Powder — Chocolate", category:"nutrition", price:850, unit:"500g", desc:"Whey-based blend, hand-mixed in small batches. 22g protein per serving with real cocoa.", badge:"bestseller", tags:"22g Protein,Small Batch,Gluten Free", active:true, image:"" },
  { id:2, name:"Homemade Protein Powder — Vanilla", category:"nutrition", price:850, unit:"500g", desc:"Clean vanilla flavour with natural sweetness. Mixes easily into smoothies, oats, or milk.", badge:"new", tags:"22g Protein,Natural Flavour", active:true, image:"" },
  { id:3, name:"Sojina Moringa Leaf Powder", category:"superfood", price:320, unit:"100g", desc:"Sun-dried সজনা পাতা, stone-ground into fine powder. Rich in iron, calcium, and vitamin C.", badge:"bestseller", tags:"High Iron,Vitamin C,Sun Dried", active:true, image:"" },
  { id:4, name:"Moringa Capsules — Daily Greens", category:"superfood", price:480, unit:"60 caps", desc:"All the benefits of our Moringa powder in a convenient capsule. 30-day supply.", badge:"", tags:"60 Capsules,30-Day Supply", active:true, image:"" },
  { id:5, name:"Banana Chips — Original (Onnano)", category:"snack", price:120, unit:"100g", desc:"Thin-sliced local bananas, lightly salted and oven-crisped. No palm oil.", badge:"new", tags:"No Palm Oil,Oven Crisped,Vegan", active:true, image:"" },
  { id:6, name:"Banana Chips — Spicy Masala (Onnano)", category:"snack", price:130, unit:"100g", desc:"Same great chip with house-blend turmeric, cumin, and chilli.", badge:"", tags:"Spicy,Turmeric Blend,Vegan", active:true, image:"" },
  { id:7, name:"NUTRIVERO Organic Cotton Tee", category:"apparel", price:650, unit:"each", desc:"Relaxed-fit tee in 100% organic ring-spun cotton. Unisex, sizes S–XL.", badge:"new", tags:"Organic Cotton,Unisex,S–XL", active:true, image:"" },
  { id:8, name:"Wellness Midi Dress", category:"apparel", price:1200, unit:"each", desc:"Breathable linen-cotton blend in deep forest and dusty plum. Sizes XS–L.", badge:"", tags:"Linen Blend,XS–L,2 Colours", active:true, image:"" },
];

const EMPTY_PRODUCT = { name:"", category:"nutrition", price:"", unit:"", desc:"", badge:"", tags:"", active:true, image:"" };
const ADMIN_PASSWORD = "nutrivero2026";

// ─── STORAGE HELPERS (localStorage) ──────────────────────────────────────────
function lsGet(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ─── SMALL SHARED COMPONENTS ─────────────────────────────────────────────────
const CatPill = ({ cat }) => (
  <span style={{ background:CAT_COLORS[cat]+"22", color:CAT_COLORS[cat], fontSize:"0.58rem", letterSpacing:"0.14em", textTransform:"uppercase", padding:"3px 9px", borderRadius:20, fontWeight:700 }}>
    {CAT_LABELS[cat]}
  </span>
);

const BadgePill = ({ badge }) => {
  if (!badge) return null;
  return <span style={{ background:badge==="bestseller"?"#4A7C59":"#D4962A", color:"#fff", fontSize:"0.52rem", letterSpacing:"0.16em", textTransform:"uppercase", padding:"2px 7px", fontWeight:700, borderRadius:2 }}>{badge}</span>;
};

const Toast = ({ toast }) => toast ? (
  <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:toast.type==="error"?"#c0392b":"#1A2E1A", color:"#fff", padding:"12px 24px", fontSize:"0.78rem", letterSpacing:"0.06em", zIndex:9999, whiteSpace:"nowrap", boxShadow:"0 4px 20px rgba(0,0,0,0.25)", borderRadius:2 }}>
    {toast.type==="error"?"✕ ":"✓ "}{toast.msg}
  </div>
) : null;

// ─── SHARED STYLE TOKENS ──────────────────────────────────────────────────────
const lbl = { display:"block", fontSize:"0.62rem", letterSpacing:"0.16em", textTransform:"uppercase", color:"#6B7C6B", fontWeight:600, marginBottom:6 };
const inp = { width:"100%", padding:"10px 13px", border:"1px solid rgba(74,124,89,0.25)", background:"#FAFAF8", fontSize:"0.86rem", color:"#1A2E1A", outline:"none", fontFamily:"Inter,sans-serif", display:"block", borderRadius:0 };

// ═══════════════════════════════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════════════════════════════
function Store({ products, onOrderPlaced }) {
  const [cat, setCat] = useState("all");
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [orderForm, setOrderForm] = useState({ name:"", phone:"", address:"", notes:"" });
  const [orderSuccess, setOrderSuccess] = useState(null);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),2200); };
  const addToCart = (p) => {
    setCart(prev => { const ex=prev.find(i=>i.id===p.id); return ex?prev.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i):[...prev,{...p,qty:1}]; });
    showToast(`${p.name} added!`);
  };
  const changeQty = (id,d) => setCart(prev=>prev.map(i=>i.id===id?{...i,qty:i.qty+d}:i).filter(i=>i.qty>0));
  const cartTotal = cart.reduce((s,i)=>s+i.price*i.qty,0);
  const cartCount = cart.reduce((s,i)=>s+i.qty,0);

  const placeOrder = async () => {
    if (!orderForm.name.trim()) return showToast("নাম দিন","error");
    if (!orderForm.phone.trim()) return showToast("ফোন নম্বর দিন","error");
    if (!orderForm.address.trim()) return showToast("ঠিকানা দিন","error");
    const id = "NV-" + Date.now().toString().slice(-4);
    const order = { id, customer:orderForm.name, phone:orderForm.phone, address:orderForm.address, notes:orderForm.notes, items:cart.map(i=>({name:i.name,qty:i.qty,price:i.price})), total:cartTotal, status:"pending", date:new Date().toISOString().slice(0,10) };
    onOrderPlaced(order);
    setOrderSuccess(id);
    setCart([]);
    setCheckoutOpen(false);
    setCartOpen(false);
  };

  const visible = products.filter(p=>p.active&&(cat==="all"||p.category===cat));

  if (orderSuccess) return (
    <div style={{ fontFamily:"Inter,sans-serif", background:"#F2F0E8", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ textAlign:"center", maxWidth:400 }}>
        <div style={{ fontSize:"3rem", marginBottom:16 }}>🌿</div>
        <h2 style={{ fontFamily:"Georgia,serif", fontSize:"1.8rem", color:"#1A2E1A", fontWeight:300, marginBottom:12 }}>Order Placed!</h2>
        <p style={{ fontSize:"0.88rem", color:"#6B7C6B", lineHeight:1.7, marginBottom:6 }}>Order ID: <strong style={{ color:"#1A2E1A" }}>{orderSuccess}</strong></p>
        <p style={{ fontSize:"0.85rem", color:"#6B7C6B", lineHeight:1.7, marginBottom:28 }}>আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব। ধন্যবাদ! 🙏</p>
        <button onClick={()=>setOrderSuccess(null)} style={{ background:"#1A2E1A", color:"#F2F0E8", border:"none", padding:"13px 32px", cursor:"pointer", fontSize:"0.75rem", letterSpacing:"0.16em", textTransform:"uppercase", fontWeight:700 }}>Continue Shopping</button>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily:"Inter,sans-serif", background:"#F2F0E8", minHeight:"100vh" }}>
      <Toast toast={toast}/>
      {(cartOpen||checkoutOpen) && <div onClick={()=>{setCartOpen(false);setCheckoutOpen(false);}} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:300 }}/>}

      {/* Cart Drawer */}
      <div style={{ position:"fixed", top:0, right:cartOpen?0:"-420px", width:400, maxWidth:"95vw", height:"100vh", background:"#fff", zIndex:400, transition:"right 0.3s cubic-bezier(.16,1,.3,1)", display:"flex", flexDirection:"column", boxShadow:"-4px 0 24px rgba(0,0,0,0.12)" }}>
        <div style={{ padding:"20px 24px", borderBottom:"1px solid rgba(74,124,89,0.15)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontFamily:"Georgia,serif", fontSize:"1.3rem", color:"#1A2E1A" }}>Your Cart {cartCount>0&&`(${cartCount})`}</span>
          <button onClick={()=>setCartOpen(false)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:"1.2rem", color:"#6B7C6B" }}>✕</button>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"16px 24px" }}>
          {cart.length===0 ? (
            <div style={{ textAlign:"center", padding:"48px 0", color:"#6B7C6B" }}><div style={{ fontSize:"2rem", marginBottom:10 }}>🌿</div><p style={{ fontSize:"0.85rem" }}>Cart is empty</p></div>
          ) : cart.map(item=>(
            <div key={item.id} style={{ display:"flex", gap:14, padding:"14px 0", borderBottom:"1px solid rgba(74,124,89,0.1)" }}>
              <div style={{ width:56, height:56, background:"#F2F0E8", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
                {item.image?<img src={item.image} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt={item.name}/>:<span style={{ fontSize:"1.2rem", opacity:0.3 }}>🌿</span>}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:"0.85rem", fontWeight:600, color:"#1A2E1A", lineHeight:1.3, marginBottom:4 }}>{item.name}</div>
                <div style={{ fontSize:"0.75rem", color:"#6B7C6B" }}>৳ {(item.price*item.qty).toLocaleString()}</div>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:8 }}>
                  <button onClick={()=>changeQty(item.id,-1)} style={{ width:24, height:24, border:"1px solid rgba(74,124,89,0.3)", background:"none", cursor:"pointer", color:"#1A2E1A", display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
                  <span style={{ fontSize:"0.82rem", fontWeight:700, minWidth:16, textAlign:"center" }}>{item.qty}</span>
                  <button onClick={()=>changeQty(item.id,1)} style={{ width:24, height:24, border:"1px solid rgba(74,124,89,0.3)", background:"none", cursor:"pointer", color:"#1A2E1A", display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {cart.length>0&&(
          <div style={{ padding:"16px 24px", borderTop:"1px solid rgba(74,124,89,0.15)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <span style={{ fontSize:"0.78rem", textTransform:"uppercase", letterSpacing:"0.1em", color:"#6B7C6B" }}>Total</span>
              <span style={{ fontFamily:"Georgia,serif", fontSize:"1.3rem", color:"#1A2E1A" }}>৳ {cartTotal.toLocaleString()}</span>
            </div>
            <button onClick={()=>{setCartOpen(false);setCheckoutOpen(true);}} style={{ width:"100%", background:"#1A2E1A", color:"#F2F0E8", border:"none", padding:14, cursor:"pointer", fontSize:"0.75rem", fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase" }}>Checkout →</button>
          </div>
        )}
      </div>

      {/* Checkout Drawer */}
      <div style={{ position:"fixed", top:0, right:checkoutOpen?0:"-460px", width:440, maxWidth:"95vw", height:"100vh", background:"#fff", zIndex:400, transition:"right 0.3s cubic-bezier(.16,1,.3,1)", display:"flex", flexDirection:"column", overflowY:"auto", boxShadow:"-4px 0 24px rgba(0,0,0,0.12)" }}>
        <div style={{ padding:"20px 24px", borderBottom:"1px solid rgba(74,124,89,0.15)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontFamily:"Georgia,serif", fontSize:"1.3rem", color:"#1A2E1A" }}>Complete Order</span>
          <button onClick={()=>setCheckoutOpen(false)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:"1.2rem", color:"#6B7C6B" }}>✕</button>
        </div>
        <div style={{ padding:"24px" }}>
          {[["আপনার নাম *","text","e.g. Tasnim Rahman","name"],["ফোন নম্বর *","text","e.g. 01711-223344","phone"]].map(([label,type,ph,key])=>(
            <div key={key} style={{ marginBottom:18 }}>
              <div style={lbl}>{label}</div>
              <input style={inp} type={type} placeholder={ph} value={orderForm[key]} onChange={e=>setOrderForm(f=>({...f,[key]:e.target.value}))}/>
            </div>
          ))}
          <div style={{ marginBottom:18 }}>
            <div style={lbl}>ডেলিভারি ঠিকানা *</div>
            <textarea style={{...inp,height:80,resize:"vertical"}} placeholder="বাড়ি/ফ্ল্যাট নম্বর, রাস্তা, এলাকা, জেলা..." value={orderForm.address} onChange={e=>setOrderForm(f=>({...f,address:e.target.value}))}/>
          </div>
          <div style={{ marginBottom:24 }}>
            <div style={lbl}>বিশেষ নির্দেশনা (optional)</div>
            <input style={inp} placeholder="e.g. সন্ধ্যার পর ডেলিভারি দিন" value={orderForm.notes} onChange={e=>setOrderForm(f=>({...f,notes:e.target.value}))}/>
          </div>
          <div style={{ background:"#F2F0E8", padding:"14px 16px", marginBottom:20 }}>
            <div style={{ fontSize:"0.65rem", letterSpacing:"0.14em", textTransform:"uppercase", color:"#6B7C6B", marginBottom:10 }}>Order Summary</div>
            {cart.map(i=>(
              <div key={i.id} style={{ display:"flex", justifyContent:"space-between", fontSize:"0.78rem", color:"#1A2E1A", padding:"3px 0" }}>
                <span>{i.name} <span style={{ color:"#6B7C6B" }}>×{i.qty}</span></span>
                <span>৳ {(i.price*i.qty).toLocaleString()}</span>
              </div>
            ))}
            <div style={{ borderTop:"1px solid rgba(74,124,89,0.2)", marginTop:10, paddingTop:10, display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontSize:"0.78rem", fontWeight:700 }}>Total</span>
              <span style={{ fontFamily:"Georgia,serif", fontSize:"1.1rem", color:"#1A2E1A" }}>৳ {cartTotal.toLocaleString()}</span>
            </div>
          </div>
          <button onClick={placeOrder} style={{ width:"100%", background:"#4A7C59", color:"#fff", border:"none", padding:15, cursor:"pointer", fontSize:"0.78rem", fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase" }}>Place Order (Cash on Delivery)</button>
          <p style={{ fontSize:"0.7rem", color:"#6B7C6B", textAlign:"center", marginTop:12, lineHeight:1.6 }}>ক্যাশ অন ডেলিভারি · ঢাকা ডেলিভারি উপলব্ধ</p>
        </div>
      </div>

      {/* NAV */}
      <nav style={{ background:"#1A2E1A", padding:"0 28px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:200 }}>
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <svg width="20" height="20" viewBox="0 0 28 28" fill="none"><path d="M14 3C14 3 22 8 22 16C22 20.4 18.4 24 14 24C9.6 24 6 20.4 6 16C6 8 14 3 14 3Z" fill="#4A7C59"/><path d="M14 24L14 14" stroke="#A8C5A0" strokeWidth="1.5" strokeLinecap="round"/></svg>
          <span style={{ color:"#F2F0E8", fontFamily:"Georgia,serif", fontSize:"1.1rem", letterSpacing:"0.14em" }}>NUTRIVERO</span>
        </div>
        <button onClick={()=>setCartOpen(true)} style={{ background:cartCount>0?"#D4962A":"rgba(168,197,160,0.15)", color:"#F2F0E8", border:"none", cursor:"pointer", padding:"9px 18px", fontSize:"0.7rem", fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", display:"flex", alignItems:"center", gap:8, transition:"background 0.2s" }}>
          🛒 Cart {cartCount>0&&`(${cartCount})`}
        </button>
      </nav>

      {/* HERO */}
      <div style={{ background:"linear-gradient(135deg,#1A2E1A 0%,#2A4A2A 60%,#1A3A2A 100%)", padding:"64px 28px 56px", textAlign:"center" }}>
        <p style={{ fontSize:"0.62rem", letterSpacing:"0.32em", textTransform:"uppercase", color:"#A8C5A0", marginBottom:16, fontWeight:600 }}>Homemade · Natural · Bangladesh</p>
        <h1 style={{ fontFamily:"Georgia,serif", fontSize:"clamp(2.2rem,6vw,4rem)", fontWeight:300, color:"#F2F0E8", lineHeight:1.1, marginBottom:20 }}>Good food.<br/><em style={{ color:"#A8C5A0" }}>Honestly made.</em></h1>
        <p style={{ fontSize:"0.88rem", color:"rgba(168,197,160,0.8)", maxWidth:420, margin:"0 auto", lineHeight:1.75 }}>Protein powders, Moringa, snacks & lifestyle goods — crafted with real ingredients and zero shortcuts.</p>
      </div>

      {/* TRUST */}
      <div style={{ background:"#4A7C59", padding:"14px 28px", display:"flex", justifyContent:"center", gap:"clamp(16px,3vw,48px)", flexWrap:"wrap" }}>
        {["100% Homemade","No Artificial Additives","Fresh Batch Weekly","Dhaka Delivery"].map(t=>(
          <span key={t} style={{ fontSize:"0.65rem", letterSpacing:"0.14em", textTransform:"uppercase", color:"rgba(242,240,232,0.85)", fontWeight:500 }}>✓ {t}</span>
        ))}
      </div>

      {/* PRODUCTS */}
      <div style={{ padding:"40px 28px 80px", maxWidth:1100, margin:"0 auto" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12, marginBottom:28 }}>
          <h2 style={{ fontFamily:"Georgia,serif", fontSize:"1.9rem", fontWeight:300, color:"#1A2E1A" }}>All Products</h2>
          <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
            {["all",...CATS].map(c=>(
              <button key={c} onClick={()=>setCat(c)} style={{ padding:"8px 16px", border:"1px solid rgba(74,124,89,0.25)", background:cat===c?"#1A2E1A":"#fff", color:cat===c?"#F2F0E8":"#6B7C6B", cursor:"pointer", fontSize:"0.65rem", letterSpacing:"0.14em", textTransform:"uppercase" }}>
                {c==="all"?"All":CAT_LABELS[c]}
              </button>
            ))}
          </div>
        </div>
        {visible.length===0 ? (
          <div style={{ textAlign:"center", padding:"60px 0", color:"#6B7C6B" }}><div style={{ fontSize:"2rem", marginBottom:10 }}>🌿</div><p>No products in this category right now.</p></div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:24 }}>
            {visible.map(p=>(
              <div key={p.id} style={{ background:"#fff", border:"1px solid rgba(168,197,160,0.2)" }}>
                <div style={{ height:200, background:p.image?"#fff":"linear-gradient(135deg,#1A2E1A,#2A3820)", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden" }}>
                  {p.badge&&<div style={{ position:"absolute", top:12, left:12, background:p.badge==="bestseller"?"#4A7C59":"#D4962A", color:"#fff", fontSize:"0.52rem", letterSpacing:"0.18em", textTransform:"uppercase", padding:"3px 9px", fontWeight:700 }}>{p.badge}</div>}
                  {p.image?<img src={p.image} alt={p.name} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>:<span style={{ fontSize:"3rem", opacity:0.18 }}>🌿</span>}
                </div>
                <div style={{ padding:"20px 20px 22px" }}>
                  <div style={{ marginBottom:8 }}><CatPill cat={p.category}/></div>
                  <div style={{ fontFamily:"Georgia,serif", fontSize:"1.15rem", color:"#1A2E1A", lineHeight:1.25, marginBottom:8 }}>{p.name}</div>
                  <p style={{ fontSize:"0.78rem", color:"#6B7C6B", lineHeight:1.65, marginBottom:14 }}>{p.desc}</p>
                  {p.tags&&(
                    <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:16 }}>
                      {p.tags.split(",").map(t=><span key={t} style={{ fontSize:"0.56rem", letterSpacing:"0.1em", textTransform:"uppercase", padding:"2px 8px", border:"1px solid rgba(168,197,160,0.4)", color:"#6B7C6B", borderRadius:20 }}>{t.trim()}</span>)}
                    </div>
                  )}
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <span style={{ fontFamily:"Georgia,serif", fontSize:"1.3rem", color:"#1A2E1A" }}>৳ {p.price.toLocaleString()} <span style={{ fontSize:"0.68rem", fontFamily:"Inter,sans-serif", color:"#6B7C6B" }}>/ {p.unit}</span></span>
                    <button onClick={()=>addToCart(p)} style={{ background:"#1A2E1A", color:"#F2F0E8", border:"none", padding:"9px 16px", cursor:"pointer", fontSize:"0.65rem", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase" }}>Add</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <footer style={{ background:"#1A2E1A", padding:"40px 28px 28px", textAlign:"center" }}>
        <div style={{ fontFamily:"Georgia,serif", fontSize:"1.1rem", color:"#F2F0E8", letterSpacing:"0.14em", marginBottom:8 }}>NUTRIVERO</div>
        <p style={{ fontSize:"0.72rem", color:"rgba(168,197,160,0.55)", lineHeight:1.7 }}>Homemade nutrition & lifestyle · Dhaka, Bangladesh</p>
        <p style={{ fontSize:"0.65rem", color:"rgba(168,197,160,0.3)", marginTop:20 }}>© 2026 Nutrivero. All rights reserved.</p>
      </footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════════════════════════════════════════
function Admin({ products, orders, onProductsChange, onOrdersChange, onLogout }) {
  const [tab, setTab] = useState("products");
  const [pView, setPView] = useState("list");
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [catFilter, setCatFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [oFilter, setOFilter] = useState("all");
  const [toast, setToast] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [imgErr, setImgErr] = useState("");
  const fileRef = useRef(null);

  const showToast = (msg,type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),2500); };

  const openAdd = () => { setForm(EMPTY_PRODUCT); setEditId(null); setImgErr(""); setPView("form"); };
  const openEdit = (p) => { setForm({...p}); setEditId(p.id); setImgErr(""); setPView("form"); };

  const handleImg = (e) => {
    const file=e.target.files[0]; if(!file) return;
    if(!file.type.startsWith("image/")) return setImgErr("Image file only (JPG/PNG/WEBP)");
    if(file.size>1.5*1024*1024) return setImgErr("Max 1.5MB");
    setImgErr("");
    const r=new FileReader();
    r.onload=()=>setForm(f=>({...f,image:r.result}));
    r.onerror=()=>setImgErr("Could not read file");
    r.readAsDataURL(file);
  };

  const saveProduct = () => {
    if(!form.name.trim()) return showToast("Product name required","error");
    if(!form.price||isNaN(form.price)) return showToast("Valid price required","error");
    let next;
    if(!editId){ next=[...products,{...form,id:Date.now(),price:Number(form.price)}]; showToast(`"${form.name}" added!`); }
    else { next=products.map(p=>p.id===editId?{...form,id:editId,price:Number(form.price)}:p); showToast(`"${form.name}" updated!`); }
    onProductsChange(next); setPView("list");
  };

  const deleteProduct=(id)=>{ const p=products.find(p=>p.id===id); onProductsChange(products.filter(p=>p.id!==id)); setDelConfirm(null); showToast(`"${p.name}" deleted`,"error"); };
  const toggleActive=(id)=>onProductsChange(products.map(p=>p.id===id?{...p,active:!p.active}:p));
  const updateOrderStatus=(id,status)=>{ onOrdersChange(orders.map(o=>o.id===id?{...o,status}:o)); showToast(`Order ${id} → ${STATUS_LABELS[status]}`); };
  const deleteOrder=(id)=>{ onOrdersChange(orders.filter(o=>o.id!==id)); setDelConfirm(null); showToast(`Order ${id} deleted`,"error"); };

  const filteredP=products.filter(p=>(catFilter==="all"||p.category===catFilter)&&p.name.toLowerCase().includes(search.toLowerCase()));
  const filteredO=orders.filter(o=>oFilter==="all"||o.status===oFilter).sort((a,b)=>b.date.localeCompare(a.date));
  const pendingCount=orders.filter(o=>o.status==="pending").length;

  if(pView==="form") return (
    <div style={{ fontFamily:"Inter,sans-serif", background:"#F2F0E8", minHeight:"100vh", paddingBottom:60 }}>
      <Toast toast={toast}/>
      <div style={{ background:"#1A2E1A", padding:"0 28px", height:60, display:"flex", alignItems:"center", gap:16 }}>
        <button onClick={()=>setPView("list")} style={{ background:"rgba(168,197,160,0.15)", border:"none", color:"#A8C5A0", cursor:"pointer", padding:"8px 14px", fontSize:"0.72rem" }}>← Back</button>
        <span style={{ color:"#F2F0E8", fontFamily:"Georgia,serif", fontSize:"1.05rem", letterSpacing:"0.1em" }}>{editId?"Edit Product":"Add New Product"}</span>
      </div>
      <div style={{ maxWidth:620, margin:"40px auto", padding:"0 20px" }}>
        <div style={{ background:"#fff", border:"1px solid rgba(74,124,89,0.15)", padding:"32px" }}>
          {/* Image */}
          <div style={{ marginBottom:24 }}>
            <div style={lbl}>Product Image</div>
            <div style={{ display:"flex", gap:16, alignItems:"center" }}>
              <div style={{ width:96, height:96, flexShrink:0, background:"#F2F0E8", border:"1px dashed rgba(74,124,89,0.3)", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
                {form.image?<img src={form.image} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="preview"/>:<span style={{ fontSize:"1.8rem", opacity:0.25 }}>🌿</span>}
              </div>
              <div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImg} style={{ display:"none" }}/>
                <button onClick={()=>fileRef.current.click()} style={{ background:"#1A2E1A", color:"#F2F0E8", border:"none", cursor:"pointer", padding:"9px 16px", fontSize:"0.65rem", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase" }}>Choose Image</button>
                {form.image&&<button onClick={()=>setForm(f=>({...f,image:""}))} style={{ marginLeft:8, background:"none", border:"1px solid rgba(192,57,43,0.3)", color:"#c0392b", cursor:"pointer", padding:"9px 12px", fontSize:"0.65rem" }}>Remove</button>}
                <div style={{ fontSize:"0.67rem", color:"#6B7C6B", marginTop:7 }}>JPG/PNG/WEBP · Max 1.5MB</div>
                {imgErr&&<div style={{ fontSize:"0.68rem", color:"#c0392b", marginTop:5 }}>{imgErr}</div>}
              </div>
            </div>
          </div>
          <div style={{ marginBottom:20 }}><div style={lbl}>Product Name *</div><input style={inp} placeholder="e.g. Banana Chips — Honey Glazed" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
            <div><div style={lbl}>Category *</div><select style={inp} value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>{CATS.map(c=><option key={c} value={c}>{CAT_LABELS[c]}</option>)}</select></div>
            <div><div style={lbl}>Badge</div><select style={inp} value={form.badge} onChange={e=>setForm(f=>({...f,badge:e.target.value}))}><option value="">None</option><option value="new">New</option><option value="bestseller">Bestseller</option></select></div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
            <div><div style={lbl}>Price (৳) *</div><input style={inp} type="number" placeholder="e.g. 350" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))}/></div>
            <div><div style={lbl}>Unit / Size</div><input style={inp} placeholder="e.g. 100g, each" value={form.unit} onChange={e=>setForm(f=>({...f,unit:e.target.value}))}/></div>
          </div>
          <div style={{ marginBottom:20 }}><div style={lbl}>Description</div><textarea style={{...inp,height:85,resize:"vertical"}} placeholder="Short description..." value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))}/></div>
          <div style={{ marginBottom:20 }}><div style={lbl}>Tags <span style={{ opacity:0.5, fontWeight:400 }}>(comma separated)</span></div><input style={inp} placeholder="e.g. Vegan, Gluten Free" value={form.tags} onChange={e=>setForm(f=>({...f,tags:e.target.value}))}/></div>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:28, padding:"13px 14px", background:"#F2F0E8", border:"1px solid rgba(74,124,89,0.15)" }}>
            <div onClick={()=>setForm(f=>({...f,active:!f.active}))} style={{ width:42, height:22, borderRadius:11, background:form.active?"#4A7C59":"#ccc", position:"relative", cursor:"pointer", transition:"background 0.2s", flexShrink:0 }}>
              <div style={{ width:16, height:16, borderRadius:"50%", background:"#fff", position:"absolute", top:3, left:form.active?23:3, transition:"left 0.2s" }}/>
            </div>
            <span style={{ fontSize:"0.78rem", fontWeight:600, color:"#1A2E1A" }}>{form.active?"Visible on store":"Hidden from store"}</span>
          </div>
          <div style={{ display:"flex", gap:12 }}>
            <button onClick={saveProduct} style={{ flex:1, background:"#1A2E1A", color:"#F2F0E8", border:"none", cursor:"pointer", padding:14, fontSize:"0.73rem", fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase" }}>{editId?"Save Changes":"Add Product"}</button>
            <button onClick={()=>setPView("list")} style={{ padding:"14px 22px", background:"none", border:"1px solid rgba(74,124,89,0.3)", cursor:"pointer", fontSize:"0.7rem", color:"#6B7C6B" }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily:"Inter,sans-serif", background:"#F2F0E8", minHeight:"100vh" }}>
      <Toast toast={toast}/>
      {delConfirm&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:"#fff", padding:28, maxWidth:360, width:"100%", borderTop:"4px solid #c0392b" }}>
            <div style={{ fontFamily:"Georgia,serif", fontSize:"1.1rem", color:"#1A2E1A", marginBottom:10 }}>{delConfirm.type==="order"?"Delete order?":"Delete product?"}</div>
            <div style={{ fontSize:"0.8rem", color:"#6B7C6B", marginBottom:22, lineHeight:1.6 }}>
              {delConfirm.type==="order"?`Order "${delConfirm.id}" will be permanently deleted.`:`"${products.find(p=>p.id===delConfirm.id)?.name}" will be removed.`}
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>delConfirm.type==="order"?deleteOrder(delConfirm.id):deleteProduct(delConfirm.id)} style={{ flex:1, background:"#c0392b", color:"#fff", border:"none", padding:12, cursor:"pointer", fontSize:"0.7rem", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase" }}>Yes, Delete</button>
              <button onClick={()=>setDelConfirm(null)} style={{ flex:1, background:"none", border:"1px solid #ccc", padding:12, cursor:"pointer", fontSize:"0.7rem", color:"#6B7C6B" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Nav */}
      <div style={{ background:"#1A2E1A", padding:"0 24px", height:58, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <svg width="18" height="18" viewBox="0 0 28 28" fill="none"><path d="M14 3C14 3 22 8 22 16C22 20.4 18.4 24 14 24C9.6 24 6 20.4 6 16C6 8 14 3 14 3Z" fill="#4A7C59"/><path d="M14 24L14 14" stroke="#A8C5A0" strokeWidth="1.5" strokeLinecap="round"/></svg>
          <span style={{ color:"#F2F0E8", fontFamily:"Georgia,serif", fontSize:"0.95rem", letterSpacing:"0.12em" }}>NUTRIVERO</span>
          <span style={{ color:"#4A7C59", fontSize:"0.58rem", letterSpacing:"0.18em", textTransform:"uppercase", marginLeft:4, borderLeft:"1px solid rgba(74,124,89,0.4)", paddingLeft:8 }}>Admin</span>
        </div>
        <div style={{ display:"flex", gap:3 }}>
          {[["products","Products"],["orders","Orders"]].map(([t,l])=>(
            <button key={t} onClick={()=>setTab(t)} style={{ background:tab===t?"#4A7C59":"rgba(168,197,160,0.1)", color:tab===t?"#fff":"#A8C5A0", border:"none", cursor:"pointer", padding:"8px 16px", fontSize:"0.65rem", letterSpacing:"0.14em", textTransform:"uppercase", fontWeight:600, display:"flex", alignItems:"center", gap:6 }}>
              {l}{t==="orders"&&pendingCount>0&&<span style={{ background:"#D4962A", color:"#fff", borderRadius:"50%", width:15, height:15, fontSize:"0.56rem", display:"flex", alignItems:"center", justifyContent:"center" }}>{pendingCount}</span>}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {tab==="products"&&<button onClick={openAdd} style={{ background:"#D4962A", color:"#fff", border:"none", cursor:"pointer", padding:"8px 18px", fontSize:"0.65rem", fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase" }}>+ Add</button>}
          <button onClick={onLogout} style={{ background:"rgba(168,197,160,0.12)", color:"#A8C5A0", border:"none", cursor:"pointer", padding:"8px 14px", fontSize:"0.62rem", letterSpacing:"0.1em" }}>Logout</button>
        </div>
      </div>

      <div style={{ maxWidth:960, margin:"0 auto", padding:"28px 20px" }}>
        {tab==="products"&&(
          <>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:28 }}>
              {[{l:"Total",v:products.length,c:"#1A2E1A"},{l:"Visible",v:products.filter(p=>p.active).length,c:"#4A7C59"},{l:"Hidden",v:products.filter(p=>!p.active).length,c:"#999"}].map(s=>(
                <div key={s.l} style={{ background:"#fff", border:"1px solid rgba(74,124,89,0.15)", padding:"18px 20px" }}>
                  <div style={{ fontFamily:"Georgia,serif", fontSize:"1.9rem", color:s.c, lineHeight:1 }}>{s.v}</div>
                  <div style={{ fontSize:"0.62rem", letterSpacing:"0.16em", textTransform:"uppercase", color:"#6B7C6B", marginTop:5 }}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap" }}>
              <input style={{ flex:1, minWidth:180, padding:"9px 13px", border:"1px solid rgba(74,124,89,0.25)", background:"#fff", fontSize:"0.82rem", color:"#1A2E1A", outline:"none" }} placeholder="🔍  Search..." value={search} onChange={e=>setSearch(e.target.value)}/>
              <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
                {["all",...CATS].map(c=>(
                  <button key={c} onClick={()=>setCatFilter(c)} style={{ padding:"8px 14px", border:"1px solid rgba(74,124,89,0.25)", background:catFilter===c?"#1A2E1A":"#fff", color:catFilter===c?"#F2F0E8":"#6B7C6B", cursor:"pointer", fontSize:"0.62rem", letterSpacing:"0.14em", textTransform:"uppercase" }}>
                    {c==="all"?"All":CAT_LABELS[c]}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {filteredP.length===0?(
                <div style={{ textAlign:"center", padding:"48px 0", color:"#6B7C6B", fontSize:"0.82rem" }}><div style={{ fontSize:"2rem", marginBottom:10 }}>🌿</div>No products found. <button onClick={openAdd} style={{ background:"none", border:"none", color:"#4A7C59", cursor:"pointer", textDecoration:"underline" }}>Add one →</button></div>
              ):filteredP.map(p=>(
                <div key={p.id} style={{ background:"#fff", border:`1px solid ${p.active?"rgba(74,124,89,0.18)":"rgba(0,0,0,0.07)"}`, padding:"13px 18px", display:"flex", alignItems:"center", gap:14, flexWrap:"wrap", opacity:p.active?1:0.55 }}>
                  <div style={{ width:46, height:46, flexShrink:0, background:"#F2F0E8", border:"1px solid rgba(74,124,89,0.12)", overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {p.image?<img src={p.image} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt={p.name}/>:<span style={{ fontSize:"1.1rem", opacity:0.25 }}>🌿</span>}
                  </div>
                  <div style={{ flex:1, minWidth:160 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap", marginBottom:4 }}>
                      <span style={{ fontSize:"0.88rem", fontWeight:600, color:"#1A2E1A" }}>{p.name}</span>
                      <BadgePill badge={p.badge}/>
                      {!p.active&&<span style={{ fontSize:"0.55rem", letterSpacing:"0.14em", color:"#999", textTransform:"uppercase", background:"#f0f0f0", padding:"2px 6px" }}>Hidden</span>}
                    </div>
                    <div style={{ display:"flex", gap:7, alignItems:"center" }}><CatPill cat={p.category}/><span style={{ fontSize:"0.7rem", color:"#6B7C6B" }}>৳ {p.price.toLocaleString()} / {p.unit}</span></div>
                  </div>
                  <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                    <button onClick={()=>toggleActive(p.id)} style={{ background:"none", border:"1px solid rgba(74,124,89,0.25)", cursor:"pointer", padding:"6px 11px", fontSize:"0.6rem", letterSpacing:"0.1em", color:p.active?"#4A7C59":"#999", textTransform:"uppercase" }}>{p.active?"👁 Visible":"🚫 Hidden"}</button>
                    <button onClick={()=>openEdit(p)} style={{ background:"#1A2E1A", color:"#F2F0E8", border:"none", cursor:"pointer", padding:"7px 14px", fontSize:"0.6rem", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase" }}>Edit</button>
                    <button onClick={()=>setDelConfirm({type:"product",id:p.id})} style={{ background:"none", border:"1px solid rgba(192,57,43,0.3)", cursor:"pointer", padding:"7px 12px", fontSize:"0.6rem", color:"#c0392b" }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab==="orders"&&(
          <>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:28 }}>
              {[{l:"Total Orders",v:orders.length,c:"#1A2E1A"},{l:"Pending",v:orders.filter(o=>o.status==="pending").length,c:"#D4962A"},{l:"Revenue",v:`৳ ${orders.filter(o=>o.status!=="cancelled").reduce((s,o)=>s+o.total,0).toLocaleString()}`,c:"#4A7C59"}].map(s=>(
                <div key={s.l} style={{ background:"#fff", border:"1px solid rgba(74,124,89,0.15)", padding:"18px 20px" }}>
                  <div style={{ fontFamily:"Georgia,serif", fontSize:"1.5rem", color:s.c, lineHeight:1 }}>{s.v}</div>
                  <div style={{ fontSize:"0.62rem", letterSpacing:"0.16em", textTransform:"uppercase", color:"#6B7C6B", marginTop:5 }}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:3, marginBottom:20, flexWrap:"wrap" }}>
              {["all",...ORDER_STATUSES].map(s=>(
                <button key={s} onClick={()=>setOFilter(s)} style={{ padding:"8px 14px", border:"1px solid rgba(74,124,89,0.25)", background:oFilter===s?"#1A2E1A":"#fff", color:oFilter===s?"#F2F0E8":"#6B7C6B", cursor:"pointer", fontSize:"0.62rem", letterSpacing:"0.14em", textTransform:"uppercase" }}>
                  {s==="all"?"All":STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            {filteredO.length===0?(
              <div style={{ textAlign:"center", padding:"48px 0", color:"#6B7C6B" }}><div style={{ fontSize:"2rem", marginBottom:10 }}>📦</div><p style={{ fontSize:"0.82rem" }}>No orders yet.</p></div>
            ):(
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {filteredO.map(o=>(
                  <div key={o.id} style={{ background:"#fff", border:"1px solid rgba(74,124,89,0.15)" }}>
                    <div onClick={()=>setExpandedOrder(expandedOrder===o.id?null:o.id)} style={{ padding:"14px 18px", display:"flex", alignItems:"center", gap:14, flexWrap:"wrap", cursor:"pointer" }}>
                      <span style={{ fontFamily:"Georgia,serif", fontSize:"0.95rem", color:"#1A2E1A", minWidth:80 }}>{o.id}</span>
                      <div style={{ flex:1, minWidth:140 }}>
                        <div style={{ fontSize:"0.85rem", fontWeight:600, color:"#1A2E1A" }}>{o.customer}</div>
                        <div style={{ fontSize:"0.68rem", color:"#6B7C6B" }}>{o.phone} · {o.date}</div>
                      </div>
                      <div style={{ fontFamily:"Georgia,serif", fontSize:"1.05rem", color:"#1A2E1A" }}>৳ {o.total.toLocaleString()}</div>
                      <span style={{ background:STATUS_COLORS[o.status]+"1E", color:STATUS_COLORS[o.status], fontSize:"0.58rem", letterSpacing:"0.14em", textTransform:"uppercase", padding:"4px 10px", fontWeight:700, border:`1px solid ${STATUS_COLORS[o.status]}33` }}>{STATUS_LABELS[o.status]}</span>
                      <span style={{ color:"#6B7C6B", fontSize:"0.75rem" }}>{expandedOrder===o.id?"▲":"▼"}</span>
                    </div>
                    {expandedOrder===o.id&&(
                      <div style={{ borderTop:"1px solid rgba(74,124,89,0.1)", padding:"18px 18px", background:"#FAFAF8" }}>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:16 }}>
                          <div><div style={lbl}>Address</div><div style={{ fontSize:"0.82rem", color:"#1A2E1A", lineHeight:1.6 }}>{o.address}</div></div>
                          <div><div style={lbl}>Notes</div><div style={{ fontSize:"0.82rem", color:"#1A2E1A" }}>{o.notes||"—"}</div></div>
                        </div>
                        <div style={lbl}>Items</div>
                        <div style={{ marginBottom:16 }}>
                          {o.items.map((item,i)=>(
                            <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:"0.8rem", color:"#1A2E1A", padding:"5px 0", borderBottom:i<o.items.length-1?"1px solid rgba(74,124,89,0.09)":"none" }}>
                              <span>{item.name} <span style={{ color:"#6B7C6B" }}>×{item.qty}</span></span>
                              <span>৳ {(item.price*item.qty).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <div style={lbl}>Status</div>
                            <select value={o.status} onChange={e=>updateOrderStatus(o.id,e.target.value)} style={{...inp,width:"auto",padding:"7px 11px",fontSize:"0.75rem"}}>
                              {ORDER_STATUSES.map(s=><option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                            </select>
                          </div>
                          <button onClick={()=>setDelConfirm({type:"order",id:o.id})} style={{ background:"none", border:"1px solid rgba(192,57,43,0.3)", cursor:"pointer", padding:"8px 14px", fontSize:"0.6rem", color:"#c0392b", letterSpacing:"0.1em", textTransform:"uppercase" }}>Delete</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════════════════════════
function Login({ onLogin }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const submit = () => {
    if(pw===ADMIN_PASSWORD){ onLogin(); setErr(""); }
    else { setErr("Wrong password. Try again."); }
  };
  return (
    <div style={{ fontFamily:"Inter,sans-serif", background:"#1A2E1A", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ background:"#fff", padding:"40px 36px", maxWidth:360, width:"100%", textAlign:"center" }}>
        <svg width="36" height="36" viewBox="0 0 28 28" fill="none" style={{ margin:"0 auto 16px" }}><path d="M14 3C14 3 22 8 22 16C22 20.4 18.4 24 14 24C9.6 24 6 20.4 6 16C6 8 14 3 14 3Z" fill="#4A7C59"/><path d="M14 24L14 14" stroke="#A8C5A0" strokeWidth="1.5" strokeLinecap="round"/></svg>
        <div style={{ fontFamily:"Georgia,serif", fontSize:"1.3rem", color:"#1A2E1A", letterSpacing:"0.12em", marginBottom:6 }}>NUTRIVERO</div>
        <div style={{ fontSize:"0.65rem", letterSpacing:"0.2em", textTransform:"uppercase", color:"#6B7C6B", marginBottom:32 }}>Admin Login</div>
        <input
          type="password" placeholder="Enter admin password"
          value={pw} onChange={e=>{setPw(e.target.value);setErr("");}}
          onKeyDown={e=>e.key==="Enter"&&submit()}
          style={{ ...inp, textAlign:"center", marginBottom:12 }}
        />
        {err&&<div style={{ fontSize:"0.72rem", color:"#c0392b", marginBottom:12 }}>{err}</div>}
        <button onClick={submit} style={{ width:"100%", background:"#1A2E1A", color:"#F2F0E8", border:"none", padding:14, cursor:"pointer", fontSize:"0.75rem", fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase" }}>Login</button>
        <p style={{ fontSize:"0.65rem", color:"#6B7C6B", marginTop:20, lineHeight:1.6 }}>Password: <code style={{ background:"#F2F0E8", padding:"2px 6px", color:"#1A2E1A" }}>nutrivero2026</code></p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [mode, setMode] = useState("store");
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [products, setProducts] = useState(null);
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    const p = lsGet("nv-products", null);
    const o = lsGet("nv-orders", []);
    setProducts(p || DEFAULT_PRODUCTS);
    setOrders(o);
    if (!p) lsSet("nv-products", DEFAULT_PRODUCTS);
  }, []);

  const handleProductsChange = useCallback((next) => { setProducts(next); lsSet("nv-products", next); }, []);
  const handleOrdersChange = useCallback((next) => { setOrders(next); lsSet("nv-orders", next); }, []);
  const handleOrderPlaced = useCallback((order) => {
    setOrders(prev => { const next=[...prev, order]; lsSet("nv-orders", next); return next; });
  }, []);

  if (!products || !orders) return (
    <div style={{ fontFamily:"Inter,sans-serif", background:"#F2F0E8", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center", color:"#6B7C6B" }}><div style={{ fontSize:"2.4rem", marginBottom:12 }}>🌿</div><div style={{ fontSize:"0.82rem" }}>Loading…</div></div>
    </div>
  );

  return (
    <div>
      {/* Mode switcher — bottom left */}
      <div style={{ position:"fixed", bottom:20, left:20, zIndex:999, display:"flex", gap:2, boxShadow:"0 4px 20px rgba(0,0,0,0.2)" }}>
        <button onClick={()=>setMode("store")} style={{ background:mode==="store"?"#1A2E1A":"rgba(26,46,26,0.75)", color:"#F2F0E8", border:"none", cursor:"pointer", padding:"9px 14px", fontSize:"0.6rem", fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", opacity:mode==="store"?1:0.8 }}>🛒 Store</button>
        <button onClick={()=>setMode("admin")} style={{ background:mode==="admin"?"#D4962A":"rgba(212,150,42,0.75)", color:"#fff", border:"none", cursor:"pointer", padding:"9px 14px", fontSize:"0.6rem", fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", opacity:mode==="admin"?1:0.8 }}>⚙️ Admin</button>
      </div>

      {mode==="store" && <Store products={products} onOrderPlaced={handleOrderPlaced}/>}
      {mode==="admin" && !adminAuthed && <Login onLogin={()=>setAdminAuthed(true)}/>}
      {mode==="admin" && adminAuthed && <Admin products={products} orders={orders} onProductsChange={handleProductsChange} onOrdersChange={handleOrdersChange} onLogout={()=>{setAdminAuthed(false);setMode("store");}}/>}
    </div>
  );
}
