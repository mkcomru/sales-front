
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  X,
  Trash2,
  MoreVertical,
  Layers,
  Tag,
  Hash,
  Type,
  CheckSquare,
  Loader2,
  Save,
  Edit2
} from 'lucide-react';
import { productsService } from '../services';
import { ProductBackend, ProductRequest, CategoryBackend } from '../types/api';
import { logger } from '../utils/logger';

// --- Local Types ---

type FieldType = 'text' | 'number' | 'select' | 'boolean';

// Inferred schema definition
interface InferredField {
  key: string;
  type: FieldType;
  options?: string[]; // accumulated options
}

interface ProductUI {
  id: number;
  name: string;
  description: string;
  categoryId: number | null;
  imageUrl: string;
  attributes: Record<string, any>;
}

interface ProductCatalogProps {
  companyId: number;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({ companyId }) => {
  // --- State ---
  const [categories, setCategories] = useState<CategoryBackend[]>([]);
  const [products, setProducts] = useState<ProductUI[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Drawer States
  const [isProductDrawerOpen, setIsProductDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductUI | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [categoryRules, setCategoryRules] = useState('');
  const [categoryWorkflow, setCategoryWorkflow] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [newAttrKey, setNewAttrKey] = useState('');
  const [isAddingAttr, setIsAddingAttr] = useState(false);

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    if (!companyId) return;
    try {
      setIsLoading(true);
      const res = await productsService.getCompanyProducts(companyId);

      setCategories(res.categories || []);

      // Map backend products to UI
      const uiProducts = (res.products || []).map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        categoryId: p.category_id,
        imageUrl: (p.attributes?.image_url as string) || '',
        attributes: p.attributes || {}
      }));
      setProducts(uiProducts);

    } catch (error) {
      logger.error("Failed to fetch products", error);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Derived Data ---


  const filteredProducts = useMemo(() => {
    return products.filter(p => selectedCategoryId === null || p.categoryId === selectedCategoryId);
  }, [products, selectedCategoryId]);

  // --- Dynamic Schema Inference ---
  const inferredSchema = useMemo<InferredField[]>(() => {
    const keys = new Set<string>();
    const keyTypes: Record<string, Set<FieldType>> = {};

    products.forEach(p => {
      Object.entries(p.attributes).forEach(([k, v]) => {
        if (k === 'image_url') return; // Skip internal image key
        keys.add(k);
        let t: FieldType = 'text';
        if (typeof v === 'number') t = 'number';
        if (typeof v === 'boolean') t = 'boolean';

        if (!keyTypes[k]) keyTypes[k] = new Set();
        keyTypes[k].add(t);
      });
    });

    const schema: InferredField[] = [];
    keys.forEach(k => {
      const types = Array.from(keyTypes[k] || []);
      const mainType = types[0] || 'text';
      schema.push({ key: k, type: mainType });
    });

    return schema;
  }, [products]);

  // --- Category Actions ---
  const handleAddCategory = () => {
    setEditingCategoryId(null);
    setCategoryName('');
    setCategoryDescription('');
    setCategoryRules('');
    setCategoryWorkflow('');
    setIsCategoryModalOpen(true);
  };

  const handleEditCategory = (cat: CategoryBackend) => {
    setEditingCategoryId(cat.id);
    setCategoryName(cat.name);
    setCategoryDescription(cat.description || '');
    setCategoryRules(cat.rules || '');
    setCategoryWorkflow(cat.workflow || '');
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) return;
    try {
      setIsSavingCategory(true);
      const payload = {
        name: categoryName,
        description: categoryDescription,
        rules: categoryRules,
        workflow: categoryWorkflow,
      };
      if (editingCategoryId) {
        await productsService.updateCategory(companyId, editingCategoryId, payload);
      } else {
        await productsService.createCategory(companyId, payload);
      }
      setIsCategoryModalOpen(false);
      setCategoryName('');
      setCategoryDescription('');
      setCategoryRules('');
      setCategoryWorkflow('');
      setEditingCategoryId(null);
      await fetchData();
    } catch (e) {
      logger.error("Category save failed", e);
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Удалить категорию? Продукты в ней останутся, но станут "без категории".')) return;
    try {
      await productsService.deleteCategory(companyId, id);
      if (selectedCategoryId === id) setSelectedCategoryId(null);
      await fetchData();
    } catch (e) {
      logger.error("Category delete failed", e);
    }
  };

  // --- Product Actions ---
  const handleAddProduct = () => {
    const newProd: ProductUI = {
      id: 0, // 0 indicates new
      name: '',
      description: '',
      categoryId: selectedCategoryId || (categories[0]?.id || null),
      imageUrl: '',
      attributes: {}
    };
    setEditingProduct(newProd);
    setIsProductDrawerOpen(true);
  };

  const handleEditProduct = (prod: ProductUI) => {
    setEditingProduct({ ...prod, attributes: { ...prod.attributes } });
    setIsProductDrawerOpen(true);
  };

  const handleDuplicateProduct = async (prod: ProductUI) => {
    try {
      setIsSaving(true);
      const payload: ProductRequest = {
        company_id: companyId,
        name: `${prod.name} (Копия)`,
        description: prod.description,
        category_id: prod.categoryId,
        attributes: { ...prod.attributes }
      };
      await productsService.createProduct(payload);
      await fetchData();
    } catch (e) {
      logger.error("Duplicate failed", e);
      alert('Ошибка при дублировании');
    } finally {
      setIsSaving(false);
    }
  };

  const saveProduct = async () => {
    if (!editingProduct) return;
    try {
      setIsSaving(true);

      const payload: ProductRequest = {
        company_id: companyId,
        name: editingProduct.name,
        description: editingProduct.description,
        category_id: editingProduct.categoryId,
        attributes: {
          ...editingProduct.attributes,
          image_url: editingProduct.imageUrl
        }
      };

      if (editingProduct.id === 0) {
        // Create
        await productsService.createProduct(payload);
      } else {
        // Update
        await productsService.updateProduct(editingProduct.id, payload);
      }

      await fetchData();
      setIsProductDrawerOpen(false);
      setEditingProduct(null);

    } catch (e) {
      logger.error("Save failed", e);
      alert('Ошибка при сохранении');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteProduct = async (id: number) => {
    if (!confirm('Удалить этот продукт?')) return;
    try {
      await productsService.deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      setIsProductDrawerOpen(false);
    } catch (e) {
      logger.error("Delete failed", e);
      alert('Ошибка при удалении');
    }
  };

  const addAttribute = () => {
    if (!editingProduct || !newAttrKey.trim()) return;
    if (!editingProduct.attributes[newAttrKey]) {
      setEditingProduct({
        ...editingProduct,
        attributes: { ...editingProduct.attributes, [newAttrKey]: '' }
      });
      setNewAttrKey('');
      setIsAddingAttr(false);
    }
  };

  const removeAttribute = (key: string) => {
    if (!editingProduct) return;
    const newAttrs = { ...editingProduct.attributes };
    delete newAttrs[key];
    setEditingProduct({ ...editingProduct, attributes: newAttrs });
  };

  // --- Render Helpers ---

  const getFieldIcon = (type: FieldType) => {
    switch (type) {
      case 'number': return <Hash size={14} />;
      case 'select': return <Tag size={14} />;
      case 'boolean': return <CheckSquare size={14} />;
      default: return <Type size={14} />;
    }
  };

  if (isLoading && products.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-gray-300" size={32} />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-white overflow-hidden">
      {/* SIDEBAR: CATEGORIES */}
      <div className="w-[260px] border-r border-gray-100 flex flex-col h-full bg-gray-50/50">
        <header className="h-[64px] px-6 flex items-center justify-between border-b border-gray-100 bg-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-gray-400" />
            <h2 className="text-[14px] font-bold text-gray-900">Категории</h2>
          </div>
          <button
            onClick={handleAddCategory}
            className="p-1.5 text-gray-400 hover:text-gray-900 transition-colors hover:bg-gray-100 rounded-md"
            title="Добавить категорию"
          >
            <Plus size={16} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <button
            onClick={() => setSelectedCategoryId(null)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] transition-all group ${selectedCategoryId === null
              ? 'bg-white text-gray-900 shadow-sm font-bold border border-gray-100'
              : 'text-gray-500 hover:bg-white hover:text-gray-700'
              }`}
          >
            <span className="truncate pr-4">Все товары</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full transition-colors ${selectedCategoryId === null ? 'bg-gray-100 text-gray-600' : 'bg-gray-200/50 text-gray-400'
              }`}>
              {products.length}
            </span>
          </button>

          {categories.map(cat => {
            const count = products.filter(p => p.categoryId === cat.id).length;
            const isActive = selectedCategoryId === cat.id;

            return (
              <div key={cat.id} className="relative group">
                <button
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] transition-all pr-12 ${isActive
                    ? 'bg-white text-gray-900 shadow-sm font-bold border border-gray-100'
                    : 'text-gray-500 hover:bg-white hover:text-gray-700'
                    }`}
                >
                  <span className="truncate pr-2">{cat.name}</span>
                  {!isActive && (
                    <span className="text-[10px] bg-gray-200/50 text-gray-400 px-1.5 py-0.5 rounded-full group-hover:bg-gray-100">
                      {count}
                    </span>
                  )}
                  {isActive && (
                    <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                      {count}
                    </span>
                  )}
                </button>

                {/* Inline Actions hidden behind count when not hovered */}
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm pl-1 rounded-md">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEditCategory(cat); }}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-full bg-white">
        <header className="h-[64px] px-8 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h2 className="text-[15px] font-bold text-gray-900">Товары</h2>
            <span className="text-[11px] font-bold text-gray-400 bg-gray-200/50 px-1.5 py-0.5 rounded">{filteredProducts.length}</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleAddProduct}
              className="bg-gray-900 hover:bg-black text-white px-4 py-1.5 rounded-lg text-[13px] font-semibold flex items-center gap-2 shadow-sm transition-all"
            >
              <Plus size={16} /> Добавить
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 bg-white z-10">
              <tr>
                <th className="px-8 py-3 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Товар</th>

                {/* Dynamically Inferred Columns */}
                {inferredSchema.map(field => (
                  <th key={field.key} className="px-4 py-3 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      {getFieldIcon(field.type)}
                      {field.key}
                    </div>
                  </th>
                ))}

                <th className="px-4 py-3 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Категория</th>
                <th className="px-8 py-3 border-b border-gray-100 w-[60px]"></th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(prod => {
                const prodCat = categories.find(c => c.id === prod.categoryId);
                return (
                  <tr
                    key={prod.id}
                    onClick={() => handleEditProduct(prod)}
                    className="group hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-50 last:border-none"
                  >
                    <td className="px-8 py-4 align-middle">
                      <div className="text-[14px] font-bold text-gray-900">{prod.name}</div>
                      <div className="text-[12px] text-gray-400 truncate max-w-[300px]">{prod.description}</div>
                    </td>

                    {/* Dynamic Attributes */}
                    {inferredSchema.map(field => {
                      const value = prod.attributes[field.key];
                      return (
                        <td key={field.key} className="px-4 py-4 align-middle">
                          {field.type === 'boolean' ? (
                            <div className={`w-2 h-2 rounded-full ${value ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                          ) : (
                            <span className="text-[13px] text-gray-600">{value !== undefined ? String(value) : '-'}</span>
                          )}
                        </td>
                      );
                    })}

                    <td className="px-4 py-4 align-middle">
                      <span className="text-[12px] text-gray-500 font-medium">{prodCat?.name || '-'}</span>
                    </td>

                    <td className="px-8 py-4 align-middle text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDuplicateProduct(prod); }}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50"
                          title="Дублировать"
                        >
                          <Plus size={14} />
                        </button>
                        <MoreVertical size={16} className="text-gray-300" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredProducts.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center text-gray-400 gap-3">
              <Layers size={40} className="text-gray-200" />
              <p className="text-[13px]">Товары не найдены</p>
            </div>
          )}
        </div>
      </div>

      {/* CATEGORY MODAL */}
      {isCategoryModalOpen && (
        <>
          <div className="fixed inset-0 bg-black/10 z-[60] backdrop-blur-sm" onClick={() => setIsCategoryModalOpen(false)}></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] bg-white rounded-2xl shadow-2xl z-[70] p-6 animate-in zoom-in-95 duration-200">
            <h4 className="text-[15px] font-bold text-gray-900 mb-4">
              {editingCategoryId ? 'Редактировать категорию' : 'Новая категория'}
            </h4>
            <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-400 uppercase">Название</label>
                <input
                  autoFocus
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="Название категории..."
                  className="w-full p-2.5 text-[14px] border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-indigo-300 transition-all shadow-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-400 uppercase">Описание</label>
                <textarea
                  value={categoryDescription}
                  onChange={(e) => setCategoryDescription(e.target.value)}
                  placeholder="Описание для AI..."
                  className="w-full p-2.5 text-[14px] border border-gray-200 rounded-lg outline-none h-20 resize-none shadow-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-400 uppercase">Правила (Rules)</label>
                <textarea
                  value={categoryRules}
                  onChange={(e) => setCategoryRules(e.target.value)}
                  placeholder="Инструкции для AI..."
                  className="w-full p-2.5 text-[14px] border border-gray-200 rounded-lg outline-none h-20 resize-none shadow-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-400 uppercase">Процесс (Workflow)</label>
                <textarea
                  value={categoryWorkflow}
                  onChange={(e) => setCategoryWorkflow(e.target.value)}
                  placeholder="Шаги обработки..."
                  className="w-full p-2.5 text-[14px] border border-gray-200 rounded-lg outline-none h-20 resize-none shadow-sm"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-4 py-2 text-[13px] font-medium text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveCategory}
                disabled={isSavingCategory || !categoryName.trim()}
                className="bg-gray-900 text-white px-5 py-2 rounded-lg text-[13px] font-bold hover:bg-black disabled:opacity-50 flex items-center gap-2 shadow-lg"
              >
                {isSavingCategory ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Сохранить
              </button>
            </div>
          </div>
        </>
      )}

      {/* PRODUCT EDITOR DRAWER */}
      {isProductDrawerOpen && editingProduct && (
        <>
          <div className="fixed inset-0 bg-black/5 z-40 backdrop-blur-[2px]" onClick={() => setIsProductDrawerOpen(false)}></div>
          <div className="fixed top-0 right-0 h-full w-[500px] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200 animate-in slide-in-from-right duration-300">
            <header className="h-[64px] px-6 flex items-center justify-between border-b border-gray-100">
              <h4 className="text-[15px] font-bold text-gray-900">
                {editingProduct.id !== 0 ? 'Редактировать товар' : 'Новый товар'}
              </h4>
              <button onClick={() => setIsProductDrawerOpen(false)} className="text-gray-400 hover:text-gray-900 transition-colors">
                <X size={20} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Cover & General */}
              <div className="space-y-6">

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-400 uppercase">Название</label>
                    <input
                      type="text"
                      value={editingProduct.name}
                      onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                      className="w-full p-2.5 text-[14px] border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-300 outline-none shadow-sm"
                      placeholder="Название товара..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-400 uppercase">Категория</label>
                    <select
                      value={editingProduct.categoryId || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, categoryId: e.target.value ? Number(e.target.value) : null })}
                      className="w-full p-2.5 text-[14px] border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-300 outline-none shadow-sm"
                    >
                      <option value="">Без категории</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-400 uppercase">Описание</label>
                    <textarea
                      value={editingProduct.description}
                      onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                      className="w-full p-2.5 text-[14px] border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-300 outline-none shadow-sm h-24 resize-none"
                      placeholder="Краткое описание..."
                    />
                  </div>
                </div>
              </div>

              <div className="h-px bg-gray-100" />

              {/* DYNAMIC ATTRIBUTES */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-gray-400 uppercase">Атрибуты</label>
                  {!isAddingAttr && (
                    <button
                      onClick={() => setIsAddingAttr(true)}
                      className="text-[11px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-bold hover:bg-indigo-100 transition-colors"
                    >
                      + Добавить
                    </button>
                  )}
                </div>

                {isAddingAttr && (
                  <div className="flex items-end gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 animate-in fade-in zoom-in-95">
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Название атрибута</label>
                      <input
                        autoFocus
                        value={newAttrKey}
                        onChange={(e) => setNewAttrKey(e.target.value)}
                        placeholder="Напр: Материал"
                        onKeyDown={(e) => e.key === 'Enter' && addAttribute()}
                        className="w-full p-2 text-[13px] border border-gray-200 rounded-lg outline-none bg-white focus:ring-1 focus:ring-indigo-100"
                      />
                    </div>
                    <button
                      onClick={addAttribute}
                      className="h-[38px] px-3 bg-indigo-600 text-white rounded-lg text-[12px] font-bold hover:bg-indigo-700"
                    >
                      OK
                    </button>
                    <button
                      onClick={() => { setIsAddingAttr(false); setNewAttrKey(''); }}
                      className="h-[38px] px-3 text-gray-400 hover:text-gray-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}

                <div className="space-y-4">
                  {Object.entries(editingProduct.attributes).map(([key, val]) => {
                    if (key === 'image_url') return null;
                    return (
                      <div key={key} className="flex items-center gap-2 group">
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase mb-0.5 block">{key}</label>
                          <input
                            className="w-full p-2 text-[13px] border border-gray-200 rounded-lg outline-none"
                            value={val as string}
                            onChange={(e) => setEditingProduct({
                              ...editingProduct,
                              attributes: { ...editingProduct.attributes, [key]: e.target.value }
                            })}
                          />
                        </div>
                        <button onClick={() => removeAttribute(key)} className="mt-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                  {Object.keys(editingProduct.attributes).filter(k => k !== 'image_url').length === 0 && (
                    <div className="text-center py-4 text-gray-300 text-[12px] italic">
                      Нет атрибутов
                    </div>
                  )}
                </div>
              </div>
            </div>

            <footer className="p-6 border-t border-gray-100 flex items-center justify-between bg-gray-50/30">
              <button
                onClick={() => deleteProduct(editingProduct.id)}
                className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
              >
                <Trash2 size={18} />
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsProductDrawerOpen(false)}
                  className="px-4 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={saveProduct}
                  disabled={isSaving}
                  className="px-6 py-2 bg-gray-900 text-white rounded-lg text-[13px] font-bold shadow-lg hover:bg-black transition-all flex items-center gap-2"
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Сохранить
                </button>
              </div>
            </footer>
          </div>
        </>
      )}
    </div>
  );
};
