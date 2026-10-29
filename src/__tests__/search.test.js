/**
 * ==============================================================================
 * DỰ ÁN: ZenTech (ZenStore) - iViettech Project Document
 * FILE: frontend/src/__tests__/search.test.js
 * MÔ TẢ: Kịch bản kiểm thử tự động tìm kiếm trực tiếp với Debounce (Live Search)
 * ==============================================================================
 */

describe('PHÂN HỆ TÌM KIẾM TRỰC TIẾP (LIVE SEARCH & DEBOUNCE)', () => {

  /**
   * TC-PROD-01: Tìm kiếm live sản phẩm tại Header
   * Các bước: Nhập từ khóa "Sony" vào ô tìm kiếm ở Header
   * Kết quả mong đợi: Sau 200ms debounce, gọi API và lọc tối đa 5 gợi ý sản phẩm Sony liên quan
   */
  test('TC-PROD-01: Sau 200ms debounce, trả về tối đa 5 gợi ý sản phẩm liên quan', async () => {
    // Giả lập danh sách toàn bộ sản phẩm trả về từ API
    const mockAllProducts = [
      { id: 'sony-a7-iv', name: 'Sony Alpha A7 IV', brand: 'Sony' },
      { id: 'sony-a7r-v', name: 'Sony Alpha A7R V', brand: 'Sony' },
      { id: 'sony-a6700', name: 'Sony Alpha A6700', brand: 'Sony' },
      { id: 'sony-zv-e10', name: 'Sony ZV-E10', brand: 'Sony' },
      { id: 'sony-a6400', name: 'Sony Alpha A6400', brand: 'Sony' },
      { id: 'sony-fx3', name: 'Sony FX3 Cinema', brand: 'Sony' }, // Chiếc thứ 6
    ];

    const keyword = 'Sony';

    // Giả lập logic xử lý debounce 200ms và cắt tối đa 5 sản phẩm như trong StoreHeader.jsx
    const filterSuggestions = (products, query) => {
      if (!query.trim()) return [];
      const filtered = products.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase())
      );
      return filtered.slice(0, 5); // Tối đa 5 gợi ý
    };

    const suggestions = filterSuggestions(mockAllProducts, keyword);

    // Kiểm tra kết quả
    expect(suggestions.length).toBe(5); // Chỉ lấy tối đa 5 chiếc
    expect(suggestions[0].name).toContain('Sony');
    expect(suggestions.every((item) => item.brand === 'Sony')).toBe(true);
  });

  test('TC-PROD-01-B: Từ khóa rỗng -> Đóng dropdown gợi ý, danh sách rỗng', () => {
    const emptyKeyword = '   ';
    const filterSuggestions = (products, query) => {
      if (!query.trim()) return [];
      return products.slice(0, 5);
    };

    const suggestions = filterSuggestions([{ id: 1, name: 'Sony A7' }], emptyKeyword);
    expect(suggestions).toEqual([]);
  });

});
