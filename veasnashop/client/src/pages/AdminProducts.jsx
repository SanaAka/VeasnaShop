import { useCallback, useEffect, useState } from "react";
import Icon from "../components/Icon";
import { api } from "../api";
import { useAuth } from "../AuthContext";

const DEFAULT_PRODUCT_IMAGE = "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=800&q=80";

const provenanceCls = (p) =>
  p === "GOTS Organic" || p === "Handwoven" || p === "Artisan Made"
    ? "bg-secondary-fixed text-on-secondary-fixed-variant font-medium"
    : "bg-surface-container text-on-surface";

const stockCls = (level) =>
  level <= 1 ? "text-error font-semibold" : level <= 4 ? "text-tertiary font-medium" : "text-secondary font-medium";

const variantBadgeCls = (b) =>
  b === "Restock Queued" || b === "Low Stock"
    ? "bg-error-container text-on-error-container"
    : "bg-secondary-fixed text-on-secondary-fixed-variant";

const initialNewProduct = {
  name: "",
  slug: "",
  category_id: "",
  base_price: "",
  original_price: "",
  tag: "Artisan Made",
  image: "",
  description: "",
  sku: "",
  stock_quantity: 10,
  variant_name: "Standard",
};

export default function AdminProducts() {
  const { token } = useAuth();
  const [search, setSearch] = useState("");
  const [openRows, setOpenRows] = useState({});
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState("table"); // "table" | "grid"
  const [toast, setToast] = useState(null);
  const [skuRows, setSkuRows] = useState([]);
  const [stockDrafts, setStockDrafts] = useState({});
  const [categories, setCategories] = useState([]);
  const [categoryTree, setCategoryTree] = useState([]);

  // Selection & Bulk Actions
  const [selectedIds, setSelectedIds] = useState([]);
  const [targetCategory, setTargetCategory] = useState("");
  const [bulkProcessing, setBulkProcessing] = useState(false);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProduct, setNewProduct] = useState(initialNewProduct);
  const [creating, setCreating] = useState(false);

  const [editingProduct, setEditingProduct] = useState(null); // Product object being edited
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchProducts = useCallback(() => {
    if (!token) return;
    api.get("/admin/products", token)
      .then((d) => setSkuRows(d.products || []))
      .catch(() => setSkuRows([]));
  }, [token]);

  useEffect(() => {
    fetchProducts();
    api.get("/categories")
      .then((d) => {
        const raw = d.categories || [];
        setCategoryTree(raw);
        const flat = [];
        raw.forEach((c) => {
          const childIds = (c.children || []).map((ch) => ch.id);
          const familyIds = [c.id, ...childIds];
          flat.push({
            id: c.id,
            name: c.name,
            slug: c.slug,
            isParent: true,
            familyIds,
            parentName: "",
          });
          (c.children || []).forEach((ch) => {
            flat.push({
              id: ch.id,
              name: `${c.name} → ${ch.name}`,
              shortName: ch.name,
              slug: ch.slug,
              isParent: false,
              familyIds: [ch.id],
              parentName: c.name,
            });
          });
        });
        setCategories(flat);
        if (flat.length > 0) {
          setNewProduct((p) => ({ ...p, category_id: flat[0].id }));
        }
      })
      .catch(() => {});
  }, [token, fetchProducts]);

  const toggleRow = (id) => setOpenRows((o) => ({ ...o, [id]: !o[id] }));

  const showToast = (msg) => {
    setToast({ key: msg, msg });
    window.setTimeout(() => setToast(null), 2600);
  };

  const draftStock = (key) => stockDrafts[key];

  const setStock = (productId, sku, value) => {
    setStockDrafts((d) => ({ ...d, [`${productId}:${sku}`]: value }));
  };

  const saveVariantStock = (row, sku) => {
    const val = Number(draftStock(`${row.id}:${sku}`));
    if (!Number.isFinite(val) || val < 0) {
      showToast("Enter a valid stock number");
      return;
    }
    api.patch(`/admin/products/${row.id}/variants/${encodeURIComponent(sku)}`, { stock: val }, token)
      .then(() => {
        showToast(`Stock updated for ${sku}`);
        fetchProducts();
      })
      .catch(() => showToast("Failed to update stock"));
  };

  const deleteProduct = (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    api.del(`/admin/products/${id}`, token)
      .then(() => {
        showToast(`Deleted ${name}`);
        fetchProducts();
      })
      .catch(() => showToast("Failed to delete product"));
  };

  const toggleStatus = (row) => {
    const nextActive = row.status !== "Published";
    api.put(`/admin/products/${row.id}`, { is_active: nextActive }, token)
      .then(() => {
        showToast(`${row.name} is now ${nextActive ? "Published" : "Draft"}`);
        fetchProducts();
      })
      .catch(() => showToast("Failed to update status"));
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(visible.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBulkStatusChange = (newStatus) => {
    if (selectedIds.length === 0) return;
    const is_active = newStatus === "Published";
    setBulkProcessing(true);
    Promise.all(
      selectedIds.map((id) => api.put(`/admin/products/${id}`, { is_active }, token))
    )
      .then(() => {
        showToast(`Updated ${selectedIds.length} products to ${newStatus}`);
        setSelectedIds([]);
        fetchProducts();
      })
      .catch(() => showToast("Failed to bulk update status"))
      .finally(() => setBulkProcessing(false));
  };

  const handleBulkCategoryChange = () => {
    if (selectedIds.length === 0 || !targetCategory) {
      showToast("Please select a target category");
      return;
    }
    const category_id = Number(targetCategory);
    setBulkProcessing(true);
    Promise.all(
      selectedIds.map((id) => api.put(`/admin/products/${id}`, { category_id }, token))
    )
      .then(() => {
        showToast(`Updated category for ${selectedIds.length} products`);
        setSelectedIds([]);
        setTargetCategory("");
        fetchProducts();
      })
      .catch(() => showToast("Failed to bulk update category"))
      .finally(() => setBulkProcessing(false));
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} selected products?`)) return;
    setBulkProcessing(true);
    Promise.all(selectedIds.map((id) => api.del(`/admin/products/${id}`, token)))
      .then(() => {
        showToast(`Deleted ${selectedIds.length} products`);
        setSelectedIds([]);
        fetchProducts();
      })
      .catch(() => showToast("Failed to bulk delete products"))
      .finally(() => setBulkProcessing(false));
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.base_price || !newProduct.category_id) {
      showToast("Name, category, and base price are required");
      return;
    }
    const slug = newProduct.slug || newProduct.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const sku = newProduct.sku || `VSN-${Math.floor(10000 + Math.random() * 90000)}`;

    setCreating(true);
    api.post("/admin/products", {
      name: newProduct.name,
      slug,
      category_id: Number(newProduct.category_id),
      base_price: Number(newProduct.base_price),
      original_price: newProduct.original_price ? Number(newProduct.original_price) : null,
      tag: newProduct.tag,
      image: newProduct.image,
      description: newProduct.description,
      variants: [
        {
          sku,
          variant_name: newProduct.variant_name || "Standard",
          variant_type: "size",
          stock_quantity: Number(newProduct.stock_quantity || 10),
          price_adjustment: 0,
        },
      ],
    }, token)
      .then(() => {
        showToast(`Created ${newProduct.name}`);
        setShowCreateModal(false);
        setNewProduct(initialNewProduct);
        fetchProducts();
      })
      .catch((err) => showToast(err.message || "Failed to create product"))
      .finally(() => setCreating(false));
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSavingEdit(true);
    api.put(`/admin/products/${editingProduct.id}`, {
      name: editingProduct.name,
      slug: editingProduct.slug,
      base_price: Number(editingProduct.price),
      original_price: editingProduct.originalPrice ? Number(editingProduct.originalPrice) : null,
      category_id: Number(editingProduct.category_id || categories.find((c) => c.name === editingProduct.category)?.id || 1),
      tag: editingProduct.tag,
      image: editingProduct.image,
      description: editingProduct.description,
    }, token)
      .then(() => {
        showToast(`Updated ${editingProduct.name}`);
        setEditingProduct(null);
        fetchProducts();
      })
      .catch((err) => showToast(err.message || "Failed to update product"))
      .finally(() => setSavingEdit(false));
  };

  const selectedCatObj = categories.find((c) => String(c.id) === String(categoryFilter));
  const familyIdsToMatch = selectedCatObj ? selectedCatObj.familyIds : [];

  const visible = skuRows.filter((p) => {
    const q = search.trim().toLowerCase();

    const matchesSearch =
      !q ||
      String(p.name || "").toLowerCase().includes(q) ||
      String(p.sku || "").toLowerCase().includes(q) ||
      String(p.tag || "").toLowerCase().includes(q) ||
      String(p.category || "").toLowerCase().includes(q) ||
      String(p.provenance || "").toLowerCase().includes(q) ||
      (p.variants || []).some((v) =>
        String(v.sku || "").toLowerCase().includes(q) ||
        String(v.label || "").toLowerCase().includes(q) ||
        String(v.variant_name || "").toLowerCase().includes(q)
      ) ||
      categories.some(
        (c) =>
          c.familyIds.includes(Number(p.category_id)) &&
          (c.name.toLowerCase().includes(q) || (c.parentName && c.parentName.toLowerCase().includes(q)))
      );

    const matchesStatus = statusFilter === "all" || p.status === statusFilter;

    let matchesCategory = true;
    if (categoryFilter !== "all") {
      if (selectedCatObj) {
        matchesCategory =
          familyIdsToMatch.includes(Number(p.category_id)) ||
          String(p.category || "").toLowerCase().includes(selectedCatObj.shortName ? selectedCatObj.shortName.toLowerCase() : selectedCatObj.name.toLowerCase());
      } else {
        matchesCategory =
          String(p.category_id) === String(categoryFilter) ||
          String(p.category || "").toLowerCase().includes(categoryFilter.toLowerCase());
      }
    }

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const published = skuRows.filter((p) => p.status === "Published").length;
  const drafts = skuRows.filter((p) => p.status === "Draft").length;

  return (
    <div className="flex flex-col w-full">
      {/* Toast Notification */}
      {toast && (
        <div key={toast.key} className="fixed bottom-6 right-6 z-50 px-space-md py-space-sm rounded-xl bg-inverse-surface text-inverse-on-surface shadow-2xl flex items-center gap-space-sm animate-fade-in">
          <Icon name="check_circle" className="text-secondary-fixed text-[20px]" />
          <span className="font-label-md text-label-md font-medium">{toast.msg}</span>
        </div>
      )}

      {/* Header & Stats Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md mb-space-lg">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">Product &amp; Catalog Management</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
            Managing <strong className="text-on-surface">{skuRows.length} active items</strong> across catalog categories
          </p>
        </div>
        <div className="flex items-center gap-space-sm">
          <div className="px-space-md py-2 bg-surface-container-low text-on-surface-variant rounded-xl font-label-md text-label-md flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-secondary" />
            <span className="font-bold text-on-surface">{published}</span> Published
          </div>
          <div className="px-space-md py-2 bg-surface-container-low text-on-surface-variant rounded-xl font-label-md text-label-md flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-outline" />
            <span className="font-bold text-on-surface">{drafts}</span> Draft
          </div>
          <button
            className="px-space-md py-2.5 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg shadow-sm hover:bg-primary-container transition-all flex items-center gap-space-xs cursor-pointer"
            type="button"
            onClick={() => setShowCreateModal(true)}
          >
            <Icon name="add" className="text-[18px]" />
            <span>New Product</span>
          </button>
        </div>
      </div>

      {/* Filter & Controls Bar */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-sm mb-space-lg">
        <div className="p-space-md lg:p-space-lg flex flex-col lg:flex-row lg:items-center gap-space-md justify-between">
          <div className="relative flex-1 max-w-md w-full">
            <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[19px]" />
            <input
              className="w-full pl-11 pr-space-md py-2.5 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant font-body-sm text-body-sm focus:outline-none focus:bg-surface-container transition-all"
              placeholder="Search by title, SKU, tag, or category..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-space-sm flex-wrap">
            {/* View Mode Switcher */}
            <div className="flex items-center p-1 rounded-xl bg-surface-container-low">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg transition-all ${viewMode === "table" ? "bg-surface-container-lowest text-primary shadow-xs" : "text-on-surface-variant"}`}
                title="Table View"
              >
                <Icon name="format_list_bulleted" className="text-[18px]" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-surface-container-lowest text-primary shadow-xs" : "text-on-surface-variant"}`}
                title="Grid Cards View"
              >
                <Icon name="grid_view" className="text-[18px]" />
              </button>
            </div>

            {/* Status Filter */}
            <div className="relative min-w-[150px]">
              <select
                className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-label-md text-label-md focus:outline-none cursor-pointer"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Status: All</option>
                <option value="Published">Published</option>
                <option value="Draft">Draft</option>
              </select>
              <Icon name="expand_more" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none" />
            </div>

            {/* Category Filter Dropdown */}
            <div className="relative min-w-[200px]">
              <select
                className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-label-md text-label-md focus:outline-none cursor-pointer"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">Category: All Categories</option>
                {categoryTree.map((parent) => (
                  <optgroup key={parent.id} label={parent.name}>
                    <option value={parent.id}>All {parent.name}</option>
                    {(parent.children || []).map((child) => (
                      <option key={child.id} value={child.id}>
                        ↳ {child.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <Icon name="expand_more" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none" />
            </div>

            <button
              className="p-2.5 rounded-xl bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors flex items-center justify-center shrink-0"
              title="Reset Filters"
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setCategoryFilter("all");
              }}
            >
              <Icon name="filter_alt_off" className="text-[18px]" />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Selection Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4 mb-space-md flex flex-wrap items-center justify-between gap-3 animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <Icon name="check_box" className="text-primary text-[20px]" />
            <span className="font-title-sm text-title-sm font-bold text-on-surface">
              {selectedIds.length} {selectedIds.length === 1 ? "product" : "products"} selected
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <select
                value={targetCategory}
                onChange={(e) => setTargetCategory(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-surface-container-lowest border border-surface-container text-body-sm text-on-surface focus:outline-none"
              >
                <option value="">Move to Category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                type="button"
                disabled={!targetCategory || bulkProcessing}
                onClick={handleBulkCategoryChange}
                className="px-3.5 py-1.5 rounded-xl bg-primary text-on-primary font-label-sm text-label-sm font-semibold hover:bg-primary-container disabled:opacity-50 transition-all cursor-pointer"
              >
                Apply Category
              </button>
            </div>

            <button
              type="button"
              disabled={bulkProcessing}
              onClick={() => handleBulkStatusChange("Published")}
              className="px-3.5 py-1.5 rounded-xl bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-label-sm font-semibold hover:bg-secondary-container transition-all cursor-pointer"
            >
              Publish Selected
            </button>

            <button
              type="button"
              disabled={bulkProcessing}
              onClick={() => handleBulkStatusChange("Draft")}
              className="px-3.5 py-1.5 rounded-xl bg-surface-container-high text-on-surface font-label-sm text-label-sm font-semibold hover:bg-surface-container-highest transition-all cursor-pointer"
            >
              Set to Draft
            </button>

            <button
              type="button"
              disabled={bulkProcessing}
              onClick={handleBulkDelete}
              className="px-3.5 py-1.5 rounded-xl bg-error-container text-on-error-container font-label-sm text-label-sm font-semibold hover:bg-error/20 transition-all cursor-pointer flex items-center gap-1"
            >
              <Icon name="delete" className="text-[16px]" />
              Delete Selected
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1.5 rounded-xl text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area: Table or Grid */}
      {viewMode === "table" ? (
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden">
          <div className="px-space-lg py-space-md bg-surface-container-low/60 flex items-center justify-between">
            <div className="flex items-center gap-space-md">
              <input
                className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
                type="checkbox"
                checked={visible.length > 0 && visible.every((p) => selectedIds.includes(p.id))}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Product &amp; Taxonomy</span>
            </div>
            <div className="hidden md:grid grid-cols-5 gap-space-lg text-right flex-1 max-w-3xl pr-space-md">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Base Price</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Stock Units</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Variants</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold text-center">Tag</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold text-center">Status</span>
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold text-right w-28">Actions</span>
          </div>

          <div className="flex flex-col">
            {visible.map((row) => (
              <div key={row.id} className="flex flex-col border-b border-surface-container last:border-0">
                <div className="px-space-lg py-space-md flex items-center justify-between gap-space-md hover:bg-surface-container-low/30 transition-colors">
                  <div className="flex items-center gap-space-md min-w-0 flex-1">
                    <input
                      className="w-4 h-4 rounded text-primary accent-primary cursor-pointer shrink-0"
                      type="checkbox"
                      checked={selectedIds.includes(row.id)}
                      onChange={() => handleSelectOne(row.id)}
                    />
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-surface-container shadow-sm border border-surface-container">
                      <img
                        className="w-full h-full object-cover"
                        alt={row.name}
                        src={row.image || DEFAULT_PRODUCT_IMAGE}
                        onError={(e) => {
                          e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                        }}
                      />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-space-xs">
                        <span className="font-title-md text-title-md font-semibold text-on-surface truncate">{row.name}</span>
                        {row.variants?.length > 0 && (
                          <button className="inline-flex items-center text-primary hover:text-secondary p-0.5 rounded transition-transform" type="button" onClick={() => toggleRow(row.id)}>
                            <Icon name={openRows[row.id] ? "keyboard_arrow_up" : "keyboard_arrow_down"} className="text-[18px]" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-space-sm text-on-surface-variant font-label-sm text-label-sm">
                        <span className="font-mono text-on-surface">{row.sku}</span>
                        <span>•</span>
                        <span>{row.category}</span>
                        {row.variants?.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-secondary font-medium">{row.variants.length} SKUs</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="hidden md:grid grid-cols-5 gap-space-lg text-right flex-1 max-w-3xl items-center pr-space-md">
                    <span className="font-title-md text-title-md font-bold text-on-surface font-mono">${Number(row.price).toFixed(2)}</span>
                    <div className="flex flex-col items-end">
                      <span className="font-label-lg text-label-lg font-bold text-on-surface">{row.units}</span>
                      <span className={`font-label-sm text-label-sm ${stockCls(row.stockLevel)}`}>
                        {row.stockLevel <= 1 ? "Critical stock" : row.stockLevel <= 4 ? "Low stock" : "In stock"}
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-1.5">
                      {row.colors?.map((c) => (
                        <span key={c} className="w-3 h-3 rounded-full shadow-sm border border-outline/20" style={{ backgroundColor: c }} />
                      ))}
                      <span className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">{row.colors?.length || 0}</span>
                    </div>
                    <div className="flex justify-center">
                      <span className={`px-2.5 py-1 rounded-full font-label-sm text-label-sm whitespace-nowrap ${provenanceCls(row.provenance)}`}>
                        {row.provenance || row.tag || "Artisan Made"}
                      </span>
                    </div>
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => toggleStatus(row)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label-sm text-label-sm font-semibold transition-all cursor-pointer ${row.status === "Published" ? "bg-secondary-fixed text-on-secondary-fixed-variant hover:bg-secondary-container" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}
                        title="Click to toggle status"
                      >
                        {row.status === "Published" && <span className="w-1.5 h-1.5 rounded-full bg-secondary" />}
                        {row.status}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1 w-28 shrink-0">
                    <button
                      className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors cursor-pointer"
                      title="Edit Product"
                      type="button"
                      onClick={() => setEditingProduct(row)}
                    >
                      <Icon name="edit" className="text-[19px]" />
                    </button>
                    <button
                      className="p-2 rounded-lg text-on-surface-variant hover:bg-error-container hover:text-error transition-colors cursor-pointer"
                      title="Delete Product"
                      type="button"
                      onClick={() => deleteProduct(row.id, row.name)}
                    >
                      <Icon name="delete" className="text-[19px]" />
                    </button>
                  </div>
                </div>

                {/* Variant Breakdown Row */}
                {openRows[row.id] && row.variants?.length > 0 && (
                  <div className="bg-surface-container-low/80 px-space-lg py-space-md pl-16 flex flex-col gap-space-xs">
                    <div className="flex items-center justify-between pb-space-xs">
                      <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
                        Configured SKU Inventory Breakdown
                      </span>
                    </div>
                    <div className="grid grid-cols-12 gap-2 text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider py-1 font-medium">
                      <div className="col-span-3">Variant Specification</div>
                      <div className="col-span-3">Unique SKU / Barcode</div>
                      <div className="col-span-2 text-right">Price</div>
                      <div className="col-span-2 text-right">Inventory</div>
                      <div className="col-span-2 text-center">Status</div>
                    </div>
                    {row.variants.map((v) => (
                      <div key={v.sku} className="grid grid-cols-12 gap-2 items-center bg-surface-container-lowest p-2.5 rounded-xl shadow-sm text-on-surface font-body-sm text-body-sm">
                        <div className="col-span-3 flex items-center gap-2">
                          {v.color && <span className="w-3.5 h-3.5 rounded-full shrink-0 border border-outline/20" style={{ backgroundColor: v.color }} />}
                          <span className="font-semibold text-on-surface">{v.label}</span>
                        </div>
                        <div className="col-span-3 font-mono text-on-surface-variant">{v.sku}</div>
                        <div className="col-span-2 text-right font-mono font-bold">${Number(v.price).toFixed(2)}</div>
                        <div className="col-span-2 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <input
                              type="number"
                              min="0"
                              className="w-16 text-right px-2 py-1 rounded-lg bg-surface-container-low font-mono font-semibold focus:outline-none focus:bg-surface-container border border-surface-container"
                              value={draftStock(`${row.id}:${v.sku}`) ?? v.stock}
                              onChange={(e) => setStock(row.id, v.sku, e.target.value)}
                            />
                            {draftStock(`${row.id}:${v.sku}`) !== undefined &&
                              draftStock(`${row.id}:${v.sku}`) !== String(v.stock) && (
                              <button
                                className="p-1.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container transition-colors cursor-pointer"
                                title="Save Stock"
                                type="button"
                                onClick={() => saveVariantStock(row, v.sku)}
                              >
                                <Icon name="check" className="text-[15px]" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <span className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm font-medium ${variantBadgeCls(v.badge)}`}>{v.badge}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Grid Cards View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-space-md">
          {visible.map((row) => (
            <div key={row.id} className={`bg-surface-container-lowest rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between border relative ${selectedIds.includes(row.id) ? "border-primary ring-2 ring-primary/20" : "border-surface-container"}`}>
              <div>
                <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-surface-container mb-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(row.id)}
                    onChange={() => handleSelectOne(row.id)}
                    className="absolute top-2.5 left-2.5 z-20 w-4 h-4 rounded text-primary accent-primary cursor-pointer shadow-md"
                  />
                  <img
                    className="w-full h-full object-cover"
                    alt={row.name}
                    src={row.image || DEFAULT_PRODUCT_IMAGE}
                    onError={(e) => {
                      e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                    }}
                  />
                  {row.tag && (
                    <span className="absolute top-2.5 left-2.5 bg-surface-container-lowest/90 backdrop-blur-sm text-primary font-label-sm text-[11px] px-2.5 py-1 rounded-full font-bold">
                      {row.tag}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleStatus(row)}
                    className={`absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full font-label-sm text-[11px] font-bold ${row.status === "Published" ? "bg-secondary-fixed text-on-secondary-fixed-variant" : "bg-surface-container-lowest/90 text-on-surface-variant"}`}
                  >
                    {row.status}
                  </button>
                </div>
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">{row.category}</span>
                <h3 className="font-title-md text-title-md font-bold text-on-surface mt-0.5 line-clamp-1">{row.name}</h3>
                <p className="font-mono text-body-sm text-on-surface-variant mt-1">${Number(row.price).toFixed(2)}</p>
              </div>

              <div className="flex items-center justify-between pt-3 mt-3 border-t border-surface-container">
                <span className={`font-label-sm text-label-sm ${stockCls(row.stockLevel)}`}>
                  {row.units} units in stock
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditingProduct(row)}
                    className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors"
                    title="Edit Product"
                  >
                    <Icon name="edit" className="text-[18px]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteProduct(row.id, row.name)}
                    className="p-2 rounded-xl text-on-surface-variant hover:bg-error-container hover:text-error transition-colors"
                    title="Delete Product"
                  >
                    <Icon name="delete" className="text-[18px]" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {visible.length === 0 && (
        <div className="py-20 text-center bg-surface-container-lowest rounded-2xl shadow-sm mt-4">
          <Icon name="search_off" className="text-[36px] text-outline mx-auto mb-2" />
          <p className="font-title-md text-title-md text-on-surface-variant font-medium">No products match your filters.</p>
        </div>
      )}

      {/* New Product Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-on-surface/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto flex flex-col gap-4 border border-surface-container">
            <div className="flex items-center justify-between">
              <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">Add New Product</h2>
              <button type="button" onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container">
                <Icon name="close" className="text-[20px]" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className="font-label-sm text-label-sm font-semibold text-on-surface">Product Name *</span>
                <input
                  required
                  value={newProduct.name}
                  onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Kyoto Stoneware Teapot"
                  className="px-3.5 py-2 rounded-xl bg-surface-container-low border border-surface-container text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="font-label-sm text-label-sm font-semibold text-on-surface">Category *</span>
                  <select
                    required
                    value={newProduct.category_id}
                    onChange={(e) => setNewProduct((p) => ({ ...p, category_id: e.target.value }))}
                    className="px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-on-surface text-body-sm focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-label-sm text-label-sm font-semibold text-on-surface">Tag / Taxonomy</span>
                  <input
                    value={newProduct.tag}
                    onChange={(e) => setNewProduct((p) => ({ ...p, tag: e.target.value }))}
                    placeholder="e.g. Artisan Made, GOTS Organic"
                    className="px-3.5 py-2 rounded-xl bg-surface-container-low border border-surface-container text-on-surface text-body-sm focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {["Artisan Made", "GOTS Organic", "Handwoven", "Recycled Glass", "Mindful Essential", "Small-batch"].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setNewProduct((p) => ({ ...p, tag: t }))}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-label-sm transition-colors ${newProduct.tag === t ? "bg-primary text-on-primary font-semibold" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="font-label-sm text-label-sm font-semibold text-on-surface">Base Price ($) *</span>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={newProduct.base_price}
                    onChange={(e) => setNewProduct((p) => ({ ...p, base_price: e.target.value }))}
                    placeholder="84.00"
                    className="px-3.5 py-2 rounded-xl bg-surface-container-low border border-surface-container text-on-surface text-body-sm focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-label-sm text-label-sm font-semibold text-on-surface">Compare Price ($)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={newProduct.original_price}
                    onChange={(e) => setNewProduct((p) => ({ ...p, original_price: e.target.value }))}
                    placeholder="120.00"
                    className="px-3.5 py-2 rounded-xl bg-surface-container-low border border-surface-container text-on-surface text-body-sm focus:outline-none"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1">
                <span className="font-label-sm text-label-sm font-semibold text-on-surface">Image URL</span>
                <input
                  value={newProduct.image}
                  onChange={(e) => setNewProduct((p) => ({ ...p, image: e.target.value }))}
                  placeholder="https://images.unsplash.com/..."
                  className="px-3.5 py-2 rounded-xl bg-surface-container-low border border-surface-container text-on-surface text-body-sm focus:outline-none"
                />
              </label>

              {/* Live Image Preview */}
              {newProduct.image && (
                <div className="w-full h-32 rounded-xl overflow-hidden bg-surface-container border border-surface-container">
                  <img
                    className="w-full h-full object-cover"
                    alt="Preview"
                    src={newProduct.image}
                    onError={(e) => { e.currentTarget.src = DEFAULT_PRODUCT_IMAGE; }}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="font-label-sm text-label-sm font-semibold text-on-surface">SKU</span>
                  <input
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct((p) => ({ ...p, sku: e.target.value }))}
                    placeholder="VSN-CER-001"
                    className="px-3.5 py-2 rounded-xl bg-surface-container-low border border-surface-container text-on-surface text-body-sm focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-label-sm text-label-sm font-semibold text-on-surface">Initial Stock</span>
                  <input
                    type="number"
                    value={newProduct.stock_quantity}
                    onChange={(e) => setNewProduct((p) => ({ ...p, stock_quantity: e.target.value }))}
                    placeholder="10"
                    className="px-3.5 py-2 rounded-xl bg-surface-container-low border border-surface-container text-on-surface text-body-sm focus:outline-none"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1">
                <span className="font-label-sm text-label-sm font-semibold text-on-surface">Description</span>
                <textarea
                  rows={2}
                  value={newProduct.description}
                  onChange={(e) => setNewProduct((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Product description..."
                  className="px-3.5 py-2 rounded-xl bg-surface-container-low border border-surface-container text-on-surface text-body-sm focus:outline-none resize-none"
                />
              </label>

              <div className="flex items-center justify-end gap-3 mt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md font-medium hover:bg-surface-container-high"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-primary-container disabled:opacity-60 cursor-pointer"
                >
                  {creating ? "Creating..." : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-on-surface/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto flex flex-col gap-4 border border-surface-container">
            <div className="flex items-center justify-between">
              <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">Edit Product Details</h2>
              <button type="button" onClick={() => setEditingProduct(null)} className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container">
                <Icon name="close" className="text-[20px]" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className="font-label-sm text-label-sm font-semibold text-on-surface">Product Title *</span>
                <input
                  required
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct((p) => ({ ...p, name: e.target.value }))}
                  className="px-3.5 py-2 rounded-xl bg-surface-container-low border border-surface-container text-on-surface text-body-sm focus:outline-none"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="font-label-sm text-label-sm font-semibold text-on-surface">Base Price ($) *</span>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct((p) => ({ ...p, price: e.target.value }))}
                    className="px-3.5 py-2 rounded-xl bg-surface-container-low border border-surface-container text-on-surface text-body-sm focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-label-sm text-label-sm font-semibold text-on-surface">Compare Price ($)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.originalPrice || ""}
                    onChange={(e) => setEditingProduct((p) => ({ ...p, originalPrice: e.target.value }))}
                    className="px-3.5 py-2 rounded-xl bg-surface-container-low border border-surface-container text-on-surface text-body-sm focus:outline-none"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="font-label-sm text-label-sm font-semibold text-on-surface">Tag / Taxonomy</span>
                  <input
                    value={editingProduct.tag || ""}
                    onChange={(e) => setEditingProduct((p) => ({ ...p, tag: e.target.value }))}
                    className="px-3.5 py-2 rounded-xl bg-surface-container-low border border-surface-container text-on-surface text-body-sm focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {["Artisan Made", "GOTS Organic", "Handwoven", "Recycled Glass", "Mindful Essential", "Small-batch"].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setEditingProduct((p) => ({ ...p, tag: t }))}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-label-sm transition-colors ${editingProduct.tag === t ? "bg-primary text-on-primary font-semibold" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-label-sm text-label-sm font-semibold text-on-surface">Category</span>
                  <select
                    value={editingProduct.category_id || categories.find((c) => c.name === editingProduct.category)?.id || ""}
                    onChange={(e) => setEditingProduct((p) => ({ ...p, category_id: e.target.value }))}
                    className="px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-on-surface text-body-sm focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="flex flex-col gap-1">
                <span className="font-label-sm text-label-sm font-semibold text-on-surface">Image URL</span>
                <input
                  value={editingProduct.image || ""}
                  onChange={(e) => setEditingProduct((p) => ({ ...p, image: e.target.value }))}
                  className="px-3.5 py-2 rounded-xl bg-surface-container-low border border-surface-container text-on-surface text-body-sm focus:outline-none"
                />
              </label>

              {editingProduct.image && (
                <div className="w-full h-32 rounded-xl overflow-hidden bg-surface-container border border-surface-container">
                  <img
                    className="w-full h-full object-cover"
                    alt="Preview"
                    src={editingProduct.image}
                    onError={(e) => { e.currentTarget.src = DEFAULT_PRODUCT_IMAGE; }}
                  />
                </div>
              )}

              <label className="flex flex-col gap-1">
                <span className="font-label-sm text-label-sm font-semibold text-on-surface">Description</span>
                <textarea
                  rows={3}
                  value={editingProduct.description || ""}
                  onChange={(e) => setEditingProduct((p) => ({ ...p, description: e.target.value }))}
                  className="px-3.5 py-2 rounded-xl bg-surface-container-low border border-surface-container text-on-surface text-body-sm focus:outline-none resize-none"
                />
              </label>

              <div className="flex items-center justify-end gap-3 mt-3">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md font-medium hover:bg-surface-container-high"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-6 py-2 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-primary-container disabled:opacity-60 cursor-pointer"
                >
                  {savingEdit ? "Updating..." : "Update Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}