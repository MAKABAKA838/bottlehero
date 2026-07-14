const statusNode = document.querySelector('#status');
const refreshButton = document.querySelector('#refreshButton');

const labelZh = {
  very_fun: '非常好玩',
  fun: '比较好玩',
  average: '一般',
  boring: '有点无聊',
  very_boring: '很无聊',
  yes: '愿意',
  maybe: '可能会',
  no: '不太愿意',
  style_01: '当前卡通风',
  style_02: '像素夜晚风',
  style_03: '柔和手绘风',
  style_04: '方块像素风',
  style_05: '温暖绘本风',
  timing: '轨迹判定',
  tower: '道具塔成长',
  boss: '最终怪物战',
  avatar: '宠物装扮',
  art: '画面风格',
  score: '分数挑战',
  none: '没有特别喜欢',
  too_hard: '太难',
  too_easy: '太简单',
  unclear: '不知道怎么玩',
  loading: '加载太慢',
  controls: '操作不舒服',
  boss_bad: '最终怪物战不好玩',
  art_bad: '画面不喜欢',
  weak_goal: '目标感不强',
  boring: '整体无聊',
  primary: '小学生',
  middle: '初中生',
  high: '高中生',
  college: '大学生',
  worker: '上班族',
  parent_other: '家长或其他',
  rare: '几乎不玩',
  sometimes: '偶尔玩',
  weekly: '每周会玩',
  daily: '经常玩',
  male: '男',
  female: '女',
  prefer_not: '不方便说',
};

const artStyles = [
  { id: 'style_01', label: '当前卡通风', src: './feedback-assets/artstyle_1.jpg' },
  { id: 'style_02', label: '像素夜晚风', src: './feedback-assets/artstyle_2.jpg' },
  { id: 'style_03', label: '柔和手绘风', src: './feedback-assets/artstyle_3.jpg' },
  { id: 'style_04', label: '方块像素风', src: './feedback-assets/artstyle_4.jpg' },
  { id: 'style_05', label: '温暖绘本风', src: './feedback-assets/artstyle_5.jpg' },
];

function showStatus(message, isSuccess = false) {
  statusNode.textContent = message;
  statusNode.classList.toggle('success', isSuccess);
}

function localLabel(item) {
  return labelZh[item.id] || item.label || item.id;
}

function renderStats(summary) {
  const stats = [
    ['反馈数', summary.total],
    ['好玩率', `${summary.funPositiveRate}%`],
    ['愿意再玩', `${summary.replayPositiveRate}%`],
    ['无聊率', `${summary.boringRate}%`],
    ['到达最终怪物', `${summary.bossReachRate}%`],
    ['打败最终怪物', `${summary.bossWinRate}%`],
  ];
  document.querySelector('#statsGrid').innerHTML = stats.map(([label, value]) => (
    `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`
  )).join('');
}

function renderArtImageStats(summary) {
  const counts = new Map((summary.artFavorites || []).map((item) => [item.id, item.count]));
  const safeTotal = Math.max(1, summary.total);
  const cards = artStyles.map((style) => {
    const count = counts.get(style.id) || 0;
    const percent = summary.total ? Math.round((count / safeTotal) * 100) : 0;
    return `<article class="art-stat-card">
      <img src="${style.src}" alt="${style.label}">
      <div>
        <h3>${style.label}</h3>
        <strong>${count}</strong>
        <span>${percent}% 喜欢</span>
      </div>
    </article>`;
  }).join('');
  document.querySelector('#artImageStats').innerHTML = cards;
}

function renderBars(selector, title, items, total) {
  const safeTotal = Math.max(1, total);
  const rows = (items || []).map((item) => {
    const width = Math.round((item.count / safeTotal) * 100);
    return `<div class="bar-row">
      <span>${localLabel(item)}</span>
      <span class="bar"><i style="width:${width}%"></i></span>
      <strong>${item.count}</strong>
    </div>`;
  }).join('') || '<p>暂无数据</p>';
  document.querySelector(selector).innerHTML = `<h3>${title}</h3>${rows}`;
}

function renderRecent(rows) {
  const body = (rows || []).slice(0, 20).map((row) => (
    `<tr>
      <td>${new Date(row.createdAt).toLocaleString('zh-CN')}</td>
      <td>${labelZh[row.funRating] || row.funRating}</td>
      <td>${labelZh[row.replayIntent] || row.replayIntent}</td>
      <td>${row.bestScore || 0}</td>
      <td>${labelZh[row.userSegment] || row.userSegment}</td>
      <td>${labelZh[row.artFavoriteId] || row.artFavoriteId}</td>
      <td>${escapeHtml(row.comment || '')}</td>
    </tr>`
  )).join('');
  document.querySelector('#recentTable').innerHTML = `<table class="recent">
    <thead><tr><th>时间</th><th>好玩</th><th>再玩</th><th>最高分</th><th>用户</th><th>风格</th><th>建议</th></tr></thead>
    <tbody>${body || '<tr><td colspan="7">暂无数据</td></tr>'}</tbody>
  </table>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function loadSummary() {
  refreshButton.disabled = true;
  showStatus('正在读取统计...');
  try {
    const response = await fetch(`/api/feedback/summary?t=${Date.now()}`, { cache: 'no-store' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      throw new Error(result.error || '读取失败');
    }
    const { summary } = result;
    renderStats(summary);
    renderBars('#funBars', '好玩程度', summary.funRatings, summary.total);
    renderBars('#replayBars', '复玩意愿', summary.replayIntent, summary.total);
    renderArtImageStats(summary);
    renderBars('#favoriteBars', '玩家最喜欢', summary.favoriteParts, summary.total);
    renderBars('#painBars', '主要问题', summary.painPoints, summary.total);
    renderBars('#segmentBars', '用户类型', summary.userSegments, summary.total);
    renderBars('#frequencyBars', '小游戏频率', summary.gameFrequency, summary.total);
    renderRecent(summary.recent);
    showStatus(`已更新：${new Date(result.updatedAt).toLocaleString('zh-CN')}`, true);
  } catch (error) {
    showStatus(error instanceof Error ? error.message : '读取失败，请稍后重试');
  } finally {
    refreshButton.disabled = false;
  }
}

refreshButton.addEventListener('click', loadSummary);
loadSummary();
setInterval(loadSummary, 30000);
