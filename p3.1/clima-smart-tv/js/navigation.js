const NAV_MAP = {
  card0: { right: 'card1', down: 'card2' },
  card1: { left: 'card0', down: 'card3' },
  card2: { right: 'card3', up: 'card0' },
  card3: { left: 'card2', up: 'card1' },
};
let currentFocus = 'card0';

function moveFocus(nextId) {
  const currentEl = document.getElementById(currentFocus);
  if (currentEl) {
    currentEl.classList.remove('focused');
    currentEl.setAttribute('tabindex', '-1');
  }
  
  currentFocus = nextId;
  const el = document.getElementById(currentFocus);
  if (el) {
    el.classList.add('focused');
    el.setAttribute('tabindex', '0');
    el.focus({ preventScroll: true });
  }
}

document.addEventListener('keydown', e => {
  const dir = {
    ArrowRight: 'right',
    ArrowLeft: 'left',
    ArrowDown: 'down',
    ArrowUp: 'up',
  }[e.key];

  if (dir) {
    e.preventDefault();
    const next = NAV_MAP[currentFocus]?.[dir];
    if (next) moveFocus(next);
    return;
  }

  // Enter / OK del control remoto — seleccionar tarjeta
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    const card = document.getElementById(currentFocus);
    if (card) {
      card.dispatchEvent(new CustomEvent('card-select', {
        bubbles: true,
        detail: { cardId: currentFocus }
      }));
    }
  }
});
