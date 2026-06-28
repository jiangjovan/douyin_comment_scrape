// scroll_and_snapshot.js - Douyin comment scraper
// PS1 replaces 200 with actual number before calling playwright-cli
async page => {
  const TARGET = __DY_TARGET__;
  
  const commentList = await page.$('[data-e2e="comment-list"]');
  if (!commentList) return JSON.stringify({status: 'NO_COMMENT_LIST', title: await page.evaluate(() => document.title), rawComments: [], count: 0, target: TARGET});

  let scrollParent = commentList;
  for (let i = 0; i < 10; i++) {
    const parent = await scrollParent.evaluateHandle(e => e.parentElement);
    const sh = await parent.evaluate(e => e.scrollHeight);
    const ch = await parent.evaluate(e => e.clientHeight);
    if (sh > ch + 50) { scrollParent = parent; break; }
    scrollParent = parent;
  }

  const pageTitle = await page.evaluate(() => document.title);

  async function getCurrentCount() {
    return await commentList.evaluate(el => {
      let count = 0;
      for (let i = 0; i < el.children.length; i++) {
        const text = (el.children[i].innerText || '').trim();
        if (!text || text.includes('大家都在搜') || text.includes('留下你的精彩评论') || text.includes('加载中')) continue;
        count++;
      }
      return count;
    });
  }

  async function isAtBottom() {
    const st = await scrollParent.evaluate(e => e.scrollTop);
    const sh = await scrollParent.evaluate(e => e.scrollHeight);
    const ch = await scrollParent.evaluate(e => e.clientHeight);
    return (st + ch) >= (sh - 100);
  }

  let totalScrolls = 0;
  let currentCount = await getCurrentCount();

  if (currentCount < TARGET) {
    while (totalScrolls < 300) {
      for (let s = 0; s < 5; s++) {
        await scrollParent.evaluate(e => { e.scrollTop += 500; });
        await page.waitForTimeout(1500);
        totalScrolls++;
      }
      
      await page.waitForTimeout(2000);
      currentCount = await getCurrentCount();
      
      if (currentCount >= TARGET) break;
      
      const atBottom = await isAtBottom();
      if (atBottom) {
        await scrollParent.evaluate(e => { e.scrollTop = e.scrollHeight; });
        await page.waitForTimeout(3000);
        const newCount = await getCurrentCount();
        if (newCount === currentCount) break;
        currentCount = newCount;
        if (currentCount >= TARGET) break;
      }
    }
  }

  const cleanedComments = await commentList.evaluate(el => {
    const NOISE_WORDS = ['分享', '回复', '赞', '举报'];
    const NOISE_ENDINGS = ['头像'];
    const NOISE_PATTERNS = [
      /^展开\d+条回复$/,
      /^分享$/,
      /^回复$/,
      /^赞$/,
      /^举报$/,
      /.+头像$/,
      /^\d+$/,
      /^\.{2,}$/
    ];

    const items = [];
    for (let i = 0; i < el.children.length; i++) {
      const child = el.children[i];
      const text = (child.innerText || child.textContent || '').trim();
      if (!text) continue;
      if (text.includes('大家都在搜') || text.includes('留下你的精彩评论') || text.includes('加载中')) continue;

      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      const filtered = [];

      for (const line of lines) {
        let isNoise = false;
        if (NOISE_WORDS.includes(line)) isNoise = true;
        for (const ending of NOISE_ENDINGS) {
          if (line.endsWith(ending)) isNoise = true;
        }
        for (const pattern of NOISE_PATTERNS) {
          if (pattern.test(line)) isNoise = true;
        }
        if (!isNoise) filtered.push(line);
      }

      if (filtered.length > 0) {
        items.push(filtered.join(' | '));
      }
    }
    return items;
  });

  const finalComments = cleanedComments.slice(0, TARGET);

  return JSON.stringify({
    status: 'OK',
    title: pageTitle,
    rawComments: finalComments,
    count: finalComments.length,
    totalAvailable: cleanedComments.length,
    scrollsUsed: totalScrolls,
    target: TARGET
  });
}
