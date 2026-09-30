<script lang="ts">
    import Home from '$lib/components/marketing/Home.svelte';
    import HomeDashboard from '$lib/components/dashboard/HomeDashboard.svelte';
    import type { PageProps } from './$types';
    import { m } from '$lib/paraglide/messages.js';
    let { data }: PageProps = $props();
</script>
<svelte:head><title>{m.home_trp_tools_roblox_group_management_trp()}</title></svelte:head>
{#if data.user && data.dashboard}
    <HomeDashboard dashboard={data.dashboard} user={data.user} />
{:else}<Home />{/if}
