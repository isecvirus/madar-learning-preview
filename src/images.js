export const imagePlaceholder =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/%3E';

// Shared with the inline startup script so visible images can load early.
export function startImages() {
  if (document.documentElement.dataset.imagesReady) return;
  document.documentElement.dataset.imagesReady = 'true';
  const selector = 'img[data-src]';
  const observed = new WeakSet();
  const load = (img) => {
    if (img.dataset.srcset) img.setAttribute('srcset', img.dataset.srcset);
    img.setAttribute('src', img.dataset.src);
  };
  const observer =
    typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting && entry.target.isConnected) {
                load(entry.target);
                observer.unobserve(entry.target);
              }
            }
          },
          { rootMargin: '240px 0px', threshold: 0 },
        )
      : null;
  function visit(root, callback) {
    if (root.nodeType !== 1) return;
    if (root.matches(selector)) callback(root);
    root.querySelectorAll(selector).forEach(callback);
  }
  function observe(img) {
    if (observed.has(img) || !img.isConnected) return;
    observed.add(img);
    if (observer) observer.observe(img);
    else load(img);
  }
  visit(document.documentElement, observe);
  new MutationObserver((records) => {
    for (const record of records) {
      record.removedNodes.forEach((node) =>
        visit(node, (img) => {
          observer?.unobserve(img);
          observed.delete(img);
        }),
      );
      record.addedNodes.forEach((node) => visit(node, observe));
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
}
