(() => {
  const events = JSON.parse(localStorage.getItem('kpiEvents') || '{}');
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-event]');
    if (!target) return;
    const key = target.getAttribute('data-event');
    events[key] = (events[key] || 0) + 1;
    localStorage.setItem('kpiEvents', JSON.stringify(events));
    console.log('Tracked event', key, events[key]);
  });
})();
