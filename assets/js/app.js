(function(){
  const D=window.TROTRO_DATA||{settings:{siteName:"TrotroMall",currency:"GH₵"},categories:[],slides:[],ads:[],listings:[]};
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const state={saved:new Set(JSON.parse(localStorage.getItem("trotroSaved")||"[]")),data:{...D,listings:[]},user:null};
  window.TROTRO=state;
  const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  const saveSaved=()=>localStorage.setItem("trotroSaved",JSON.stringify([...state.saved]));
  const client=()=>window.TROTRO_SUPABASE?.ready?window.TROTRO_SUPABASE.client:null;
  const authName=email=>String(email||"").split("@")[0].replace(/[._-]+/g," ").split(/\s+/).filter(Boolean).map(w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join(" ")||"User";
  const isFeatured=x=>Boolean(x.is_featured && x.featured_until && new Date(x.featured_until)>new Date());
  function normalize(row,images=[]){
    const urls=images.length?images.map(i=>i.url||i.public_url).filter(Boolean):(Array.isArray(row.images)?row.images:[]);
    return {...row,image:urls[0]||"",images:urls,seller:row.seller_name||row.seller||"Seller",phone:row.seller_phone||"",condition:row.condition||"Used"};
  }
  async function loadListings(){
    const c=client(); if(!c)return false;
    return (async()=>{
      const {data,error}=await c.from("listings").select("*").eq("status","active").order("created_at",{ascending:false});
      if(error){console.error("TrotroMall listings:",error);state.listingsError=error.message;renderAll();return false;}
      state.listingsError=null;
      const rows=data||[];
      const ids=rows.map(x=>x.id);
      let imageRows=[];
      if(ids.length){
        const r=await c.from("listing_images").select("listing_id,storage_path,position").in("listing_id",ids).order("position",{ascending:true});
        if(!r.error) imageRows=r.data||[];
      }
      const storageUrl=value=>{
        if(!value)return "";
        let p=value;
        if(typeof p==="object")p=p.url||p.src||p.publicUrl||p.public_url||p.storage_path||p.path||p.image_url||"";
        if(!p)return "";
        p=String(p).trim();
        if(!p)return "";
        if(/^(https?:|data:|blob:)/i.test(p)||p.startsWith("/")||p.startsWith("assets/"))return p;
        if(p.startsWith("public/"))p=p.slice(7);if(p.startsWith("listing-photos/"))p=p.slice(14);
        try{return c.storage.from("listing-photos").getPublicUrl(p)?.data?.publicUrl||""}catch(_){return ""}
      };
      const grouped={};
      imageRows.forEach(i=>{
        const url=storageUrl(i.storage_path);
        if(url)(grouped[i.listing_id] ||= []).push({url,position:i.position??0});
      });
      state.data.listings=rows.map(x=>{
        const rowImages=(grouped[x.id]||[]).sort((a,b)=>a.position-b.position).map(i=>i.url);
        let rawLegacy=x.images;
        if(typeof rawLegacy==="string"){
          try{rawLegacy=JSON.parse(rawLegacy)}catch(_){rawLegacy=rawLegacy.split(/[,\r\n]/).map(s=>s.trim()).filter(Boolean)}
        }
        if(!Array.isArray(rawLegacy))rawLegacy=rawLegacy?[rawLegacy]:[];
        const legacy=rawLegacy.map(storageUrl).filter(Boolean);
        const images=[...new Set([...rowImages,...legacy])];
        return normalize({...x,images},images);
      });
      renderAll();
      return true;
    })();
  }
  function sortedListings(){return [...state.data.listings].sort((a,b)=>Number(isFeatured(b))-Number(isFeatured(a))||new Date(b.created_at||0)-new Date(a.created_at||0));}
  const logoPath=location.pathname.includes("/admin/")?"../assets/images/logo.png":"assets/images/logo.png";
  function logo(){return `<a href="${location.pathname.includes("/admin/")?"../index.html":"index.html"}" aria-label="TrotroMall home"><img class="logo" src="${logoPath}" alt="TrotroMall Ghana classifieds"></a>`;}
  function header(){
    const cats=state.data.categories||[];
    const signed=state.user;
    const display=signed?(String(signed.user_metadata?.full_name||signed.user_metadata?.name||"").trim()||authName(signed.email)):"Sign in";
    const avatar=signed?display.split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase():"";
    return `<div class="safety-banner">Buy safely: meet in public, verify goods and then make payment</div><header class="topbar"><div class="container topbar-inner">${logo()}<div class="top-actions"><a class="auth-user" href="${signed?"account.html":"login.html"}">${signed?`<span class="auth-avatar">${esc(avatar)}</span><span class="auth-name">${esc(display)}</span>`:"Sign in"}</a><a class="biz-link" href="business.html">For businesses</a><a class="add-btn" href="add-listing.html"><span aria-hidden="true">＋</span> Sell</a></div></div></header>
    <div class="searchbar"><div class="container"><form class="search-form" id="globalSearch"><input name="q" autocomplete="off" placeholder="What are you looking for?" aria-label="Search TrotroMall"><select name="category" aria-label="Category"><option value="">All categories</option>${cats.map(c=>`<option>${esc(c.name)}</option>`).join("")}</select><select name="location" aria-label="Location"><option value="">All Ghana</option><option>Accra</option><option>Kumasi</option><option>Tema</option><option>Takoradi</option><option>Cape Coast</option><option>Tamale</option><option>Sunyani</option><option>Ho</option><option>Koforidua</option><option>Bolgatanga</option><option>Wa</option></select><button type="submit">Search</button></form></div></div>
    <nav class="category-strip" aria-label="Main categories"><div class="container">${cats.slice(0,10).map(c=>`<a href="search.html?category=${encodeURIComponent(c.name)}">${esc(c.name)}</a>`).join("")}<a href="search.html">All categories</a></div></nav>
    <nav class="mobile-bottom-nav" aria-label="Mobile navigation"><a href="index.html">Home</a><a href="search.html">Search</a><a href="add-listing.html" class="mobile-sell">Sell</a><a href="account.html">Account</a></nav>`;
  }
  function footer(){return `<footer class="footer"><div class="container footer-inner"><div><h3>${esc(state.data.settings.siteName||"TrotroMall")}</h3><p>${esc(state.data.settings.tagline||"Everything you buy. Everything you sell.")}</p><p>Buy and sell across Ghana with local listings for people and businesses.</p></div><div><h3>Marketplace</h3><a href="search.html">Browse listings</a><a href="add-listing.html">Sell</a><a href="account.html">My account</a></div><div><h3>Business</h3><a href="business.html">Business accounts</a><a href="advertise.html">Featured listings</a></div><div><h3>Help</h3><a href="help.html">Help centre</a><a href="safety.html">Safety</a><a href="terms.html">Terms</a><a href="privacy.html">Privacy</a></div></div><div class="copyright"><div class="container">© ${new Date().getFullYear()} TrotroMall. All rights reserved.</div></div></footer>`;}
  function renderHeaderFooter(){const h=$("#siteHeader");if(h)h.innerHTML=header();const f=$("#siteFooter");if(f)f.innerHTML=footer();const form=$("#globalSearch");form?.addEventListener("submit",e=>{e.preventDefault();const fd=new FormData(form);location.href=`search.html?q=${encodeURIComponent(fd.get("q")||"")}&category=${encodeURIComponent(fd.get("category")||"")}&location=${encodeURIComponent(fd.get("location")||"")}`;});}
  function card(x){const saved=state.saved.has(x.id),featured=isFeatured(x),imgs=x.images?.length?x.images:[x.image];return `<article class="card ${featured?"is-featured":""}">${featured?'<span class="featured-badge">Featured</span>':""}<button class="watch ${saved?"saved":""}" data-save="${esc(x.id)}" aria-label="${saved?"Remove from saved":"Save listing"}">${saved?"♥":"♡"}</button><a href="listing.html?id=${encodeURIComponent(x.id)}"><div class="card-img"><img loading="lazy" data-card-photo="${esc(x.id)}" src="${esc(imgs[0]||"")}" alt="${esc(x.title)} in ${esc(x.location)}" onerror="this.onerror=null;this.src=\'assets/images/logo.png\';">${imgs.length>1?`<button type="button" class="card-photo-arrow prev" data-card-step="-1" data-card-id="${esc(x.id)}" aria-label="Previous photo">‹</button><button type="button" class="card-photo-arrow next" data-card-step="1" data-card-id="${esc(x.id)}" aria-label="Next photo">›</button><span class="card-photo-count" data-card-count="${esc(x.id)}">1 / ${imgs.length}</span>`:""}</div><div class="card-body"><div class="card-title">${esc(x.title)}</div><div class="price">${esc(state.data.settings.currency||"GH₵")} ${esc(x.price)}</div><div class="meta"><span>${esc(x.location)}</span><span>${esc(x.category)}</span></div></div></a></article>`;}
  function bindSaved(){$$("[data-card-step]").forEach(b=>b.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();const id=b.dataset.cardId,x=state.data.listings.find(v=>String(v.id)===String(id));if(!x)return;const imgs=x.images?.length?x.images:[x.image];const im=$(`[data-card-photo="${id}"]`),counter=$(`[data-card-count="${id}"]`);if(!im||!imgs.length)return;let n=Number(im.dataset.photoIndex||0);n=(n+Number(b.dataset.cardStep)+imgs.length)%imgs.length;im.dataset.photoIndex=String(n);im.src=imgs[n];if(counter)counter.textContent=`${n+1} / ${imgs.length}`;}));$$("[data-save]").forEach(b=>b.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();const id=b.dataset.save;state.saved.has(id)?state.saved.delete(id):state.saved.add(id);saveSaved();b.classList.toggle("saved");b.textContent=state.saved.has(id)?"♥":"♡";}));}
  function home(){const slides=state.data.slides||[],list=sortedListings();const hero=$("#homeHero");if(!hero)return;hero.innerHTML=slides.map((s,i)=>`<div class="hero-slide ${i===0?"active":""}" style="background-image:url('${esc(s.image)}')"><div class="hero-copy"><h1>${esc(s.title)}</h1><p>${esc(s.text)}</p><a class="primary-btn" href="search.html">${esc(s.button)}</a></div></div>`).join("")+`<div class="slider-controls">${slides.map((_,i)=>`<button aria-label="Show slide ${i+1}" class="${i===0?"active":""}" data-slide="${i}"></button>`).join("")}</div>`;let idx=0;const els=$$(".hero-slide",hero),dots=$$(".slider-controls button",hero);dots.forEach((d,i)=>d.onclick=()=>{idx=i;els.forEach((e,j)=>e.classList.toggle("active",j===idx));dots.forEach((e,j)=>e.classList.toggle("active",j===idx));});if(els.length>1){if(window.__trotroHeroTimer)clearInterval(window.__trotroHeroTimer);window.__trotroHeroTimer=setInterval(()=>dots[(idx+1)%els.length]?.click(),5000);}$("#deals").innerHTML=list.slice(0,8).map(card).join("")||`<div class="empty">${state.listingsError?`Listings could not load: ${esc(state.listingsError)}`:"No active listings yet."}</div>`;$("#latest").innerHTML=list.slice(0,12).map(card).join("")||'<div class="empty">No active listings yet.</div>';$("#homeCategories").innerHTML=state.data.categories.map(c=>`<div class="category-group"><h3>${esc(c.name)}</h3>${c.items.slice(0,8).map(x=>`<a href="search.html?category=${encodeURIComponent(c.name)}&sub=${encodeURIComponent(x)}">${esc(x)}</a>`).join("")}</div>`).join("");bindSaved();}
  function searchPage(){const p=new URLSearchParams(location.search),q=(p.get("q")||"").toLowerCase(),cat=p.get("category")||"",loc=p.get("location")||"",sub=(p.get("sub")||"").toLowerCase();let list=sortedListings().filter(x=>(!q||`${x.title} ${x.category} ${x.seller} ${x.location}`.toLowerCase().includes(q))&&(!cat||x.category===cat)&&(!loc||x.location===loc)&&(!sub||`${x.title} ${x.description||""}`.toLowerCase().includes(sub)));$("#resultCount").textContent=`${list.length} listings`;$("#categoryOptions").innerHTML='<option value="">All</option>'+state.data.categories.map(c=>`<option ${c.name===cat?"selected":""}>${esc(c.name)}</option>`).join("");$("#results").innerHTML=list.length?list.map(card).join(""):`<div class="empty panel" style="grid-column:1/-1">${state.listingsError?`Listings could not load: ${esc(state.listingsError)}`:"No listings match your search."}</div>`;bindSaved();$("#filterForm")?.addEventListener("submit",e=>{e.preventDefault();const fd=new FormData(e.currentTarget);location.href=`search.html?q=${encodeURIComponent(fd.get("q")||"")}&category=${encodeURIComponent(fd.get("category")||"")}&location=${encodeURIComponent(fd.get("location")||"")}`;});}
  async function listingPage(){const id=new URLSearchParams(location.search).get("id"),c=client();if(!c||!id)return;const {data:x,error}=await c.from("listings").select("*").eq("id",id).eq("status","active").single();if(error||!x){$("#listing").innerHTML='<div class="empty panel">Listing not found.</div>';return;}const ir=await c.from("listing_images").select("storage_path,position").eq("listing_id",id).order("position",{ascending:true});const imageRows=(ir.data||[]).sort((a,b)=>(a.position??0)-(b.position??0));const storageUrl=p=>{if(!p)return "";if(/^https?:\/\//i.test(p))return p;return c.storage.from("listing-photos").getPublicUrl(p).data.publicUrl;};const galleryFromRows=imageRows.map(i=>storageUrl(i.storage_path)).filter(Boolean);const legacy=Array.isArray(x.images)?x.images.map(storageUrl).filter(Boolean):[];const imgs=[...new Set([...galleryFromRows,...legacy])];const item=normalize({...x,images:imgs},imgs);let pos=0;const featured=isFeatured(item);document.title=`${item.title} in ${item.location} | TrotroMall`;$("#listing").innerHTML=`<div><div class="breadcrumbs">Home / ${esc(item.category)} / ${esc(item.title)}</div><div class="gallery"><div class="gallery-main"><img id="mainPhoto" src="${esc(item.images[0])}" alt="${esc(item.title)}" onerror="this.onerror=null;this.src=\'assets/images/logo.png\';"></div><div class="gallery-controls"><button type="button" id="prevPhoto">‹</button><span id="photoPosition">1 / ${item.images.length}</span><button type="button" id="nextPhoto">›</button></div><div class="thumbs">${item.images.map((u,i)=>`<button class="thumb ${i===0?"active":""}" data-pos="${i}"><img src="${esc(u)}" alt="Photo ${i+1}"></button>`).join("")}</div></div><div class="detail-panel">${featured?'<div class="featured-inline">Featured listing</div>':""}<h1 class="detail-title">${esc(item.title)}</h1><div class="detail-meta">${esc(item.location)} · Listing #${esc(item.id)}</div><div class="detail-price">GH₵ ${esc(item.price)}</div><div class="specs"><div class="spec"><span>Category</span><strong>${esc(item.category)}</strong></div><div class="spec"><span>Seller</span><strong>${esc(item.seller)}</strong></div><div class="spec"><span>Condition</span><strong>${esc(item.condition)}</strong></div></div><h2 class="detail-heading">Description</h2><p>${esc(item.description||"Contact the seller for details.")}</p></div></div><aside><div class="seller-card"><div class="seller-name">${esc(item.seller)}</div><div class="detail-meta seller-location">${esc(item.location)}</div><a class="contact-btn primary" href="contact-seller.html?listing_id=${encodeURIComponent(item.id)}">Contact seller</a><button class="contact-btn" id="showPhone">Show phone number</button><div id="sellerPhone" class="seller-phone" hidden>${esc(item.phone||"Phone number not provided by seller")}</div><button class="contact-btn" data-save="${esc(item.id)}">${state.saved.has(item.id)?"♥ Saved":"♡ Save listing"}</button>${state.user&&state.user.id===x.user_id?'<a class="action dashboard-return-link" href="account.html">← My dashboard</a>':""}<div class="notice safety-note">Safety tip: meet in public, inspect the item and never share OTPs, passwords or card PINs.</div></div></aside>`;const set=i=>{pos=(i+item.images.length)%item.images.length;$("#mainPhoto").src=item.images[pos];$("#photoPosition").textContent=`${pos+1} / ${item.images.length}`;$$(".thumb").forEach((b,j)=>b.classList.toggle("active",j===pos));};$("#prevPhoto").onclick=()=>set(pos-1);$("#nextPhoto").onclick=()=>set(pos+1);$$(".thumb").forEach(b=>b.onclick=()=>set(+b.dataset.pos));$("#showPhone").onclick=()=>$("#sellerPhone").toggleAttribute("hidden");bindSaved();}
  function requireAuth(){if(state.user)return true;location.href="login.html?next="+encodeURIComponent("add-listing.html");return false;}
  function addListing(){
    const form=$("#addForm"); if(!form)return;
    const picker=$("#photos"),drop=$("#photoDrop"),preview=$("#photoPreview"); let photos=[];
    const render=()=>preview.innerHTML=photos.map((f,i)=>{
      const url=URL.createObjectURL(f);
      return `<span class="photo-chip photo-preview-chip"><img src="${esc(url)}" alt=""><span>${i+1}. ${esc(f.name)}</span></span>`;
    }).join("");
    const accept=files=>{
      photos=[...photos,...[...files].filter(f=>/^image\/(jpeg|png|webp)$/i.test(f.type)).filter(f=>f.size<=8*1024*1024)].slice(0,20);
      picker.value=""; render();
    };
    picker?.addEventListener("change",()=>accept(picker.files));
    drop?.addEventListener("click",e=>{if(e.target!==picker)picker?.click()});
    drop?.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();picker?.click()}});
    drop?.setAttribute("role","button"); drop?.setAttribute("tabindex","0");
    drop?.addEventListener("dragover",e=>{e.preventDefault();drop.classList.add("dragover")});
    drop?.addEventListener("dragleave",()=>drop.classList.remove("dragover"));
    drop?.addEventListener("drop",e=>{e.preventDefault();drop.classList.remove("dragover");accept(e.dataTransfer.files)});
    form.addEventListener("submit",async e=>{
      e.preventDefault(); const msg=$("#addMessage");
      if(!requireAuth())return;
      if(!photos.length){msg.textContent="Please upload at least one photo.";return;}
      const c=client(); if(!c){msg.textContent="Marketplace connection is unavailable.";return;}
      const fd=new FormData(form),submit=form.querySelector("button[type=submit]")||form.querySelector("button");
      submit.disabled=true; msg.textContent="Publishing…"; let listingId=null,uploadedPaths=[];
      try{
        const {data:row,error}=await c.from("listings").insert({
          user_id:state.user.id,title:String(fd.get("title")).trim(),description:String(fd.get("description")||"").trim(),
          price:Number(String(fd.get("price")).replace(/,/g,"")),category:fd.get("category"),location:fd.get("location"),
          condition:fd.get("condition")||"Used",seller_phone:String(fd.get("seller_phone")||"").trim()||null,status:"active",images:[]
        }).select("id").single();
        if(error)throw error; listingId=row.id;
        const urls=[];
        for(let i=0;i<photos.length;i++){
          const f=photos[i],ext=(f.name.split(".").pop()||"jpg").toLowerCase();
          const path=`${state.user.id}/${listingId}/${crypto.randomUUID()}.${ext}`;
          const up=await c.storage.from("listing-photos").upload(path,f,{contentType:f.type,upsert:false});
          if(up.error)throw up.error;
          uploadedPaths.push(path);
          const publicUrl=c.storage.from("listing-photos").getPublicUrl(path)?.data?.publicUrl||"";
          if(publicUrl)urls.push(publicUrl);
          const ins=await c.from("listing_images").insert({listing_id:listingId,user_id:state.user.id,storage_path:path,position:i});
          if(ins.error)console.warn("listing_images row could not be created; listing will still retain its image URL.",ins.error);
        }
        if(!urls.length)throw new Error("Photos could not be published. Check that the listing-photos storage bucket is public and its upload policy allows signed-in sellers.");
        // Keep the listing active even if the auxiliary image-array update is rejected by RLS.
        // The listing_images rows + public storage URLs are the canonical image fallback used by
        // the homepage, listings page, detail page and seller dashboard.
        const up=await c.from("listings").update({images:urls}).eq("id",listingId).eq("user_id",state.user.id).select("id,status,images").single();
        if(up.error) console.warn("Listing image-array update failed; listing remains published and image rows will be used.",up.error);
        const verify=await c.from("listings").select("id,status").eq("id",listingId).eq("user_id",state.user.id).eq("status","active").maybeSingle();
        if(verify.error||!verify.data) throw new Error("The ad was saved but could not be confirmed as publicly active. Check the listings table and its status/RLS policies.");
        await loadListings();
        msg.textContent="Listing published successfully. Opening your live ad…";
        setTimeout(()=>location.href="listing.html?id="+encodeURIComponent(listingId),800);
      }catch(err){
        // Only roll back when the listing itself or the required photo upload failed.
        // Do not delete a successfully-created listing because an optional image metadata
        // write failed: that was the cause of previously disappearing published ads.
        if(listingId && !uploadedPaths.length){
          await c.from("listings").delete().eq("id",listingId).eq("user_id",state.user.id);
        }
        if(uploadedPaths.length && listingId && /storage|upload|Photo/i.test(String(err.message||""))){
          try{await c.from("listing_images").delete().eq("listing_id",listingId).eq("user_id",state.user.id)}catch(_){}
          try{await c.from("listings").delete().eq("id",listingId).eq("user_id",state.user.id)}catch(_){}
          try{await c.storage.from("listing-photos").remove(uploadedPaths)}catch(_){}
        }
        msg.textContent=err.message||"Could not publish listing."; console.error(err);
      }finally{submit.disabled=false}
    });
  }
  let accountRenderId=0;
  async function account(){
    const renderId=++accountRenderId;
    const box=$("#accountContent");
    if(!box)return;
    if(!state.user){location.href="login.html?next=account.html";return;}
    const c=client();
    if(!c){box.innerHTML='<div class="notice">Account service unavailable.</div>';return;}
    box.innerHTML='<div class="panel" style="padding:20px">Loading your dashboard…</div>';
    const ownerId=state.user.id;
    const r=await c.from("listings").select("*").eq("user_id",ownerId).order("created_at",{ascending:false});
    if(renderId!==accountRenderId)return;
    if(r.error){box.innerHTML=`<div class="notice">Could not load your listings: ${esc(r.error.message)}</div>`;return;}
    const listings=r.data||[];
    const ids=listings.map(x=>x.id);
    let imageRows=[];
    if(ids.length){
      const ir=await c.from("listing_images").select("listing_id,storage_path,position").in("listing_id",ids).order("position",{ascending:true});
      if(renderId!==accountRenderId)return;
      if(!ir.error) imageRows=ir.data||[];
    }
    const storageUrl=value=>{
      if(!value)return "";
      let p=value;
      if(typeof p==="object"){
        p=p.url||p.src||p.publicUrl||p.storage_path||p.path||p.image_url||"";
      }
      if(!p)return "";
      p=String(p).trim();
      if(!p)return "";
      if(/^(https?:|data:|blob:)/i.test(p)||p.startsWith("/")||p.startsWith("assets/"))return p;
        if(p.startsWith("public/"))p=p.slice(7);if(p.startsWith("listing-photos/"))p=p.slice(14);
      try{
        const result=c.storage.from("listing-photos").getPublicUrl(p);
        return result?.data?.publicUrl||"";
      }catch(_){return "";}
    };
    const grouped={};
    imageRows.forEach(i=>{
      const url=storageUrl(i.storage_path);
      if(url)(grouped[i.listing_id] ||= []).push({url,position:i.position??0});
    });
    const sellerListings=listings.map(x=>{
      const rowImages=(grouped[x.id]||[]).sort((a,b)=>a.position-b.position).map(i=>i.url);
      const legacy=Array.isArray(x.images)?x.images.map(storageUrl).filter(Boolean):[];
      const images=[...new Set([...rowImages,...legacy])];
      return {...x,images,image:images[0]||"assets/images/logo.png"};
    });
    const featured=listings.filter(isFeatured).length;
    const mr=ids.length?await c.from("messages").select("id,listing_id,sender_name,body,created_at").in("listing_id",ids).order("created_at",{ascending:false}):{data:[],error:null};
    if(renderId!==accountRenderId)return;
    const messages=mr.data||[];
    box.innerHTML=`<section class="seller-dashboard">
      <div class="dashboard-head"><div><p class="eyebrow">Seller dashboard</p><h1>Welcome, ${esc(String(state.user.user_metadata?.full_name||state.user.user_metadata?.name||"").trim()||authName(state.user.email))}</h1><p class="muted">${esc(state.user.email)}</p></div><div class="dashboard-top-actions"><a class="action" href="index.html">← Marketplace</a><a class="add-btn" href="add-listing.html">＋ Sell</a></div></div>
      <div class="dashboard-stats"><div><span>Listings</span><strong>${listings.length}</strong></div><div><span>Featured</span><strong>${featured}</strong></div><div><span>Messages</span><strong>${messages.length}</strong></div></div>
      <div class="dashboard-card"><div class="section-head"><h2>My listings</h2><a href="add-listing.html">＋ Add listing</a></div>
        <div class="seller-listings">${sellerListings.length?sellerListings.map(x=>`<article class="seller-listing">
          <div class="seller-listing-gallery">
            <div class="seller-listing-image"><img data-dashboard-photo="${esc(x.id)}" data-photo-index="0" src="${esc(x.image)}" alt="${esc(x.title)}" loading="lazy" onerror="this.onerror=null;this.src='assets/images/logo.png';"></div>
            ${x.images.length>1?`<div class="seller-gallery-controls"><button type="button" data-dashboard-step="-1" data-listing-id="${esc(x.id)}" aria-label="Previous photo">‹</button><span data-dashboard-count="${esc(x.id)}">1 / ${x.images.length}</span><button type="button" data-dashboard-step="1" data-listing-id="${esc(x.id)}" aria-label="Next photo">›</button></div>`:""}
          </div>
          <div class="seller-listing-info"><strong>${esc(x.title)}</strong><span>GH₵ ${esc(x.price)} · ${esc(x.location)}</span><small class="listing-status">${esc(x.status)}</small>${x.images.length>1?`<div class="seller-photo-strip">${x.images.map((u,i)=>`<button type="button" class="seller-thumb ${i===0?"active":""}" data-dashboard-thumb="${esc(x.id)}" data-photo-index="${i}" aria-label="Show photo ${i+1}"><img src="${esc(u)}" alt="Photo ${i+1}" loading="lazy" onerror="this.parentElement.style.display='none'"></button>`).join("")}</div>`:""}</div>
          <div class="seller-actions"><a class="action" href="listing.html?id=${encodeURIComponent(x.id)}">View ad</a><a class="action" href="advertise.html?listing_id=${encodeURIComponent(x.id)}">Promote</a><button class="action danger" data-delete-listing="${esc(x.id)}">Delete</button></div>
        </article>`).join(""):'<div class="empty">You have not published a listing yet. <a href="add-listing.html">Post your first ad</a>.</div>'}</div>
      </div>
      <div class="dashboard-card account-tools"><h2>Account</h2><div class="account-tools-actions"><a class="action" href="index.html">Return to marketplace</a><button class="action" id="signOutBtn">Sign out</button></div></div>
    </section>`;
    const changePhoto=(id,index)=>{
      const item=sellerListings.find(x=>String(x.id)===String(id));
      if(!item||!item.images.length)return;
      const img=$(`[data-dashboard-photo="${CSS.escape(String(id))}"]`);
      const count=$(`[data-dashboard-count="${CSS.escape(String(id))}"]`);
      const n=(index+item.images.length)%item.images.length;
      if(img){img.dataset.photoIndex=String(n);img.src=item.images[n];}
      if(count)count.textContent=`${n+1} / ${item.images.length}`;
      $$('[data-dashboard-thumb]').filter(b=>b.dataset.dashboardThumb===String(id)).forEach(b=>b.classList.toggle("active",Number(b.dataset.photoIndex)===n));
    };
    $$('[data-dashboard-step]').forEach(b=>b.onclick=()=>{
      const id=b.dataset.listingId,item=sellerListings.find(x=>String(x.id)===String(id));
      if(!item||item.images.length<2)return;
      const img=$(`[data-dashboard-photo="${CSS.escape(String(id))}"]`);
      const current=Number(img?.dataset.photoIndex||0);
      changePhoto(id,current+Number(b.dataset.dashboardStep));
    });
    $$('[data-dashboard-thumb]').forEach(b=>b.onclick=()=>changePhoto(b.dataset.dashboardThumb,Number(b.dataset.photoIndex)));
    $$('[data-delete-listing]').forEach(b=>b.onclick=async()=>{
      if(!confirm("Delete this listing?"))return;
      const id=b.dataset.deleteListing;
      const ir=await c.from("listing_images").select("storage_path").eq("listing_id",id).eq("user_id",state.user.id);
      const paths=(ir.data||[]).map(x=>x.storage_path);
      const rr=await c.from("listings").delete().eq("id",id).eq("user_id",state.user.id);
      if(rr.error){alert(rr.error.message);return;}
      if(paths.length)await c.storage.from("listing-photos").remove(paths);
      await account();
    });
    $("#signOutBtn").onclick=async()=>{await c.auth.signOut();location.href="index.html";};
  }
  function renderAll(){renderHeaderFooter();if($("#homeHero"))home();if($("#results"))searchPage();if($("#listing"))listingPage();if($("#addForm"))addListing();}

  function installPwa(){
    let deferred=null;
    window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e;showInstallBanner(false)});
    window.addEventListener("appinstalled",()=>{document.querySelector(".pwa-install-banner")?.remove();deferred=null});
    function showInstallBanner(ios){
      if(localStorage.getItem("trotro_pwa_dismissed")==="1"||document.querySelector(".pwa-install-banner"))return;
      const el=document.createElement("div");el.className="pwa-install-banner";el.innerHTML=`<img src="${logoPath}" alt="TrotroMall"><div><strong>Add TrotroMall to your home screen</strong><small>${ios?"Tap Share, then Add to Home Screen.":"Install TrotroMall for a faster mobile experience."}</small></div><button class="pwa-install-btn">${ios?"OK":"Install"}</button><button class="pwa-close" aria-label="Dismiss">×</button>`;
      document.body.appendChild(el);
      el.querySelector(".pwa-close").onclick=()=>{localStorage.setItem("trotro_pwa_dismissed","1");el.remove()};
      el.querySelector(".pwa-install-btn").onclick=async()=>{if(ios){el.remove();return} if(deferred){deferred.prompt();await deferred.userChoice;deferred=null;el.remove()}};
    }
    const isiOS=/iphone|ipad|ipod/i.test(navigator.userAgent),standalone=window.matchMedia("(display-mode: standalone)").matches||navigator.standalone;
    if(isiOS&&!standalone)setTimeout(()=>showInstallBanner(true),1800);
  }
  function registerPwa(){
    if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("/service-worker.js").catch(e=>console.warn("PWA service worker:",e)));
    installPwa();
  }
  let bootStarted=false, refreshHooksInstalled=false, listingChannel=null;
  function installListingRefresh(c){
    if(refreshHooksInstalled)return;
    refreshHooksInstalled=true;
    // Refresh pages left open on another device/tab; the timer is a fallback if Realtime is not enabled.
    window.addEventListener("focus",()=>{if(document.visibilityState==="visible")loadListings();});
    document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")loadListings();});
    // Avoid recurring background polling; refresh on focus/visibility and via Realtime instead.
    try{
      listingChannel=c.channel("public-listings-live")
        .on("postgres_changes",{event:"*",schema:"public",table:"listings"},()=>loadListings())
        .subscribe(status=>{if(status==="CHANNEL_ERROR"||status==="TIMED_OUT")console.warn("Listings Realtime unavailable; periodic refresh remains enabled.");});
    }catch(error){console.warn("Listings Realtime could not start; periodic refresh remains enabled.",error);}
  }
  async function boot(){
    const c=client();if(!c||bootStarted)return;bootStarted=true;
    try{
      const {data:{session},error}=await c.auth.getSession();
      if(error)console.warn("Could not restore Supabase session:",error);
      state.user=session?.user||null;renderAll();if($("#accountContent"))account();
      c.auth.onAuthStateChange((_e,s)=>{state.user=s?.user||null;renderHeaderFooter();if($("#accountContent"))account();});
      installListingRefresh(c);
      await loadListings();
    }catch(error){console.error("TrotroMall startup failed:",error);state.listingsError=error.message||"Marketplace connection failed.";renderAll();}
    finally{bootStarted=false;}
  }
  document.addEventListener("DOMContentLoaded",()=>{registerPwa();boot();});
  document.addEventListener("trotro:supabase-ready",()=>boot());
})();