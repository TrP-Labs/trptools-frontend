<script lang="ts">
    import { recordStatistics } from '$lib/utils/statistics';
    let { groupId, kind, targetId }: { groupId: string; kind: string; targetId?: string } = $props();
    // Effect tracks the page identity, so SPA navigation counts a new page but
    // saving/invalidation of the same page never creates another view.
    $effect(() => { recordStatistics(groupId, [kind], targetId); });
</script>
