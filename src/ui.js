import { imagePlaceholder } from './images.js';
import { escapeHTML } from './core.js';
export const icon = (name, className = '') =>
  `<svg class="icon ${className}" width="20" height="20" aria-hidden="true" focusable="false"><use href="#icon-${name}"></use></svg>`;
export const image = (name, alt, className = '', eager = false) =>
  `<img class="${className}" data-image="${name}" src="${escapeHTML(imagePlaceholder)}" data-src="assets/images/${name}.webp" data-srcset="assets/images/${name}-small.webp 640w, assets/images/${name}.webp 1200w" sizes="(max-width: 700px) 92vw, (max-width: 1100px) 45vw, 560px" width="1200" height="800" loading="${eager ? 'eager' : 'lazy'}" decoding="async" alt="${escapeHTML(alt)}">`;
export const progressBar = (percent, label = 'التقدم في الدورة') =>
  `<div class="progress-track" role="progressbar" aria-label="${label}" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"><span style="width:${percent}%"></span></div>`;
