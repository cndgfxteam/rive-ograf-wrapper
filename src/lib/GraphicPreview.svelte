<script lang="ts">
	import { getAppContext } from './context.svelte'

	const context = getAppContext()

	let previewRef = $state<HTMLElement>()

	$effect(() => {
		if (!context.graphic || !previewRef) {
			return
		}

		previewRef.replaceWith(context.graphic)
	})
</script>

<div
	class="mockup-browser mx-auto grid aspect-[16/10.8] max-h-full grid-rows-[auto_minmax(0,1fr)] overflow-x-hidden border border-base-300"
>
	<div class="mockup-browser-toolbar">
		<div class="input"></div>
	</div>
	<div
		class="grid aspect-video max-h-full grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] place-content-center border-t border-base-300 bg-base-200"
	>
		{#if context.graphic}
			<div bind:this={previewRef}></div>
		{:else}
			<p class="content-center text-center font-medium [background:var(--stripes)]">
				Assign file properties to test graphic
			</p>
		{/if}
	</div>
</div>

<style></style>
