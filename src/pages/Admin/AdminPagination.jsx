/**
 * Reusable Admin Pagination Component
 * Renders page controls, item counts, and direct navigation buttons.
 */
export default function AdminPagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 20,
  onPageChange,
  itemName = 'sản phẩm',
}) {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  if (totalItems <= 0) return null;

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers
  const getPages = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="adminPagination" aria-label="Phân trang">
      <div className="adminPaginationInfo">
        Hiển thị <strong>{startIndex}</strong> – <strong>{endIndex}</strong> trong tổng số{' '}
        <strong>{totalItems}</strong> {itemName}
      </div>

      {totalPages > 1 && (
        <nav className="adminPaginationControls" aria-label="Điều hướng trang">
          <button
            type="button"
            className="adminPaginationBtn"
            onClick={() => onPageChange?.(1)}
            disabled={currentPage === 1}
            title="Trang đầu"
            aria-label="Trang đầu"
          >
            <i className="fa-solid fa-angles-left" />
          </button>
          <button
            type="button"
            className="adminPaginationBtn"
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={currentPage === 1}
            title="Trang trước"
            aria-label="Trang trước"
          >
            <i className="fa-solid fa-chevron-left" />
          </button>

          {getPages().map((page, index) =>
            page === '...' ? (
              <span key={`ellipsis-${index}`} className="adminPaginationEllipsis">
                …
              </span>
            ) : (
              <button
                key={page}
                type="button"
                className={`adminPaginationBtn ${page === currentPage ? 'active' : ''}`}
                onClick={() => onPageChange?.(page)}
                aria-current={page === currentPage ? 'page' : undefined}
                aria-label={`Trang ${page}`}
              >
                {page}
              </button>
            )
          )}

          <button
            type="button"
            className="adminPaginationBtn"
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={currentPage === totalPages}
            title="Trang sau"
            aria-label="Trang sau"
          >
            <i className="fa-solid fa-chevron-right" />
          </button>
          <button
            type="button"
            className="adminPaginationBtn"
            onClick={() => onPageChange?.(totalPages)}
            disabled={currentPage === totalPages}
            title="Trang cuối"
            aria-label="Trang cuối"
          >
            <i className="fa-solid fa-angles-right" />
          </button>
        </nav>
      )}
    </div>
  );
}
