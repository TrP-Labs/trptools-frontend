<script lang="ts">
    import Claim from '$lib/components/claimables/Claim.svelte';
    import type { PageProps } from './$types';
    let { data }: PageProps = $props();
</script>
<svelte:head><title>{data.claim.name} — {data.group.name}</title></svelte:head>
{#key data.claim.id}<Claim claim={data.claim} standing={data.standing} group={data.group}/>{/key}
