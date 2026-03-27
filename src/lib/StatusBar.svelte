<script lang="ts">
	import type { Snippet } from 'svelte'

	const STATUS_VARIANTS = {
		error: 'status-error',
		success: 'status-success',
		warn: 'status-warning',
		info: 'status-info',
	}
	const TEXT_VARIANTS = {
		error: 'text-error',
		success: 'text-success',
		warn: 'text-warning',
		info: 'text-info',
	}

	interface Props {
		children: Snippet
		type: 'error' | 'success' | 'warn' | 'info'
	}

	let { children, type }: Props = $props()
</script>

<div class="flex flex-row items-baseline gap-4 border-t border-base-300 bg-base-300 p-2">
	<h2 class="text-sm font-medium uppercase">Status</h2>
	<div class="flex flex-row items-baseline gap-1 text-xs">
		<div class="status {STATUS_VARIANTS[type]}"></div>
		<span class={TEXT_VARIANTS[type]}>{@render children()}</span>
	</div>
</div>

<style>
</style>
