<script lang="ts">
	import type { ComponentProps } from 'svelte'
	import './app.css'
	import GraphicPreviewControls from './GraphicPreviewControls.svelte'
	import { AppContext, setAppContext } from './lib/context.svelte'
	import FileUploader from './lib/FileUploader.svelte'
	import GraphicPreview from './lib/GraphicPreview.svelte'
	import RiveInterpreter from './lib/rive-interpreter'
	import StatusBar from './lib/StatusBar.svelte'
	import OGrafDetailsForm from './OGrafDetailsForm.svelte'

	type Status = {
		message: string
		type: ComponentProps<typeof StatusBar>['type']
	}

	const context = setAppContext(new AppContext())

	let innerWidth = $state(0)
	let interpreter: RiveInterpreter | undefined = $state()

	const status = $derived.by<Status>(() => {
		if (!context.hasUploadedFile) {
			return { message: 'Please upload a file', type: 'error' }
		}

		if (!context.isPreviewing) {
			return { message: 'File parsed! Assign properties to preview graphic.', type: 'success' }
		}

		if (!context.hasDownloadedPackage) {
			return {
				message: 'OGraf package ready. Use controls to preview graphic.',
				type: 'info',
			}
		}

		return { message: 'Downloading graphic...', type: 'info' }
	})

	async function handleRivFile(file: File) {
		if (!file.name.endsWith('.riv')) {
			alert('Only .riv files are supported.')

			return
		}

		interpreter = new RiveInterpreter({
			buffer: await file.arrayBuffer(),
			onFileLoad: async (riveInstance, triggers) => {
				context.riveInstance = riveInstance
				context.triggers = triggers

				if (!document.startViewTransition) {
					context.hasUploadedFile = true
					return
				}

				document.startViewTransition(() => {
					context.hasUploadedFile = true
				})
			},
		})
	}
</script>

<svelte:window bind:innerWidth />

<div
	class="grid h-screen grid-cols-1 grid-rows-[auto_minmax(290px,1fr)_auto_minmax(0,3fr)_auto] lg:grid-cols-[minmax(300px,1fr)_2fr] lg:grid-rows-[auto_minmax(0,3fr)_minmax(0,2fr)_auto]"
>
	<header
		class="z-20 col-span-full flex items-center gap-4 bg-base-300 px-2 shadow"
		style="view-transition-name: header;"
	>
		<enhanced:img
			src="./assets/images/NEW_CBS_NEWS_LOGO.png?w=149;112"
			sizes="(min-width:1024px) 149px, (min-width:400px) 112px"
			alt="CBS News Logo"
			class="h-3.75 w-auto lg:h-4"
		/>
		<h1 class="mt-0.5 text-lg uppercase lg:text-xl">Rive OGraf Wrapper</h1>
	</header>

	<!-- Graphic preview / File upload -->
	<div
		class={{
			'-z-10 place-content-center bg-(image:--stripes) p-4 inset-shadow-sm': true,
			'z-50 col-span-full row-start-2 max-lg:row-end-5 lg:row-end-4': !context.hasUploadedFile,
			'lg:col-2': context.hasUploadedFile,
		}}
		style="view-transition-name: preview;"
	>
		{#if !context.hasUploadedFile}
			<FileUploader accept=".riv" onFile={handleRivFile} />
		{:else}
			<GraphicPreview />
		{/if}
	</div>

	<!-- Preview controls -->
	<div
		class="col-start-1 row-start-3 max-h-full bg-base-100 lg:col-start-2"
		style="view-transition-name: controls;"
	>
		<GraphicPreviewControls open={innerWidth > 1024} />
	</div>

	<!-- Form -->
	<div
		class="z-10 col-start-1 row-start-4 overflow-auto border-base-300 bg-base-200 p-4 shadow lg:row-span-2 lg:row-start-2 lg:border-r"
		style="view-transition-name: form;"
	>
		<OGrafDetailsForm {interpreter} />
	</div>

	<footer class="z-20 border-t border-base-300 bg-base-200 lg:col-span-2">
		<StatusBar type={status.type}>{status.message}</StatusBar>
	</footer>
</div>

<style>
	::view-transition-group(*) {
		animation-duration: 0.4s;
		overflow: hidden;
	}
</style>
