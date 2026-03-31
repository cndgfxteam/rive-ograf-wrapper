<script lang="ts">
	import { getAppContext } from './lib/context.svelte'

	type Props = {
		open?: boolean
	}

	let { open = $bindable(false) }: Props = $props()

	const context = getAppContext()
</script>

<details class="collapse max-lg:collapse-arrow lg:pointer-events-none" bind:open>
	<summary class="collapse-title text-sm font-medium uppercase lg:text-base"
		>Preview Controls</summary
	>

	<div class="collapse-content text-xs lg:pointer-events-auto">
		<div class="flex gap-2">
			<button
				class="btn btn-sm btn-primary lg:btn-md"
				disabled={!context.isPreviewing}
				onclick={() => {
					context.graphic?.playAction({})
				}}>PLAY</button
			>
			<button
				class="btn btn-sm btn-secondary lg:btn-md"
				disabled={!context.isPreviewing}
				onclick={() => {
					context.graphic?.stopAction({})
				}}>STOP</button
			>
		</div>
		{#if context.isPreviewing && context.triggerMap.customActions.length}
			<div>
				<h3 class="mt-4 mb-2 text-xs font-medium uppercase lg:text-sm">Custom actions</h3>

				<div class="flex gap-2">
					{#each context.triggerMap.customActions as trigger}
						<button
							class="btn btn-xs lg:btn-sm"
							onclick={() => {
								context.graphic?.customAction({ id: trigger, payload: {} })
							}}>{trigger.toUpperCase()}</button
						>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</details>

<style></style>
