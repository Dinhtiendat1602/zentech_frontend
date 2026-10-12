import { useMemo, useState } from 'react';
import styles from './LiveChatAdmin.module.css';

const conversations = [
  { id: 1, name: 'Nguyễn Minh Anh', initials: 'MA', email: 'minhanh@example.com', topic: 'Tư vấn máy ảnh du lịch', lastMessage: 'Mình thường chụp phong cảnh với gia đình ạ.', time: '10:42', unread: 2, online: true, color: 'sage' },
  { id: 2, name: 'Trần Hoàng Nam', initials: 'HN', email: 'hoangnam@example.com', topic: 'Tình trạng đơn hàng', lastMessage: 'Shop kiểm tra giúp mình đơn với nhé.', time: '10:18', unread: 1, online: true, color: 'blue' },
  { id: 3, name: 'Lê Ngọc Hà', initials: 'NH', email: 'ngocha@example.com', topic: 'Ống kính tương thích', lastMessage: 'Cảm ơn bạn, mình đã rõ rồi.', time: 'Hôm qua', unread: 0, online: false, color: 'rose' },
  { id: 4, name: 'Phạm Quốc Bảo', initials: 'QB', email: 'quocbao@example.com', topic: 'Chính sách bảo hành', lastMessage: 'Thời gian bảo hành là bao lâu vậy?', time: 'Hôm qua', unread: 0, online: false, color: 'gold' },
];

const messages = {
  1: [
    { from: 'customer', time: '10:35', text: 'Chào shop, mình muốn tìm một máy ảnh để đi du lịch, nhỏ gọn một chút.' },
    { from: 'admin', time: '10:37', text: 'Chào Minh Anh, mình sẵn sàng tư vấn nhé. Bạn thường chụp phong cảnh, chân dung hay cả hai ạ?' },
    { from: 'customer', time: '10:42', text: 'Mình thường chụp phong cảnh với gia đình ạ.' },
  ],
  2: [
    { from: 'customer', time: '10:11', text: 'Shop ơi, đơn hàng của mình đang được giao tới đâu rồi ạ?' },
    { from: 'admin', time: '10:14', text: 'Mình sẽ kiểm tra trạng thái đơn và phản hồi bạn ngay nhé.' },
    { from: 'customer', time: '10:18', text: 'Shop kiểm tra giúp mình đơn với nhé.' },
  ],
  3: [
    { from: 'customer', time: 'Hôm qua, 16:20', text: 'Ống kính Sony FE 24-70mm có dùng được với thân A7 IV không shop?' },
    { from: 'admin', time: 'Hôm qua, 16:25', text: 'Dạ tương thích trực tiếp với ngàm E trên Sony A7 IV ạ.' },
    { from: 'customer', time: 'Hôm qua, 16:27', text: 'Cảm ơn bạn, mình đã rõ rồi.' },
  ],
  4: [
    { from: 'customer', time: 'Hôm qua, 14:03', text: 'Thời gian bảo hành của máy ảnh là bao lâu vậy shop?' },
    { from: 'admin', time: 'Hôm qua, 14:10', text: 'Sản phẩm chính hãng được bảo hành theo chính sách của hãng, thông tin chi tiết có trong phiếu bảo hành ạ.' },
    { from: 'customer', time: 'Hôm qua, 14:14', text: 'Thời gian bảo hành là bao lâu vậy?' },
  ],
};

