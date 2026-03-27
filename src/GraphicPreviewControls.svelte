<script lang="ts">
	import { getAppContext } from './lib/context.svelte'

	type Props = {
		open?: boolean
	}

	let { open = $bindable(false) }: Props = $props()

	const context = getAppContext()
</script>

<details class="collapse bg-base-100 max-lg:collapse-arrow lg:pointer-events-none" bind:open>
	<summary class="collapse-title text-sm font-medium">Preview Controls</summary>

	<div class="collapse-content text-xs lg:pointer-events-auto">
		<div>
			<button
				class="btn btn-sm btn-primary"
				disabled={!context.isPreviewing}
				onclick={() => {
					context.graphic?.playAction({})
				}}>PLAY</button
			>
			<button
				class="btn btn-sm btn-secondary"
				disabled={!context.isPreviewing}
				onclick={() => {
					context.graphic?.stopAction({})
				}}>STOP</button
			>
		</div>
		{#if context.isPreviewing && context.triggerMap.customActions.length}
			<div>
				<h3 class="mt-4 mb-2 text-sm">Custom actions</h3>

				{#each context.triggerMap.customActions as trigger}
					<button
						class="btn btn-sm"
						onclick={() => {
							context.graphic?.customAction({ id: trigger, payload: {} })
						}}>{trigger.toUpperCase()}</button
					>
				{/each}
			</div>
		{/if}
	</div>
</details>

<style></style>
