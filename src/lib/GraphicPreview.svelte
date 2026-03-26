<script lang="ts">
	import { getAppContext } from './context.svelte'

	const context = getAppContext()

	type Props = {
		previewWidth?: number
		previewHeight?: number
	}

	let { previewWidth = $bindable(0), previewHeight = $bindable(0) }: Props = $props()
	let previewRef = $state<HTMLElement>()

	$effect(() => {
		if (!context.graphic || !previewRef) {
			return
		}

		previewRef.replaceWith(context.graphic)
	})
</script>

<div
	class="mockup-browser mx-auto grid aspect-[16/10.8] max-h-full grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] place-items-stretch overflow-hidden border border-base-300 bg-base-200"
>
	<div class="mockup-browser-toolbar">
		<div class="input"></div>
	</div>
	<div
		class="grid aspect-video max-h-full grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] items-center border-t border-base-300 bg-base-200"
		bind:clientWidth={previewWidth}
		bind:clientHeight={previewHeight}
	>
		{#if context.graphic}
			<div bind:this={previewRef}></div>
		{:else}
			<p class="content-center bg-base-200 text-center font-medium">
				Assign file properties to test graphic
			</p>
		{/if}
	</div>
</div>

<style></style>
