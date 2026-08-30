<script lang="ts">
	import { goto } from '$app/navigation';
	import { refreshData } from '$lib/utils/refresh';
	import { IconChevronDown, IconLogout, IconSettings, IconShieldCheck, IconUser } from '@tabler/icons-svelte';
	import Avatar from '$lib/components/users/Avatar.svelte';
	import { api, loginUrl, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import type { SessionUser } from '$lib/api/types';
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		user: SessionUser | null;
	}

	let { user }: Props = $props();

	let open = $state(false);
	let container = $state<HTMLDivElement | null>(null);

	$effect(() => {
		if (!open) return;

		const onPointerDown = (event: MouseEvent) => {
			if (container && !container.contains(event.target as Node)) open = false;
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') open = false;
		};

		document.addEventListener('mousedown', onPointerDown);
		document.addEventListener('keydown', onKeyDown);

		return () => {
			document.removeEventListener('mousedown', onPointerDown);
			document.removeEventListener('keydown', onKeyDown);
		};
	});

	async function logout() {
		open = false;
		try {
			await api.auth.logout.post();
			await refreshData();
			await goto('/');
			toasts.success(m.layout_user_menu_signed_out());
		} catch (error) {
			toasts.error(errorMessage(error, m.layout_user_menu_could_not_sign_out()));
		}
	}
</script>

{#if user}
	<div class="relative" bind:this={container}>
		<button
			type="button"
			onclick={() => (open = !open)}
			aria-expanded={open}
			aria-haspopup="menu"
			class="flex items-center gap-2 rounded-lg py-1 pr-2 pl-1 transition-colors hover:bg-background-secondary
				{open ? 'bg-background-secondary' : ''}"
		>
			<Avatar src={user.avatar} name={user.displayName ?? user.username} size={28} />
			<span class="hidden max-w-32 truncate text-sm font-medium sm:block">
				{user.displayName ?? user.username ?? m.common_account()}
			</span>
			<IconChevronDown size={15} class="text-text-muted" />
		</button>

		{#if open}
			<div
				role="menu"
				tabindex="-1"
				class="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border-base bg-surface shadow-xl"
			>
				<div class="border-b border-border-base px-3 py-2.5">
					<p class="truncate text-sm font-medium text-text">
						{user.displayName ?? user.username}
					</p>
					<p class="truncate text-xs text-text-muted">
						{user.username ? `@${user.username}` : `Roblox ${user.robloxId}`}
					</p>
				</div>

				<div class="p-1.5">
					<a
						href="/users/{user.userId}"
						role="menuitem"
						onclick={() => (open = false)}
						class="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-text transition-colors hover:bg-background-muted"
					>
						<IconUser size={16} /> {m.layout_user_menu_profile()}
					</a>
					<a
						href="/settings"
						role="menuitem"
						onclick={() => (open = false)}
						class="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-text transition-colors hover:bg-background-muted"
					>
						<IconSettings size={16} /> {m.common_settings()}
					</a>
					<!--
						The portal is offered on the elevation, not the account:
						while admin mode is off this session is refused there,
						and a link straight to a 403 reads as the site being
						broken. The switch itself lives in settings.
					-->
					{#if user.adminMode}
						<a
							href="/admin"
							role="menuitem"
							onclick={() => (open = false)}
							class="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-text transition-colors hover:bg-background-muted"
						>
							<IconShieldCheck size={16} /> {m.layout_user_menu_administration()}
						</a>
					{/if}
					<button
						type="button"
						role="menuitem"
						onclick={logout}
						class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-danger transition-colors hover:bg-danger/10"
					>
						<IconLogout size={16} /> {m.layout_user_menu_sign_out()}
					</button>
				</div>
			</div>
		{/if}
	</div>
{:else}
	<a
		href={loginUrl()}
		data-sveltekit-reload
		class="inline-flex items-center rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
	>
		{m.layout_user_menu_sign()}
	</a>
{/if}
