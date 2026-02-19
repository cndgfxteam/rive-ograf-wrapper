<script lang="ts">
    let { accept, onFile } = $props()

    let dropZone: HTMLLabelElement

    function onDrop(e: DragEvent) {
        e.preventDefault()

        const files = [...e.dataTransfer!.items]
            .map((item) => item.getAsFile())
            .filter((file) => file)

        if (!files?.length) {
            return
        }

        onFile(files[0]!)
    }

    function onDropZoneDragOver(e: DragEvent) {
        if (!e.dataTransfer) {
            return
        }

        const fileItems = [...e.dataTransfer.items].filter(
            (item) => item.kind === 'file',
        )

        if (!fileItems.length) {
            return
        }

        e.preventDefault()

        if (fileItems.some((item) => item.type === '')) {
            e.dataTransfer!.dropEffect = 'copy'
        } else {
            e.dataTransfer!.dropEffect = 'none'
        }
    }

    function onWindowDragOver(e: DragEvent) {
        const fileItems = [...e.dataTransfer!.items].filter(
            (item) => item.kind === 'file',
        )

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
        [...e.dataTransfer!.items].some((item) => item.kind === 'file') &&
        e.preventDefault()}
    ondragover={onWindowDragOver}
/>

<label
    bind:this={dropZone}
    ondrop={onDrop}
    ondragover={onDropZoneDragOver}
    class="drop-zone"
>
    Drop .riv file here, or click to upload
    <input
        type="file"
        {accept}
        onchange={(e) => onFile(e.currentTarget!.files![0])}
    />
</label>

<style>
    .drop-zone {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 500px;
        max-width: 100%;
        height: 200px;
        border: 1px solid oklch(from currentColor l c h / 0.1);
        border-radius: 4px;
        font-weight: 500;
        color: oklch(from currentColor l c h / 0.8);
        cursor: pointer;

        &:hover,
        &:focus {
            border-color: oklch(from currentColor l c h / 0.2);
            background-color: oklch(from currentColor l c h / 0.05);
        }

        input[type='file'] {
            display: none;
        }
    }
</style>
