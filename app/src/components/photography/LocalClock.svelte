<script lang="ts">
	import { getLocale } from '$lib/paraglide/runtime';
	import { onMount } from 'svelte';

	interface LocalClockProps {
		/** IANA zone, e.g. "Europe/Zurich". */
		zone: string;
		/** Printed before the time; already localised. */
		city: string;
	}

	let { zone, city }: LocalClockProps = $props();

	// The server cannot know the visitor's "now" at hydration time, and a
	// server-rendered time would be stale by the time it painted anyway, so
	// it prints dashes and the browser fills in the real minute on mount.
	let hour = $state('--');
	let minute = $state('--');

	function intlLocale(): string {
		const locale = getLocale();
		return locale === 'jp' ? 'ja' : locale;
	}

	onMount(() => {
		// numberingSystem pins Latin digits, so the same parts also make a
		// valid HH:MM for the datetime attribute in every locale.
		const format = new Intl.DateTimeFormat(intlLocale(), {
			hour: '2-digit',
			minute: '2-digit',
			hourCycle: 'h23',
			numberingSystem: 'latn',
			timeZone: zone
		});

		let timer = 0;

		function tick() {
			const parts = format.formatToParts(new Date());
			hour = parts.find((part) => part.type === 'hour')?.value ?? '--';
			minute = parts.find((part) => part.type === 'minute')?.value ?? '--';
			// Re-aim at the next minute boundary every time rather than running
			// a fixed 60s interval: timers drift and throttle in background
			// tabs, and this way the clock never shows a minute late for long.
			timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
		}

		// A laptop waking from sleep fires no missed timers; catch up at once.
		function onVisible() {
			if (document.visibilityState !== 'visible') return;
			clearTimeout(timer);
			tick();
		}

		tick();
		document.addEventListener('visibilitychange', onVisible);

		return () => {
			clearTimeout(timer);
			document.removeEventListener('visibilitychange', onVisible);
		};
	});
</script>

<!-- Plain text all the way through, so a screen reader reads "Zurich 14:02"
     once; no aria-live, nobody needs every minute announced. -->
<span class="local-clock">
	<span class="local-clock__city">{city}</span>
	<time class="local-clock__time" datetime={hour === '--' ? undefined : `${hour}:${minute}`}
		>{hour}{#key minute}<span class="local-clock__colon">:</span>{/key}{minute}</time
	>
</span>

<style lang="css">
	/* Inline, not flex: flex drops the space between city and time from the
	   accessibility tree, and a screen reader would say "Zurich14:02". */
	.local-clock {
		white-space: nowrap;
	}

	.local-clock__time {
		margin-inline-start: 0.2em;
		/* Tabular digits so the minutes ticking over never nudge the line. */
		font-variant-numeric: tabular-nums;
	}

	/* The colon is re-created each minute (the key block above), so it
	   ticks for four seconds as the minute turns and then holds still:
	   alive, but never blinking for longer than WCAG 2.2.2's five seconds. */
	.local-clock__colon {
		animation: local-clock-blink 1s steps(1, end) 4;
	}

	/* Dimmed rather than gone, so the time never reads as "1402". */
	@keyframes local-clock-blink {
		50% {
			opacity: 0.2;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.local-clock__colon {
			animation: none;
		}
	}
</style>
