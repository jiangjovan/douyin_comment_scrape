# extract.js - 提取评论区所有评论的完整文本
# 通过 innerText 获取每个评论子元素的文本内容
async page => {
  const commentList = await page.$('[data-e2e="comment-list"]');
  if (!commentList) return 'NO_COMMENT_LIST';
  
  const fullText = await commentList.evaluate(el => {
    const items = [];
    const children = el.children;
    
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const text = child.innerText || child.textContent || '';
      if (!text || text.includes('加载中') || text.includes('留下你的精彩评论') || text.includes('大家都在搜')) continue;
      
      const userLink = child.querySelector('a[href*="/user/"]');
      const username = userLink ? userLink.textContent.trim().replace(/\s+/g, ' ') : '';
      
      let commentText = '';
      let timeInfo = '';
      let likeCount = '';
      
      const allElements = child.querySelectorAll('div, span');
      for (const elem of allElements) {
        if (elem.children.length === 0 || elem.tagName === 'SPAN') {
          const t = (elem.innerText || elem.textContent || '').trim();
          if (!t) continue;
          if (t === username || t === '分享' || t === '回复' || t === '举报') continue;
          if (t.match(/^\d+$/) && t.length < 5) { likeCount = t; continue; }
          if (t.match(/\d+(分钟|小时|天)前|刚刚/) && t.includes('\u00b7')) { timeInfo = t; continue; }
          if (t.length > 1 && t !== username) {
            commentText = t;
          }
        }
      }
      
      // 获取表情
      const emojis = child.querySelectorAll('img[alt]');
      let emojiList = [];
      for (const img of emojis) {
        const alt = img.getAttribute('alt') || '';
        if (alt.startsWith('[') && alt.endsWith(']')) {
          emojiList.push(alt);
        }
      }
      
      if (!commentText) {
        const walker = document.createTreeWalker(child, NodeFilter.SHOW_TEXT);
        let textNodes = [];
        while (walker.nextNode()) {
          const nt = walker.currentNode.textContent.trim();
          if (nt && nt !== username && nt !== '分享' && nt !== '回复') {
            textNodes.push(nt);
          }
        }
        commentText = textNodes.filter(t => t.length > 1).join(' ');
      }
      
      if (emojiList.length > 0) {
        commentText = commentText + ' ' + emojiList.join('');
      }
      
      if (username || commentText) {
        items.push({ username: username, comment: commentText, time: timeInfo, likes: likeCount });
      }
    }
    
    return JSON.stringify(items);
  });
  
  return fullText;
}
