<script lang="ts">
	let { accept, onFile } = $props()

	let dropZone: HTMLLabelElement
	let isDragOverActive = $state(false)

	function onDrop(e: DragEvent) {
		e.preventDefault()

		const files = [...e.dataTransfer!.items].map((item) => item.getAsFile()).filter((file) => file)

		if (!files?.length) {
			return
		}

		onFile(files[0]!)
	}

	function onDropZoneDragOver(e: DragEvent) {
		if (!e.dataTransfer) {
			return
		}

		const fileItems = [...e.dataTransfer.items].filter((item) => item.kind === 'file')

		if (!fileItems.length) {
			return
		}

		e.preventDefault()

		if (fileItems.some((item) => item.type === '')) {
			e.dataTransfer!.dropEffect = 'copy'
		} else {
			e.dataTransfer!.dropEffect = 'none'
		}

		isDragOverActive = true
	}

	function onWindowDragOver(e: DragEvent) {
		const fileItems = [...e.dataTransfer!.items].filter((item) => item.kind === 'file')

		if (!fileItems.length) {
			return
		}

		e.preventDefault()
		if (!dropZone.contains(e.target as Node)) {
			e.dataTransfer!.dropEffect = 'none'
		}
	}
</script>

<!-- Prevent default behavior for file drops at window level -->
<svelte:window
	ondrop={(e) =>
		[...e.dataTransfer!.items].some((item) => item.kind === 'file') && e.preventDefault()}
	ondragover={onWindowDragOver}
/>

<label
	bind:this={dropZone}
	ondrop={onDrop}
	ondragover={onDropZoneDragOver}
	ondragleave={() => (isDragOverActive = false)}
	class={{
		'mx-auto grid aspect-video max-h-full cursor-pointer place-items-center rounded-box font-medium text-base-content shadow hover:bg-base-200 focus:bg-base-200': true,
		'bg-base-300': !isDragOverActive,
		'bg-base-200 inset-shadow-sm': isDragOverActive,
	}}
>
	Drop .riv file here, or click to upload
	<input type="file" class="hidden" {accept} onchange={(e) => onFile(e.currentTarget!.files![0])} />
</label>

<style>
</style>
