/**
 * The two pieces of motion on the marketing pages, as actions so the markup
 * carries no pointer handlers of its own.
 *
 * Both are opt-in from the client: the server renders every card visible
 * and flat, so a page without JavaScript, a crawler and a reader who asked
 * for reduced motion all get the same finished page.
 */

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Cards rise into place the first time they scroll into view. */
export function reveal(node: HTMLElement) {
	if (reducedMotion() || !('IntersectionObserver' in window)) return;

	// Anything already on screen at load is left alone, so the first paint
	// never blinks out and back in.
	const box = node.getBoundingClientRect();
	if (box.top < innerHeight && box.bottom > 0) return;

	node.dataset.reveal = 'pending';
	const observer = new IntersectionObserver(
		(entries) => {
			if (!entries.some((entry) => entry.isIntersecting)) return;
			node.dataset.reveal = 'shown';
			observer.disconnect();
		},
		{ rootMargin: '0px 0px -8% 0px' }
	);
	observer.observe(node);
	return { destroy: () => observer.disconnect() };
}

/**
 * A slight lean towards the pointer, and the position the card's glow
 * follows. Fine pointers only: on a phone the "hover" is the tap that
 * flips the card, and a lean left behind by it would look like a bug.
 */
export function tilt(node: HTMLElement) {
	if (reducedMotion() || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;

	const move = (event: PointerEvent) => {
		const box = node.getBoundingClientRect();
		const x = (event.clientX - box.left) / box.width;
		const y = (event.clientY - box.top) / box.height;
		node.dataset.tilting = '';
		node.style.setProperty('--mx', `${x * 100}%`);
		node.style.setProperty('--my', `${y * 100}%`);
		node.style.setProperty('--ry', `${(x - 0.5) * 5}deg`);
		node.style.setProperty('--rx', `${(0.5 - y) * 5}deg`);
	};
	const leave = () => {
		delete node.dataset.tilting;
		node.style.setProperty('--rx', '0deg');
		node.style.setProperty('--ry', '0deg');
	};

	node.addEventListener('pointermove', move);
	node.addEventListener('pointerleave', leave);
	return {
		destroy() {
			node.removeEventListener('pointermove', move);
			node.removeEventListener('pointerleave', leave);
		}
	};
}
