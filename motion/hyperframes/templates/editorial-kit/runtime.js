/* A única timeline é controlada pelo HyperFrames; nenhuma chamada de play/seek. */
const plan = window.EDITORIAL_PLAN;
const motion = plan.identity.motion;
const tl = gsap.timeline({paused: true});
tl.fromTo('.top-rule', {scaleX: 0}, {scaleX: 1, duration: motion.enterSeconds, ease: 'power2.inOut'}, 0.1)
  .fromTo('header', {opacity: 0, y: -16}, {opacity: 1, y: 0, duration: 0.5}, 0.15)
  .fromTo('.eyebrow', {opacity: 0, y: 20}, {opacity: 1, y: 0, duration: 0.5}, 0.3)
  .fromTo('h1 .line', {opacity: 0, y: 65}, {opacity: 1, y: 0, duration: motion.enterSeconds, stagger: motion.staggerSeconds, ease: 'power3.out'}, 0.5)
  .fromTo('.subtitle', {opacity: 0, y: 24}, {opacity: 1, y: 0, duration: 0.6}, 1.05)
  .fromTo('footer,.review', {opacity: 0}, {opacity: 1, duration: 0.5}, 1.2);
if (plan.templateId === 'titulo-editorial') {
  tl.fromTo('.signal span', {scaleY: 0}, {scaleY: 1, duration: 0.9, stagger: 0.14, ease: 'power3.inOut'}, 0.25);
} else if (plan.templateId === 'card-dados') {
  const count = {value: 0};
  const number = document.querySelector('.number');
  tl.fromTo('.stat,.metric,.chart,.source', {opacity: 0}, {opacity: 1, duration: 0.5, stagger: 0.12}, 1.1)
    .fromTo('.bar', {scaleX: 0}, {scaleX: 1, duration: 1.5, stagger: 0.2, ease: 'power2.inOut'}, 1.2)
    .fromTo(count, {value: 0}, {value: plan.value, duration: 1.7, ease: 'power2.out', onUpdate: () => {number.textContent = Math.round(count.value).toString();}}, 1.15);
} else {
  tl.fromTo('.signature', {opacity: 0, y: 16}, {opacity: 1, y: 0, duration: 0.6}, 1.15)
    .fromTo('.cta,.arrow', {opacity: 0, x: -20}, {opacity: 1, x: 0, duration: 0.6, stagger: 0.1}, 1.5)
    .fromTo('.cta-line', {scaleX: 0}, {scaleX: 1, duration: 0.6, ease: 'power2.inOut'}, 1.6);
}
tl.to('.content', {opacity: 0, y: -12, duration: motion.exitSeconds, ease: 'power2.in'}, plan.duration - motion.exitSeconds);
window.__timelines = window.__timelines || {};
window.__timelines['editorial-kit'] = tl;
