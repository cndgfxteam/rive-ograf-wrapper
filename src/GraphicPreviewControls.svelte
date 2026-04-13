<script lang="ts">
	import RiveViewModelTable from './RiveViewModelTable.svelte'

	import { getAppContext } from './lib/context.svelte'

	type Props = {
		open?: boolean
	}

	let { open = $bindable(false) }: Props = $props()

	const context = getAppContext()

	function updateGraphicProperties(e: SubmitEvent) {
		e.preventDefault()
		const formData = new FormData(e.target as HTMLFormElement)

		for (const [key, value] of formData.entries()) {
			let vmi = context.riveInstance?.viewModelInstance

			const propertyPath = key
				.split('/')
				.map((part) => part.trim())
				.filter((part) => part.length > 0)

			while (propertyPath.length > 0) {
				if (!vmi) {
					console.error(`Could not set ${key}: Rive instance or ViewModel instance not available.`)
					return
				}

				const propName = propertyPath.shift()!
				const property = vmi.properties.find((p) => p.name === propName)

				if (!property) {
					console.warn(`Property ${key} not found on ViewModel.`)
					continue
				}

				if (property.type === 'viewModel') {
					vmi = vmi.viewModel(propName)
				} else if (property.type === 'list') {
					vmi = vmi.viewModel(vmi.list(propName)!.instanceAt(0)!.viewModelName)
				}

				// MORE TO DO
			}
		}
	}
</script>

<details
	class="collapse max-h-full grid-rows-[max-content_minmax(0,1fr)] max-lg:collapse-arrow lg:pointer-events-none"
	bind:open
>
	<summary
		class="collapse-title border-b border-base-300 bg-linear-to-b from-base-300 to-base-100 text-sm font-medium uppercase lg:text-base"
		>Preview Controls</summary
	>

	<div
		class="collapse-content grid max-h-full min-h-0 grid-cols-1 grid-rows-[max-content_minmax(0,1fr)] gap-8 p-4 text-xs lg:pointer-events-auto lg:grid-cols-[minmax(0,1fr)_minmax(0,4fr)] lg:grid-rows-1"
	>
		<div>
			<h3 class="mb-2 text-xs font-medium uppercase lg:text-sm">Actions</h3>
			<div class="flex gap-2">
				<button
					class="btn btn-xs btn-primary lg:btn-sm"
					disabled={!context.isPreviewing}
					onclick={() => {
						context.graphic?.playAction({})
					}}>PLAY</button
				>
				<button
					class="btn btn-xs btn-secondary lg:btn-sm"
					disabled={!context.isPreviewing}
					onclick={() => {
						context.graphic?.stopAction({})
					}}>STOP</button
				>
				<input
					class="btn btn-xs btn-neutral lg:btn-sm"
					disabled={!context.isPreviewing}
					type="submit"
					form="properties-form"
					value="UPDATE"
				/>
			</div>
			{#if context.isPreviewing && context.triggerMap.customActions.length}
				<div>
					<h4 class="mt-4 mb-2 text-xs font-medium uppercase lg:text-sm">Custom actions</h4>

					<div class="flex flex-col items-start gap-2">
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
		<div class="overflow-auto">
			<h3 class="mb-2 text-xs font-medium uppercase lg:text-sm">Graphic properties</h3>
			{#if context.riveInstance && context.riveInstance.viewModelInstance}
				<form id="properties-form" onsubmit={updateGraphicProperties}>
					<RiveViewModelTable vmi={context.riveInstance.viewModelInstance}></RiveViewModelTable>
				</form>
			{:else}
				<p class="alert alert-error">ViewModel instance not available.</p>
			{/if}
		</div>
	</div>
</details>

<style></style>
