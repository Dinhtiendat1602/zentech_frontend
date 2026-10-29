import { useEffect, useMemo, useRef, useState } from 'react';
import { adminRequest, formatAdminPrice } from '../adminApi.js';
import { getProductImage } from '../../../data/products.js';
import AdminPagination from '../AdminPagination.jsx';
import styles from './ProductAdmin.module.css';

export const DEFAULT_CAMERA_SPECS = [
  { specName: 'Cảm biến', specValue: '', placeholder: 'VD: 33.0 MP Full-frame Exmor R BSI CMOS' },
  { specName: 'Bộ xử lý hình ảnh', specValue: '', placeholder: 'VD: BIONZ XR, DIGIC X...' },
  { specName: 'Khả năng quay video', specValue: '', placeholder: 'VD: 4K 60p 10-bit 4:2:2, S-Cinetone' },
  { specName: 'Chống rung (IBIS)', specValue: '', placeholder: 'VD: 5 trục, bù 5.5 stops' },
  { specName: 'Dải ISO', specValue: '', placeholder: 'VD: 100 - 51,200 (mở rộng 50 - 204,800)' },
  { specName: 'Ngàm ống kính', specValue: '', placeholder: 'VD: Sony E-mount, Canon RF...' },
  { specName: 'Màn hình', specValue: '', placeholder: 'VD: LCD cảm ứng xoay lật đa góc 3.0 inch' },
  { specName: 'Trọng lượng', specValue: '', placeholder: 'VD: Khoảng 658g (kèm pin & thẻ)' },
];

export const DEFAULT_LENS_SPECS = [
  { specName: 'Ngàm ống kính', specValue: '', placeholder: 'VD: Sony E-mount, Canon RF, Nikon Z...' },
  { specName: 'Tiêu cự', specValue: '', placeholder: 'VD: 24-70mm, 50mm, 16-35mm...' },
  { specName: 'Khẩu độ tối đa', specValue: '', placeholder: 'VD: f/1.4, f/2.8, f/4...' },
  { specName: 'Khẩu độ tối thiểu', specValue: '', placeholder: 'VD: f/16, f/22...' },
  { specName: 'Đường kính Filter', specValue: '', placeholder: 'VD: 67 mm, 77 mm, 82 mm...' },
  { specName: 'Số lá khẩu', specValue: '', placeholder: 'VD: 9 lá tròn, 11 lá tròn...' },
  { specName: 'Khoảng cách lấy nét gần nhất', specValue: '', placeholder: 'VD: 0.19 m, 0.38 m...' },
  { specName: 'Trọng lượng', specValue: '', placeholder: 'VD: Khoảng 695 g, 845 g...' },
];

export const DEFAULT_PRODUCT_SPECS = DEFAULT_CAMERA_SPECS;

export const prepareSpecsForForm = (existingSpecs = [], isLens = false) => {
  const defaultList = isLens ? DEFAULT_LENS_SPECS : DEFAULT_CAMERA_SPECS;
  const existingMap = new Map();
  const customSpecs = [];
  const defaultNamesSet = new Set(defaultList.map((s) => s.specName.toLowerCase()));

  (existingSpecs || []).forEach((s) => {
    const key = (s.specName || '').trim().toLowerCase();
    if (defaultNamesSet.has(key)) {
      existingMap.set(key, s.specValue || '');
    } else if (s.specName?.trim()) {
      customSpecs.push({ specName: s.specName.trim(), specValue: s.specValue || '' });
    }
  });

  const standardRows = defaultList.map((def) => ({
    specName: def.specName,
    specValue: existingMap.get(def.specName.toLowerCase()) || '',
  }));

  return [...standardRows, ...customSpecs];
};

export const getSpecPlaceholder = (name) => {
  const norm = (name || '').trim().toLowerCase();
  const foundCamera = DEFAULT_CAMERA_SPECS.find((d) => d.specName.toLowerCase() === norm);
  if (foundCamera) return foundCamera.placeholder;
  const foundLens = DEFAULT_LENS_SPECS.find((d) => d.specName.toLowerCase() === norm);
  if (foundLens) return foundLens.placeholder;
  return 'Giá trị thông số kỹ thuật...';
};

