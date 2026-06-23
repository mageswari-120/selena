(function () {
  if (!document.body.classList.contains('scroll-animations-enabled')) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const sections = document.querySelectorAll('.shopify-section');

  if (!sections.length) return;

  if (typeof Shopify !== 'undefined' && Shopify.designMode) {
    sections.forEach((section) => {
      section.classList.add('scroll-trigger', 'scroll-trigger--visible');
    });
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('scroll-trigger--visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '0px 0px -50px 0px', threshold: 0 }
  );

  sections.forEach((section) => {
    if (section.closest('.shopify-section-group-header-group')) return;

    section.classList.add('scroll-trigger', 'scroll-trigger--offscreen');
    observer.observe(section);
  });
})();
