import { useState, useEffect } from 'react';
import { api, type Product } from '../lib/api';
import { toast } from 'sonner';
import { Plus, Trash2, ShieldCheck, Package, ArrowLeft, RefreshCw, Zap, IndianRupee } from 'lucide-react';

interface AdminProps {
  onNavigateHome: () => void;
  onNavigateCheckout: () => void;
}

export const AdminPage: React.FC<AdminProps> = ({ onNavigateHome, onNavigateCheckout }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Apparel');
  const [imageEmoji, setImageEmoji] = useState('📦');
  const [stock, setStock] = useState('50');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.getProducts();
      setProducts(res.products || []);
    } catch (err: any) {
      toast.error('Failed to load products', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || parseFloat(price) <= 0) {
      toast.error('Validation Error', { description: 'Name and a positive price are required' });
      return;
    }

    setIsAdding(true);
    try {
      const created = await api.createProduct({
        name,
        description,
        price: parseFloat(price),
        category,
        imageEmoji: imageEmoji || '📦',
        stock: parseInt(stock) || 50,
      });

      setProducts((prev) => [created, ...prev]);
      toast.success('Product Added to Catalog!', { description: `${created.name} (₹${created.price})` });
      setName('');
      setDescription('');
      setPrice('');
      setImageEmoji('📦');
    } catch (err: any) {
      toast.error('Failed to add product', { description: err.message });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await api.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success('Product Deleted', { description: `${name} removed from DB` });
    } catch (err: any) {
      toast.error('Delete failed', { description: err.message });
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-purple-600/10 blur-3xl animate-float" />
        <div className="absolute bottom-10 left-1/3 w-80 h-80 rounded-full bg-indigo-600/10 blur-3xl animate-float-delay" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 sm:px-10 lg:px-16 py-5 border-b border-border-subtle">
        <button onClick={onNavigateHome} className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary tracking-tight">Superadmin Portal</h1>
            <p className="text-[10px] text-text-muted -mt-0.5">Manage Products & Supabase Catalog</p>
          </div>
        </button>

        <div className="flex items-center gap-3">
          <button onClick={onNavigateHome} className="text-sm font-medium text-text-secondary hover:text-text-primary flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Home
          </button>
          <button onClick={onNavigateCheckout} className="btn-gradient text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1">
            <Zap className="w-4 h-4" /> Checkout Demo
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        {/* Header Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="glass-card p-5 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">Total Items</p>
              <p className="text-2xl font-bold text-text-primary font-mono-num">{products.length}</p>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <IndianRupee className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">Catalog Value</p>
              <p className="text-2xl font-bold text-text-primary font-mono-num">
                ₹{products.reduce((acc, p) => acc + p.price, 0).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">Database Mode</p>
              <p className="text-sm font-bold text-emerald-400">PostgreSQL (Supabase)</p>
            </div>
          </div>
        </div>

        {/* Two Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Add Product Form (5 Cols) */}
          <div className="lg:col-span-5 glass-card rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-400" /> Add New Collection Item
              </h2>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Item Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Vintage Leather Watch"
                  className="w-full px-4 py-3 rounded-xl input-dark text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Water resistant, brown strap"
                  className="w-full px-4 py-3 rounded-xl input-dark text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="3499"
                    className="w-full px-4 py-3 rounded-xl input-dark text-sm font-mono-num"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl input-dark text-sm"
                  >
                    <option value="Apparel">Apparel</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Footwear">Footwear</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Emoji Icon</label>
                  <input
                    type="text"
                    value={imageEmoji}
                    onChange={(e) => setImageEmoji(e.target.value)}
                    placeholder="⌚"
                    className="w-full px-4 py-3 rounded-xl input-dark text-center text-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Stock Qty</label>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="50"
                    className="w-full px-4 py-3 rounded-xl input-dark text-sm font-mono-num"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isAdding}
                className="w-full py-3.5 btn-gradient text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2"
              >
                {isAdding ? 'Saving to Database...' : 'Save Product to Supabase'}
              </button>
            </form>
          </div>

          {/* Product Catalog List (7 Cols) */}
          <div className="lg:col-span-7 glass-card rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-lg font-bold text-text-primary">Live Database Catalog</h2>
              <button
                onClick={fetchProducts}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12 text-text-muted space-y-2">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-purple-400" />
                <p>Loading database items...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12 text-text-muted">
                No products found in catalog. Add your first item on the left!
              </div>
            ) : (
              <div className="space-y-3">
                {products.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-surface hover:bg-surface-hover rounded-xl border border-border flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 bg-canvas rounded-xl flex items-center justify-center text-2xl border border-border">
                        {item.imageEmoji}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-text-primary">{item.name}</h3>
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-semibold border border-purple-500/15">
                            {item.category}
                          </span>
                        </div>
                        <p className="text-xs text-text-muted mt-0.5">{item.description || 'No description'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-mono-num font-bold text-sm text-text-primary">₹{item.price.toLocaleString()}</p>
                        <p className="text-[10px] text-text-muted font-mono-num">{item.stock} in stock</p>
                      </div>

                      <button
                        onClick={() => handleDeleteProduct(item.id, item.name)}
                        className="p-2 text-text-muted hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                        title="Delete Product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
