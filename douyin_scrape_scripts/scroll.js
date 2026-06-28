# scroll.js - 滚动评论区加载更多评论
async page => {
  const el = await page.$('[data-e2e="comment-list"]');
  if (el) {
    let scrollParent = el;
    for (let i = 0; i < 10; i++) {
      const parent = await scrollParent.evaluateHandle(e => e.parentElement);
      const sh = await parent.evaluate(e => e.scrollHeight);
      const ch = await parent.evaluate(e => e.clientHeight);
      if (sh > ch + 50) {
        scrollParent = parent;
        break;
      }
      scrollParent = parent;
    }
    for (let i = 0; i < 15; i++) {
      await scrollParent.evaluate(e => { e.scrollTop += 300; });
      await page.waitForTimeout(1500);
    }
  }
}