function ProductAdmin() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formCategoryId, setFormCategoryId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingStep, setSavingStep] = useState('');
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [notice, setNotice] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [specs, setSpecs] = useState(DEFAULT_CAMERA_SPECS.map((s) => ({ specName: s.specName, specValue: '' })));

  const isLens = useMemo(() => {
    const cat = categories.find((c) => String(c.id) === String(formCategoryId));
    if (cat && /ống kính|lens/i.test(cat.name || '')) return true;
    if (editing?.type === 'Ống kính') return true;
    if (/ống kính|lens/i.test(editing?.category || '')) return true;
    if (/ống kính|lens/i.test(editing?.name || '')) return true;
    return false;
  }, [formCategoryId, categories, editing]);

  // Image upload states (Thumbnail)
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Sub-images (Ảnh phụ) states
  const [subImages, setSubImages] = useState([]);
  const [subImageUploadLoading, setSubImageUploadLoading] = useState(false);
  const [newSubImageUrl, setNewSubImageUrl] = useState('');
  const subFileInputRef = useRef(null);

  const addSpecRow = () => {
    setSpecs((prev) => [...prev, { specName: '', specValue: '' }]);
  };

  const removeSpecRow = (index) => {
    setSpecs((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSpecField = (index, field, value) => {
    setSpecs((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const moveSpecRow = (index, direction) => {
    setSpecs((prev) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const applyCameraPreset = () => {
    const cameraPreset = [
      { specName: 'Cảm biến', specValue: '33.0 MP Full-frame Exmor R BSI CMOS' },
      { specName: 'Bộ xử lý hình ảnh', specValue: 'BIONZ XR' },
      { specName: 'Khả năng quay video', specValue: '4K 60p 10-bit 4:2:2, S-Cinetone' },
      { specName: 'Chống rung (IBIS)', specValue: '5 trục, bù 5.5 stops' },
      { specName: 'Dải ISO', specValue: '100 - 51,200 (mở rộng 50 - 204,800)' },
      { specName: 'Ngàm ống kính', specValue: 'Sony E-mount' },
      { specName: 'Màn hình', specValue: 'LCD cảm ứng xoay lật đa góc 3.0 inch' },
      { specName: 'Trọng lượng', specValue: 'Khoảng 658g (kèm pin & thẻ)' },
    ];
    setSpecs(cameraPreset);
  };

  const applyLensPreset = () => {
    const lensPreset = [
      { specName: 'Ngàm ống kính', specValue: 'Sony E-mount' },
      { specName: 'Tiêu cự', specValue: '24-70mm' },
      { specName: 'Khẩu độ tối đa', specValue: 'f/2.8' },
      { specName: 'Khẩu độ tối thiểu', specValue: 'f/22' },
      { specName: 'Đường kính Filter', specValue: '82 mm' },
      { specName: 'Số lá khẩu', specValue: '11 lá tròn' },
      { specName: 'Khoảng cách lấy nét gần nhất', specValue: '0.21 m' },
      { specName: 'Trọng lượng', specValue: '695 g' },
    ];
    setSpecs(lensPreset);
  };

  const applyDefaultSpecs = () => {
    if (isLens) {
      setSpecs(DEFAULT_LENS_SPECS.map((s) => ({ specName: s.specName, specValue: '' })));
    } else {
      setSpecs(DEFAULT_CAMERA_SPECS.map((s) => ({ specName: s.specName, specValue: '' })));
    }
  };

  const handleCategoryChange = (newCatId) => {
    setFormCategoryId(newCatId);
    const cat = categories.find((c) => String(c.id) === String(newCatId));
    const nowIsLens = /ống kính|lens/i.test(cat?.name || '');
    if (!editing) {
      const hasAnyValue = specs.some((s) => s.specValue && s.specValue.trim());
      if (!hasAnyValue) {
        if (nowIsLens) {
          setSpecs(DEFAULT_LENS_SPECS.map((s) => ({ specName: s.specName, specValue: '' })));
        } else {
          setSpecs(DEFAULT_CAMERA_SPECS.map((s) => ({ specName: s.specName, specValue: '' })));
        }
      }
    }
  };

  const clearAllSpecs = () => {
    if (specs.length && window.confirm('Xóa toàn bộ các dòng thông số kỹ thuật hiện tại?')) {
      setSpecs([]);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const [productRows, categoryRows] = await Promise.all([
        adminRequest(`/products/admin/list?q=${encodeURIComponent(query)}${category === 'all' ? '' : `&categoryId=${category}`}`),
        adminRequest('/products/admin/categories'),
      ]);
      setProducts(productRows);
      setCategories(categoryRows);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const search = `?q=${encodeURIComponent(query)}${category === 'all' ? '' : `&categoryId=${category}`}`;
    Promise.all([adminRequest(`/products/admin/list${search}`), adminRequest('/products/admin/categories')])
      .then(([productRows, categoryRows]) => {
        if (!active) return;
        setProducts(productRows);
        setCategories(categoryRows);
        setError('');
      })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query, category]);

  useEffect(() => {
    setPage(1);
  }, [query, category]);

  const filteredProducts = useMemo(() => products, [products]);

  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, page]);

  const openModal = (product = null) => {
    setEditing(product);
    setModalError('');
    setSavingStep('');
    const initialCatId = product?.categoryId ? String(product.categoryId) : '';
    setFormCategoryId(initialCatId);

    const productIsLens = Boolean(
      product?.type === 'Ống kính' ||
      /ống kính|lens/i.test(product?.category || '') ||
      /ống kính|lens/i.test(product?.name || '') ||
      categories.some((c) => String(c.id) === String(initialCatId) && /ống kính|lens/i.test(c.name || ''))
    );

    if (product) {
      setPreviewUrl(product.image || '');
      setSelectedFile(null);
      setSubImages(
        Array.isArray(product.subImages) && product.subImages.length > 0
          ? [...product.subImages]
          : (Array.isArray(product.images)
              ? product.images.filter((img) => img !== (product.image || product.thumbnail))
              : [])
      );
      setNewSubImageUrl('');
      if (Array.isArray(product.specs)) {
        setSpecs(prepareSpecsForForm(product.specs, productIsLens));
      } else {
        adminRequest(`/products/${product.id}/specs`)
          .then((loaded) => {
            if (Array.isArray(loaded)) {
              setSpecs(prepareSpecsForForm(loaded, productIsLens));
            } else {
              setSpecs(
                productIsLens
                  ? DEFAULT_LENS_SPECS.map((s) => ({ specName: s.specName, specValue: '' }))
                  : DEFAULT_CAMERA_SPECS.map((s) => ({ specName: s.specName, specValue: '' }))
              );
            }
          })
          .catch(() =>
            setSpecs(
              productIsLens
                ? DEFAULT_LENS_SPECS.map((s) => ({ specName: s.specName, specValue: '' }))
                : DEFAULT_CAMERA_SPECS.map((s) => ({ specName: s.specName, specValue: '' }))
            )
          );
      }
    } else {
      setPreviewUrl('');
      setSelectedFile(null);
      setSubImages([]);
      setNewSubImageUrl('');
      setSpecs(DEFAULT_CAMERA_SPECS.map((s) => ({ specName: s.specName, specValue: '' })));
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setSelectedFile(null);
    setPreviewUrl('');
    setSubImages([]);
    setNewSubImageUrl('');
    setModalError('');
    setFormCategoryId('');
    setSpecs(DEFAULT_CAMERA_SPECS.map((s) => ({ specName: s.specName, specValue: '' })));
  };

  const processFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setModalError('Chỉ chấp nhận file hình ảnh (JPG, PNG, WEBP, GIF, SVG).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setModalError('Dung lượng ảnh không được vượt quá 10MB.');
      return;
    }
    setModalError('');
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    processFile(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer?.files?.[0];
    processFile(file);
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddSubImageUrl = (e) => {
    e?.preventDefault?.();
    const trimmed = (newSubImageUrl || '').trim();
    if (!trimmed) return;
    if (subImages.includes(trimmed)) {
      setModalError('Ảnh này đã có trong danh sách ảnh phụ.');
      return;
    }
    setSubImages((prev) => [...prev, trimmed]);
    setNewSubImageUrl('');
  };

  const handleRemoveSubImage = (indexToRemove) => {
    setSubImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubFilesChange = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    setSubImageUploadLoading(true);
    setModalError('');
    try {
      const uploadedUrls = [];
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          throw new Error(`File "${file.name}" không phải định dạng hình ảnh hợp lệ.`);
        }
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`File "${file.name}" vượt quá dung lượng tối đa 10MB.`);
        }
        const uploadFormData = new FormData();
        uploadFormData.append('image', file);
        const res = await adminRequest('/upload', {
          method: 'POST',
          body: uploadFormData,
        });
        if (res?.url) {
          uploadedUrls.push(res.url);
        }
      }
      setSubImages((prev) => [...prev, ...uploadedUrls]);
    } catch (err) {
      setModalError(err.message || 'Lỗi khi tải ảnh phụ lên máy chủ.');
    } finally {
      setSubImageUploadLoading(false);
      if (subFileInputRef.current) subFileInputRef.current.value = '';
    }
  };

  const saveProduct = async (event) => {
    event.preventDefault();
    setModalError('');

    if (!selectedFile && !previewUrl) {
      setModalError('Vui lòng tải lên ảnh sản phẩm.');
      return;
    }

    setSaving(true);
    const form = new FormData(event.currentTarget);

    try {
      let finalThumbnail = previewUrl;

      // Upload file to server first if new file is picked
      if (selectedFile) {
        setSavingStep('Đang tải ảnh lên máy chủ...');
        const uploadFormData = new FormData();
        uploadFormData.append('image', selectedFile);

        const uploadRes = await adminRequest('/upload', {
          method: 'POST',
          body: uploadFormData,
        });

        if (!uploadRes?.url) {
          throw new Error('Không nhận được đường dẫn ảnh sau khi tải lên.');
        }
        finalThumbnail = uploadRes.url;
      }

      setSavingStep('Đang lưu thông tin sản phẩm...');
      const validSpecs = specs
        .filter((s) => s.specName && s.specName.trim())
        .map((s, index) => ({
          specName: s.specName.trim(),
          specValue: (s.specValue || '').trim(),
          sortOrder: index + 1,
        }));

      const payload = {
        name: String(form.get('name') || '').trim(),
        categoryId: Number(form.get('categoryId')),
        price: Number(form.get('price')),
        salePrice: form.get('salePrice') === '' ? null : Number(form.get('salePrice')),
        stock: Number(form.get('stock')),
        thumbnail: finalThumbnail,
        subImages,
        description: form.get('description')?.trim() || null,
        isFeatured: form.get('isFeatured') === 'on',
        specs: validSpecs,
      };

      if (editing) {
        await adminRequest(`/products/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await adminRequest('/products', { method: 'POST', body: JSON.stringify(payload) });
      }

      setModalOpen(false);
      setNotice(editing ? 'Đã cập nhật sản phẩm thành công.' : 'Đã thêm sản phẩm mới vào kho.');
      await loadProducts();
    } catch (requestError) {
      setModalError(requestError.message);
    } finally {
      setSaving(false);
      setSavingStep('');
    }
  };

  const deleteProduct = async (product) => {
    if (!window.confirm(`Xóa sản phẩm “${product.name}”?`)) return;
    setError('');
    try {
      await adminRequest(`/products/${product.id}`, { method: 'DELETE' });
      setNotice('Đã xóa sản phẩm.');
      await loadProducts();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const lowStock = products.filter((item) => item.stock > 0 && item.stock < 10).length;
  const outOfStock = products.filter((item) => item.stock === 0).length;

  return (
    <main className="adminContent">
      <div className="adminPageHeading">
        <div>
          <span className="adminEyebrow">KHO HÀNG / DANH MỤC</span>
          <h1>Quản lý sản phẩm</h1>
          <p>Sản phẩm được lưu trực tiếp trong cơ sở dữ liệu cửa hàng.</p>
        </div>
        <button className="adminButton adminButtonPrimary" type="button" onClick={() => openModal()}>
          <i className="fa-solid fa-plus" /> Thêm sản phẩm
        </button>
      </div>

      {error && (
        <p className="adminError" role="alert">
          <i className="fa-solid fa-circle-exclamation" /> {error}
        </p>
      )}
      {notice && (
        <p className="adminNotice" role="status">
          <i className="fa-solid fa-circle-check" /> {notice}
        </p>
      )}

      <section className="adminStats">
        <article className="adminStat">
          <span className="adminStatLabel">Tổng sản phẩm</span>
          <strong className="adminStatValue">{products.length}</strong>
        </article>
        <article className="adminStat">
          <span className="adminStatLabel">Đang có hàng</span>
          <strong className="adminStatValue">{products.filter((item) => item.stock > 0).length}</strong>
        </article>
        <article className="adminStat">
          <span className="adminStatLabel">Sắp hết hàng</span>
          <strong className="adminStatValue">{lowStock}</strong>
        </article>
        <article className="adminStat">
          <span className="adminStatLabel">Hết hàng</span>
          <strong className="adminStatValue">{outOfStock}</strong>
        </article>
      </section>

      <div className="adminToolbar">
        <label className="adminSearch">
          <i className="fa-solid fa-magnifying-glass" />
          <input
            value={query}
            onChange={(event) => {
              setLoading(true);
              setQuery(event.target.value);
            }}
            placeholder="Tìm tên sản phẩm..."
          />
        </label>
        <select
          className="adminSelect"
          aria-label="Lọc danh mục"
          value={category}
          onChange={(event) => {
            setLoading(true);
            setCategory(event.target.value);
          }}
        >
          <option value="all">Tất cả danh mục</option>
          {categories
            .filter((item) => item.type === 'category')
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
        </select>
        <button
          className="adminButton"
          type="button"
          onClick={() => {
            setLoading(true);
            setQuery('');
            setCategory('all');
          }}
        >
          <i className="fa-solid fa-rotate-left" /> Đặt lại
        </button>
      </div>

      <section className="adminPanel">
        <div className="adminTableWrap">
          <table className="adminTable">
            <thead>
              <tr>
                <th>SẢN PHẨM</th>
                <th>MÃ SẢN PHẨM</th>
                <th>DANH MỤC</th>
                <th>GIÁ</th>
                <th>TỒN KHO</th>
                <th>TRẠNG THÁI</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className="adminProductCell">
                      <img
                        className="adminProductThumb"
                        src={getProductImage(product.image, 160)}
                        alt={product.name}
                        loading="lazy"
                      />
                      <span className="adminProductName">{product.name}</span>
                    </div>
                  </td>
                  <td>{product.slug}</td>
                  <td>{product.category || 'Chung'}</td>
                  <td>{formatAdminPrice(product.salePrice ?? product.price)}</td>
                  <td>{product.stock}</td>
                  <td>
                    <span
                      className={`adminStatus ${
                        product.stock === 0 ? 'muted' : product.stock < 10 ? 'warning' : ''
                      }`}
                    >
                      {product.stock === 0 ? 'Hết hàng' : product.stock < 10 ? 'Sắp hết hàng' : 'Đang bán'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="adminIconButton"
                      type="button"
                      onClick={() => openModal(product)}
                      title="Sửa sản phẩm"
                      aria-label={`Sửa ${product.name}`}
                    >
                      <i className="fa-solid fa-pen" />
                    </button>{' '}
                    <button
                      className="adminIconButton danger"
                      type="button"
                      onClick={() => deleteProduct(product)}
                      title="Xóa sản phẩm"
                      aria-label={`Xóa ${product.name}`}
                    >
                      <i className="fa-regular fa-trash-can" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <p className="adminEmpty">Đang tải sản phẩm...</p>}
          {!loading && !filteredProducts.length && <p className="adminEmpty">Chưa có sản phẩm phù hợp.</p>}
        </div>

        {!loading && filteredProducts.length > 0 && (
          <AdminPagination
            currentPage={page}
            totalItems={filteredProducts.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            itemName="sản phẩm"
          />
        )}
      </section>

      {modalOpen && (
        <div
          className="adminModalBackdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) closeModal();
          }}
        >
          <section className={`adminModal ${styles.productModal}`} role="dialog" aria-modal="true" aria-labelledby="product-modal-title">
            <header className="adminModalHead">
              <div>
                <h2 id="product-modal-title">{editing ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm mới'}</h2>
                <p>Thông tin và ảnh sản phẩm sẽ được lưu trực tiếp vào cơ sở dữ liệu.</p>
              </div>
              <button
                className="adminIconButton"
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Đóng"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </header>

            {modalError && (
              <p className="adminError" role="alert" style={{ marginBottom: 14 }}>
                <i className="fa-solid fa-circle-exclamation" /> {modalError}
              </p>
            )}

            <form onSubmit={saveProduct}>
              <div className="adminFormGrid">
                <label className="adminFormField wide">
                  <span>Tên sản phẩm</span>
                  <input
                    name="name"
                    defaultValue={editing?.name}
                    placeholder="VD: Máy ảnh Sony Alpha A7 IV"
                    maxLength="255"
                    required
                  />
                </label>

                <label className="adminFormField">
                  <span>Danh mục</span>
                  <select
                    name="categoryId"
                    value={formCategoryId}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    required
                  >
                    <option value="" disabled>
                      Chọn danh mục
                    </option>
                    {categories
                      .filter((item) => item.type === 'category')
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="adminFormField">
                  <span>Tồn kho (số lượng)</span>
                  <input
                    name="stock"
                    type="number"
                    min="0"
                    step="1"
                    defaultValue={editing?.stock ?? 10}
                    required
                  />
                </label>

                <label className="adminFormField">
                  <span>Giá gốc (VNĐ)</span>
                  <input
                    name="price"
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="VD: 45000000"
                    defaultValue={editing?.price}
                    required
                  />
                </label>

                <label className="adminFormField">
                  <span>Giá khuyến mãi (không bắt buộc)</span>
                  <input
                    name="salePrice"
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="VD: 42000000"
                    defaultValue={editing?.salePrice ?? ''}
                  />
                </label>

                {/* Phần tải lên ảnh sản phẩm (Upload file) */}
                <div className="adminFormField wide">
                  <span style={{ fontSize: 10, color: 'var(--admin-sub, #8c988e)', marginBottom: 2 }}>
                    Ảnh đại diện sản phẩm <strong style={{ color: '#a8f000' }}>*</strong> (Tải file từ máy tính)
                  </span>

                  {!previewUrl ? (
                    <div
                      className={`${styles.uploadDropzone} ${isDragging ? styles.dragging : ''}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                        onChange={handleFileChange}
                      />
                      <i className={`fa-solid fa-cloud-arrow-up ${styles.uploadIcon}`} />
                      <div className={styles.uploadTitle}>Nhấn để chọn ảnh hoặc kéo thả vào đây</div>
                      <div className={styles.uploadSubtitle}>Hỗ trợ JPG, PNG, WEBP, GIF (Tối đa 10MB)</div>
                    </div>
                  ) : (
                    <div className={styles.previewContainer}>
                      <img
                        className={styles.previewImage}
                        src={getProductImage(previewUrl, 200)}
                        alt="Preview"
                      />
                      <div className={styles.previewDetails}>
                        <span className={styles.previewName}>
                          {selectedFile ? selectedFile.name : 'Ảnh hiện tại của sản phẩm'}
                        </span>
                        <span className={styles.previewMeta}>
                          {selectedFile
                            ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                            : 'Đang lưu trên hệ thống'}
                        </span>
                        <div className={styles.previewActions} style={{ marginTop: 4 }}>
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <i className="fa-solid fa-arrows-rotate" /> Đổi ảnh khác
                          </button>
                          <button
                            type="button"
                            className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                            onClick={handleRemoveImage}
                          >
                            <i className="fa-regular fa-trash-can" /> Gỡ ảnh
                          </button>
                        </div>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        style={{ display: 'none' }}
                        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                        onChange={handleFileChange}
                      />
                    </div>
                  )}
                </div>

                {/* Phần quản lý Ảnh phụ sản phẩm (Sub-images / Thư viện ảnh góc chụp chi tiết) */}
                <div className="adminFormField wide">
                  <div className={styles.subImagesHeader}>
                    <div>
                      <span className={styles.subImagesTitle}>
                        <i className="fa-regular fa-images" /> Thư viện ảnh phụ (Góc chụp sản phẩm)
                      </span>
                      <span className={styles.subImagesSubtitle}>
                        Hiển thị dưới ảnh đại diện tại trang chi tiết. Tải từ máy hoặc dán link ảnh từ mạng.
                      </span>
                    </div>
                    <span className={styles.subImagesBadge}>{subImages.length} ảnh phụ</span>
                  </div>

                  {/* Thanh công cụ: Dán link ảnh từ mạng & Nút tải ảnh từ máy */}
                  <div className={styles.subImagesActions}>
                    <div className={styles.subUrlInputWrap}>
                      <input
                        type="url"
                        placeholder="Dán link ảnh từ mạng (VD: https://images.unsplash.com/...)"
                        value={newSubImageUrl}
                        onChange={(e) => setNewSubImageUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSubImageUrl(e);
                          }
                        }}
                        className={styles.subUrlInput}
                      />
                      <button
                        type="button"
                        className={styles.subAddUrlBtn}
                        onClick={handleAddSubImageUrl}
                        disabled={!newSubImageUrl.trim()}
                      >
                        <i className="fa-solid fa-plus" /> Thêm URL
                      </button>
                    </div>

                    <button
                      type="button"
                      className={styles.subUploadBtn}
                      onClick={() => subFileInputRef.current?.click()}
                      disabled={subImageUploadLoading}
                    >
                      <i className={subImageUploadLoading ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-cloud-arrow-up"} />
                      {subImageUploadLoading ? 'Đang tải lên...' : 'Tải file từ máy'}
                    </button>
                    <input
                      ref={subFileInputRef}
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                      style={{ display: 'none' }}
                      onChange={handleSubFilesChange}
                    />
                  </div>

                  {/* Lưới xem trước các ảnh phụ */}
                  {subImages.length > 0 ? (
                    <div className={styles.subImagesGrid}>
                      {subImages.map((url, idx) => (
                        <div key={`${url}-${idx}`} className={styles.subImageCard}>
                          <img
                            src={getProductImage(url, 160)}
                            alt={`Ảnh phụ ${idx + 1}`}
                            className={styles.subImageThumb}
                          />
                          <span className={styles.subImageIndex}>#{idx + 1}</span>
                          <button
                            type="button"
                            className={styles.subImageDeleteBtn}
                            onClick={() => handleRemoveSubImage(idx)}
                            title="Gỡ ảnh phụ này"
                          >
                            <i className="fa-solid fa-xmark" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.subImagesEmpty}>
                      <i className="fa-regular fa-image" />
                      <span>Chưa có ảnh phụ nào. Bạn có thể dán link ảnh từ mạng hoặc tải file ảnh từ máy.</span>
                    </div>
                  )}
                </div>

                {/* Phần quản lý Thông số kỹ thuật sản phẩm */}
                <div className={styles.specsSection}>
                  <div className={styles.specsHeader}>
                    <div className={styles.specsTitleWrap}>
                      <h3 className={styles.specsTitle}>
                        <i className="fa-solid fa-sliders" /> Thông số kỹ thuật
                        <span className={styles.specsCountBadge}>{specs.length} thông số</span>
                      </h3>
                      <p className={styles.specsSubtitle}>
                        Thông số sẽ hiển thị trên Drawer bên phải tại trang chi tiết sản phẩm.
                      </p>
                    </div>
                    <div className={styles.specsActions}>
                      <button
                        type="button"
                        className={`${styles.specBtnSmall} ${styles.specBtnPrimary}`}
                        onClick={addSpecRow}
                        id="add-spec-btn"
                      >
                        <i className="fa-solid fa-plus" /> Thêm dòng
                      </button>
                      <button
                        type="button"
                        className={styles.specBtnSmall}
                        onClick={applyDefaultSpecs}
                        title={isLens ? 'Điền 8 trường thông số ống kính tiêu chuẩn' : 'Điền 8 trường thông số máy ảnh tiêu chuẩn'}
                      >
                        <i className="fa-solid fa-list-check" /> 8 Trường tiêu chuẩn
                      </button>
                      {isLens ? (
                        <button
                          type="button"
                          className={styles.specBtnSmall}
                          onClick={applyLensPreset}
                          title="Điền dữ liệu mẫu thông số ống kính"
                        >
                          <i className="fa-solid fa-circle-dot" /> Mẫu Ống kính
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={styles.specBtnSmall}
                          onClick={applyCameraPreset}
                          title="Điền dữ liệu mẫu máy ảnh Sony"
                        >
                          <i className="fa-solid fa-camera" /> Mẫu Máy ảnh
                        </button>
                      )}
                      {specs.length > 0 && (
                        <button
                          type="button"
                          className={`${styles.specBtnSmall} ${styles.specBtnDanger}`}
                          onClick={clearAllSpecs}
                          title="Xóa toàn bộ các dòng thông số"
                        >
                          <i className="fa-solid fa-trash-can" /> Xóa hết
                        </button>
                      )}
                    </div>
                  </div>

                  {specs.length > 0 ? (
                    <div className={styles.specsList}>
                      {specs.map((item, index) => (
                        <div key={index} className={styles.specRow}>
                          <span className={styles.specIndex}>#{index + 1}</span>
                          <input
                            type="text"
                            className={styles.specInput}
                            placeholder="Tên thông số (VD: Cảm biến)"
                            value={item.specName}
                            onChange={(e) => updateSpecField(index, 'specName', e.target.value)}
                            maxLength={100}
                          />
                          <input
                            type="text"
                            className={styles.specInput}
                            placeholder={getSpecPlaceholder(item.specName)}
                            value={item.specValue}
                            onChange={(e) => updateSpecField(index, 'specValue', e.target.value)}
                            maxLength={255}
                          />
                          <div className={styles.specRowActions}>
                            <button
                              type="button"
                              className={styles.specRowBtn}
                              onClick={() => moveSpecRow(index, -1)}
                              disabled={index === 0}
                              title="Di chuyển lên trên"
                              aria-label="Lên"
                            >
                              <i className="fa-solid fa-chevron-up" />
                            </button>
                            <button
                              type="button"
                              className={styles.specRowBtn}
                              onClick={() => moveSpecRow(index, 1)}
                              disabled={index === specs.length - 1}
                              title="Di chuyển xuống dưới"
                              aria-label="Xuống"
                            >
                              <i className="fa-solid fa-chevron-down" />
                            </button>
                            <button
                              type="button"
                              className={`${styles.specRowBtn} ${styles.specRowBtnDelete}`}
                              onClick={() => removeSpecRow(index)}
                              title="Xóa thông số này"
                              aria-label="Xóa"
                            >
                              <i className="fa-regular fa-trash-can" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.specsEmpty}>
                      <i className="fa-solid fa-sliders" />
                      <p>Chưa có thông số kỹ thuật nào được thêm.</p>
                      <div style={{ marginTop: 8, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className={`${styles.specBtnSmall} ${styles.specBtnPrimary}`}
                          onClick={applyDefaultSpecs}
                        >
                          <i className="fa-solid fa-list-check" /> Nạp 8 trường tiêu chuẩn
                        </button>
                        {isLens ? (
                          <button
                            type="button"
                            className={styles.specBtnSmall}
                            onClick={applyLensPreset}
                          >
                            <i className="fa-solid fa-circle-dot" /> Nạp Mẫu Ống kính
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={styles.specBtnSmall}
                            onClick={applyCameraPreset}
                          >
                            <i className="fa-solid fa-camera" /> Nạp Mẫu Máy ảnh
                          </button>
                        )}
                        <button
                          type="button"
                          className={styles.specBtnSmall}
                          onClick={addSpecRow}
                        >
                          <i className="fa-solid fa-plus" /> Thêm dòng tùy chỉnh
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <label className="adminFormField wide">
                  <span>Mô tả sản phẩm</span>
                  <textarea
                    name="description"
                    rows="3"
                    placeholder="Mô tả tóm tắt tính năng nổi bật..."
                    defaultValue={editing?.description || ''}
                  />
                </label>

                <label className="adminCheckField wide">
                  <input
                    name="isFeatured"
                    type="checkbox"
                    defaultChecked={editing ? editing.isFeatured : true}
                  />{' '}
                  Đánh dấu là sản phẩm nổi bật (hiển thị ưu tiên)
                </label>
              </div>

              <div className="adminModalActions">
                <button className="adminButton" type="button" disabled={saving} onClick={closeModal}>
                  Hủy
                </button>
                <button className="adminButton adminButtonPrimary" type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }} />
                      {savingStep || 'Đang lưu...'}
                    </>
                  ) : (
                    'Lưu sản phẩm'
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default ProductAdmin;
