/**
 * ==============================================================================
 * DỰ ÁN: ZenTech (ZenStore) - iViettech Project Document
 * FILE: frontend/src/__tests__/format.test.js
 * MÔ TẢ: Kịch bản kiểm thử tự động các hàm tiện ích định dạng tiền tệ và hiển thị
 * ==============================================================================
 */

import { formatPrice } from '../data/products.js';

describe('KIỂM THỬ TỰ ĐỘNG CÁC HÀM TIỆN ÍCH (FORMAT UTILS)', () => {

  test('TC-FMT-01: Định dạng tiền Việt Nam Đồng (VND) chuẩn có dấu chấm phân cách hàng nghìn', () => {
    expect(formatPrice(45000000)).toBe('45.000.000₫');
    expect(formatPrice(1250000)).toBe('1.250.000₫');
    expect(formatPrice(500000)).toBe('500.000₫');
  });

  test('TC-FMT-02: Định dạng khi giá trị bằng 0 hoặc rỗng -> Trả về 0₫', () => {
    expect(formatPrice(0)).toBe('0₫');
    expect(formatPrice(null)).toBe('0₫');
    expect(formatPrice(undefined)).toBe('0₫');
  });

  test('TC-FMT-03: Định dạng khi đầu vào là dạng chuỗi số -> Tự động ép kiểu và hiển thị đúng', () => {
    expect(formatPrice('79000000')).toBe('79.000.000₫');
  });

});
