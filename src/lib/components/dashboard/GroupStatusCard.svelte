<script lang="ts">
	import {
		IconCalendarTime,
		IconClipboardList,
		IconPin,
		IconPinFilled,
		IconRadio,
		IconSettings
	} from '@tabler/icons-svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Avatar from '$lib/components/users/Avatar.svelte';
	import { formatRelative } from '$lib/utils/format';
	import { PERMISSION, PERMISSION_LABELS, type DashboardGroup } from '$lib/api/types';

	interface Props {
		group: DashboardGroup;
		primary: boolean;
		/** The group whose pin is saving, or null. */
		pinning: string | null;
		onpin: (groupId: string) => void;
	}

	let { group, primary, pinning, onpin }: Props = $props();

	/**
	 * The links under a card are the pages this rank can actually open.
	 *
	 * A dispatcher offered a Settings link would be offered a 403, which reads
	 * as the site being broken rather than as a permission they do not hold.
	 */
	let links = $derived(
		[
			{ href: `/dashboard/${group.slug}/dispatch`, label: 'Dispatch', icon: IconRadio, level: PERMISSION.DISPATCH },
			{ href: `/dashboard/${group.slug}/shifts`, label: 'Shifts', icon: IconCalendarTime, level: PERMISSION.DISPATCH },
			{
				href: `/dashboard/${group.slug}/applications`,
				label: 'Applications',
				icon: IconClipboardList,
				level: PERMISSION.MANAGE
			},
			{ href: `/dashboard/${group.slug}/settings`, label: 'Settings', icon: IconSettings, level: PERMISSION.MANAGE }
		].filter((link) => group.permissionLevel >= link.level)
	);
</script>

<!--
	`min-w-0` because this is a grid item: without a minimum of its own a card
	sizes its whole track to its longest unbroken word, which on a phone drags
	every other card off the side of the page with it.
-->
<article
	class="card relative flex min-w-0 flex-col p-5 transition-colors hover:border-border-strong
		{primary ? 'border-accent/50' : ''}"
>
	<div class="flex items-start gap-3">
		<Avatar src={group.icon} name={group.name} size={42} />

		<div class="min-w-0 flex-1">
			<a href="/dashboard/{group.slug}" class="font-semibold text-text before:absolute before:inset-0">
				<span class="wrap-anywhere">{group.name}</span>
			</a>
			<p class="mt-0.5 text-xs text-text-muted">{PERMISSION_LABELS[group.permissionLevel]}</p>
		</div>

		<!--
			`z-10` lifts the pin above the card's own overlay link, and its
			label says what pressing it does rather than what the card is.

			It dims while saving rather than disabling: the browser blurs an
			element the moment it is disabled, so a pin pressed by keyboard
			would throw focus onto the document. Overlapping presses are
			refused by the handler instead.
		-->
		<button
			type="button"
			onclick={() => onpin(group.id)}
			aria-busy={pinning === group.id}
			aria-pressed={primary}
			aria-label={primary ? `Unpin ${group.name}` : `Make ${group.name} your primary group`}
			title={primary ? 'Your primary group' : 'Make this your primary group'}
			class="relative z-10 shrink-0 rounded-lg p-1.5 transition-colors
				{pinning === group.id ? 'opacity-50' : ''}
				{primary ? 'text-accent' : 'text-text-subtle hover:bg-background-secondary hover:text-text'}"
		>
			{#if primary}<IconPinFilled size={17} />{:else}<IconPin size={17} />{/if}
		</button>
	</div>

	<div class="mt-4 flex flex-wrap items-center gap-2">
		{#if group.roomId}
			<Badge tone="success"><IconRadio size={12} /> Dispatch live</Badge>
		{/if}
		{#if group.pendingApplications > 0}
			<Badge tone="warning">
				{group.pendingApplications} to review
			</Badge>
		{/if}
		{#if group.nextShift}
			<Badge>
				<span class="size-2 shrink-0 rounded-full" style="background: {group.nextShift.color}"></span>
				{formatRelative(group.nextShift.start)}
			</Badge>
		{:else}
			<Badge>No shifts scheduled</Badge>
		{/if}
	</div>

	{#if group.nextShift}
		<p class="mt-2 truncate text-sm text-text-muted">{group.nextShift.name}</p>
	{/if}

	<nav class="relative z-10 mt-auto flex flex-wrap gap-1.5 pt-4">
		{#each links as link (link.href)}
			<a
				href={link.href}
				class="inline-flex items-center gap-1.5 rounded-lg border border-border-base px-2.5 py-1
					text-xs text-text-muted transition-colors hover:bg-background-secondary hover:text-text"
			>
				<link.icon size={13} />
				{link.label}
			</a>
		{/each}
	</nav>
</article>
