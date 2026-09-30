<script lang="ts">
    import PageHeader from '$lib/components/ui/PageHeader.svelte';
    import NotificationDeviceCard from '$lib/components/settings/NotificationDeviceCard.svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import { IconCalendarTime } from '@tabler/icons-svelte';
    import { m } from '$lib/paraglide/messages.js';
</script>
<svelte:head><title>{m.settings_notifications()} — TrPTools</title></svelte:head>
<PageHeader title={m.settings_notifications()} description={m.settings_notifications_description()} />
<div class="space-y-6">
    <NotificationDeviceCard />
    <Button variant="secondary" href="/shifts"><IconCalendarTime size={17} />{m.home_all_shifts()}</Button>
</div>
