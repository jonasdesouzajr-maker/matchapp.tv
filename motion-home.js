/* Motion runtime (Framer Motion's vanilla library). Home stage only. */
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  import('https://cdn.jsdelivr.net/npm/motion@11.18.1/+esm').then(({ animate }) => {
    document.querySelectorAll('#ma-first-screen, #trending-rail, #awareness-spotlight').forEach((el, i) => {
      animate(el, { opacity: [0, 1], y: [12, 0] }, { duration: 0.45, delay: i * 0.08, ease: 'easeOut' });
    });
  }).catch(() => {});
}
