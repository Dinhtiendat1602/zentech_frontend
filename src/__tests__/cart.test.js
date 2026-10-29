/**
 * ==============================================================================
 * DỰ ÁN: ZenTech (ZenStore) - iViettech Project Document
 * FILE: frontend/src/__tests__/cart.test.js
 * MÔ TẢ: Kịch bản kiểm thử tự động phân hệ Giỏ hàng (Cart State & Logic)
 * CÔNG CỤ MINH HỌA: Vitest / React Testing Library
 * ==============================================================================
 */

describe('PHÂN HỆ GIỎ HÀNG & MUA SẮM (SHOPPING CART LOGIC)', () => {

  /**
   * TC-CART-01: Thêm sản phẩm vào giỏ hàng
   * Các bước: Chọn số lượng 2 trên trang chi tiết máy ảnh, bấm "Thêm vào giỏ"
   * Kết quả mong đợi: Badge giỏ hàng trên header nhảy số tăng thêm 2, Toast thông báo thành công
   */
  test('TC-CART-01: Thêm máy ảnh với số lượng 2 -> Tổng số lượng giỏ hàng tăng thêm 2', () => {
    let cart = [];

    const productToAdd = {
      id: 'sony-a7-iv',
      name: 'Sony Alpha A7 IV',
      price: 45000000,
      image: '/uploads/product-1791545713800-772092198.jpg',
    };

    // Giả lập hàm thêm vào giỏ hàng
    const addItem = (item, quantity = 1) => {
      const existing = cart.find((i) => i.id === item.id);
      if (existing) {
        existing.quantity += quantity;
      } else {
        cart.push({ ...item, quantity });
      }
    };

    // Thao tác: Thêm 2 máy ảnh
    addItem(productToAdd, 2);

    // Tính toán badge trên Header
    const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
    const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);

    // Kiểm tra kết quả mong đợi
    expect(itemCount).toBe(2);
    expect(subtotal).toBe(90000000);
    expect(cart.length).toBe(1);
  });

  test('TC-CART-02: Cập nhật tăng giảm số lượng sản phẩm trong giỏ', () => {
    let cart = [
      { id: 'sony-a7-iv', name: 'Sony Alpha A7 IV', price: 45000000, quantity: 2 },
    ];

    const updateQuantity = (id, newQty) => {
      cart = cart.map((item) => (item.id === id ? { ...item, quantity: newQty } : item));
    };

    // Tăng lên 3 chiếc
    updateQuantity('sony-a7-iv', 3);
    expect(cart[0].quantity).toBe(3);

    // Giảm về 1 chiếc
    updateQuantity('sony-a7-iv', 1);
    expect(cart[0].quantity).toBe(1);
  });

  test('TC-CART-03: Xóa sản phẩm khỏi giỏ hàng', () => {
    let cart = [
      { id: 'sony-a7-iv', name: 'Sony Alpha A7 IV', price: 45000000, quantity: 1 },
      { id: 'nikon-z8', name: 'Nikon Z8', price: 79000000, quantity: 1 },
    ];

    const removeItem = (id) => {
      cart = cart.filter((item) => item.id !== id);
    };

    // Xóa máy ảnh Sony khỏi giỏ
    removeItem('sony-a7-iv');

    expect(cart.length).toBe(1);
    expect(cart[0].id).toBe('nikon-z8');
  });

});