function LiveChatAdmin() {
  const [activeId, setActiveId] = useState(1);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const activeConversation = conversations.find((conversation) => conversation.id === activeId) || conversations[0];
  const visibleConversations = useMemo(() => {
    const q = query.trim().toLowerCase();
    return conversations.filter((conversation) => {
      const matchFilter = filter === 'all' || (filter === 'unread' ? conversation.unread > 0 : conversation.online);
      const matchQuery = !q || `${conversation.name} ${conversation.topic} ${conversation.lastMessage} ${conversation.email}`.toLowerCase().includes(q);
      return matchFilter && matchQuery;
    });
  }, [filter, query]);
  const activeMessages = messages[activeConversation.id] || [];

  return (
    <main className={styles.page}>
      <header className={styles.heading}>
        <div><span className={styles.eyebrow}>CHĂM SÓC KHÁCH HÀNG</span><h1>Trò chuyện</h1><p>Theo dõi các cuộc hội thoại với khách hàng.</p></div>
        <span className={styles.previewBadge}><i className="fa-regular fa-eye" /> GIAO DIỆN XEM TRƯỚC</span>
      </header>
      <div className={styles.workspace}>
        <aside className={styles.inbox}>
          <div className={styles.inboxHeader}><div><h2>Hộp thư</h2><span>{conversations.length} cuộc trò chuyện</span></div><button className={styles.iconButton} type="button" aria-label="Tùy chọn hộp thư"><i className="fa-solid fa-ellipsis" /></button></div>
          <label className={styles.search}><i className="fa-solid fa-magnifying-glass" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm tên, nội dung hoặc email..." aria-label="Tìm cuộc trò chuyện" /></label>
          <div className={styles.filters} role="tablist" aria-label="Lọc hội thoại"><button className={filter === 'all' ? styles.filterActive : ''} type="button" role="tab" aria-selected={filter === 'all'} onClick={() => setFilter('all')}>Tất cả <span>{conversations.length}</span></button><button className={filter === 'unread' ? styles.filterActive : ''} type="button" role="tab" aria-selected={filter === 'unread'} onClick={() => setFilter('unread')}>Chưa đọc <span>{conversations.filter((item) => item.unread).length}</span></button><button className={filter === 'online' ? styles.filterActive : ''} type="button" role="tab" aria-selected={filter === 'online'} onClick={() => setFilter('online')}>Trực tuyến</button></div>
          <div className={styles.conversationList}>{visibleConversations.map((conversation) => <button className={`${styles.conversation} ${activeId === conversation.id ? styles.conversationActive : ''}`} type="button" key={conversation.id} onClick={() => setActiveId(conversation.id)}><span className={`${styles.avatar} ${styles[conversation.color]}`}>{conversation.initials}{conversation.online && <i />}</span><span className={styles.conversationText}><span className={styles.conversationLine}><strong>{conversation.name}</strong><time>{conversation.time}</time></span><span className={styles.topic}>{conversation.topic}</span><span className={styles.lastMessage}>{conversation.lastMessage}</span></span>{conversation.unread > 0 && <span className={styles.unread}>{conversation.unread}</span>}</button>)}</div>
        </aside>

        <section className={styles.thread} aria-label={`Cuộc trò chuyện với ${activeConversation.name}`}>
          <header className={styles.threadHeader}><span className={`${styles.avatar} ${styles[activeConversation.color]}`}>{activeConversation.initials}{activeConversation.online && <i />}</span><div className={styles.threadIdentity}><strong>{activeConversation.name}</strong><span>{activeConversation.online ? 'Đang trực tuyến' : 'Ngoại tuyến'} · {activeConversation.topic}</span></div><div className={styles.threadActions}><button className={styles.iconButton} type="button" aria-label="Tìm trong hội thoại"><i className="fa-solid fa-magnifying-glass" /></button><button className={styles.iconButton} type="button" aria-label="Thông tin hội thoại"><i className="fa-solid fa-circle-info" /></button><button className={styles.iconButton} type="button" aria-label="Thêm tùy chọn"><i className="fa-solid fa-ellipsis" /></button></div></header>
          <div className={styles.threadSubject}><i className="fa-regular fa-bookmark" /><span>Chủ đề</span><strong>{activeConversation.topic}</strong><span className={styles.subjectTag}>Hỗ trợ mua hàng</span></div>
          <div className={styles.messageHistory}><div className={styles.dayDivider}><span>HÔM NAY</span></div>{activeMessages.map((message, index) => <article className={`${styles.messageRow} ${message.from === 'admin' ? styles.messageMine : ''}`} key={`${activeConversation.id}-${index}`}><span className={`${styles.messageAvatar} ${message.from === 'admin' ? styles.agentAvatar : styles[activeConversation.color]}`}>{message.from === 'admin' ? 'Z' : activeConversation.initials}</span><div className={styles.messageContent}><span className={styles.messageAuthor}>{message.from === 'admin' ? 'ZenTech · Bạn' : activeConversation.name}<time>{message.time}</time></span><p>{message.text}</p></div></article>)}</div>
          <div className={styles.composer}><div className={styles.composerTools}><button type="button" aria-label="Đính kèm tệp"><i className="fa-solid fa-paperclip" /></button><button type="button" aria-label="Thêm biểu tượng"><i className="fa-regular fa-face-smile" /></button><button type="button" aria-label="Ảnh"><i className="fa-regular fa-image" /></button></div><div className={styles.composerInput}><textarea aria-label="Soạn tin nhắn" placeholder="Khung soạn tin nhắn · chưa kết nối gửi tin" readOnly /><button type="button" disabled aria-label="Gửi tin nhắn"><i className="fa-solid fa-arrow-up" /></button></div></div>
        </section>

        <aside className={styles.customerPanel}><div className={styles.customerProfile}><span className={`${styles.customerAvatar} ${styles[activeConversation.color]}`}>{activeConversation.initials}</span><h2>{activeConversation.name}</h2><p><i className="fa-regular fa-envelope" /> {activeConversation.email}</p><span className={styles.customerSince}>Khách hàng ZenTech</span></div><div className={styles.customerSection}><h3>Thông tin hội thoại</h3><dl><div><dt>Chủ đề</dt><dd>{activeConversation.topic}</dd></div><div><dt>Trạng thái</dt><dd><span className={activeConversation.online ? styles.onlineStatus : styles.offlineStatus}><i /> {activeConversation.online ? 'Đang trực tuyến' : 'Ngoại tuyến'}</span></dd></div><div><dt>Phụ trách</dt><dd>Chưa phân công</dd></div></dl></div><div className={styles.customerSection}><h3>Đơn hàng gần đây</h3><div className={styles.orderPreview}><span className={styles.orderIcon}><i className="fa-solid fa-box" /></span><span><strong>Chưa liên kết đơn hàng</strong><small>Thông tin đơn hàng sẽ hiển thị tại đây</small></span></div></div><div className={styles.customerActions}><button type="button"><i className="fa-solid fa-user-check" /> Gán cho tôi</button><button type="button"><i className="fa-solid fa-check" /> Đánh dấu đã xử lý</button></div></aside>
      </div>
    </main>
  );
}

export default LiveChatAdmin;
