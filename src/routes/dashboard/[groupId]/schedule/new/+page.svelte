<script lang="ts">
    import ScheduleEditor from '$lib/components/shifts/ScheduleEditor.svelte';
    import type { PageProps } from './$types';
    let { data }: PageProps = $props();
</script>
<ScheduleEditor group={data.group} />
