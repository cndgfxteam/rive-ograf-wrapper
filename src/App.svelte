<script lang="ts">
	import type { GraphicsManifest } from 'ograf'
	import './app.css'
	// @ts-expect-error - parameters makes TS forget this is an image
	import logo from './assets/images/NEW_CBS_NEWS_LOGO.png?enhanced&w=149&h=20'
	import GraphicPreviewControls from './GraphicPreviewControls.svelte'
	import { AppContext, setAppContext } from './lib/context.svelte'
	import FileUploader from './lib/FileUploader.svelte'
	import GraphicPreview from './lib/GraphicPreview.svelte'
	import RiveInterpreter from './lib/rive-interpreter'
	import StatusBar from './lib/StatusBar.svelte'

	const DEFAULT_DESCRIPTION =
		'OGraf Graphic containing a Rive state machine. Generated using the Rive OGraf Wrapper tool.'

	const context = setAppContext(new AppContext())
	let innerWidth = $state(0)
	let status = $state('No file uploaded')
	let statusType = $state<'error' | 'success' | 'warn' | 'info'>('error')
	let interpreter: RiveInterpreter | undefined = $state()
	let manifest: GraphicsManifest | undefined = $state()

	async function handleRivFile(file: File) {
		if (!file.name.endsWith('.riv')) {
			alert('Only .riv files are supported.')

			return
		}

		status = `Uploaded file: ${file.name}`
		statusType = 'info'

		interpreter = new RiveInterpreter({
			buffer: await file.arrayBuffer(),
			onFileLoad: async (triggers) => {
				status = 'ViewModel properties parsed'
				statusType = 'success'
				context.triggers = triggers
				context.hasUploadedFile = true
			},
		})
	}

	const previewOGraf = async (formData: FormData) => {
		if (statusType !== 'success' || !interpreter) {
			alert('Please upload a valid .riv file first.')

			return
		}

		context.graphic = interpreter.createTestTemplate(context.triggerMap)

		await context.graphic.load({
			renderType: 'realtime',
			renderCharacteristics: { accessToPublicInternet: true },
		})

		context.isPreviewing = true
		scrollTo({
			top: 0,
			behavior: 'smooth',
		})
	}

	const createOGraf = async (formData: FormData) => {
		if (!interpreter) {
			return
		}

		try {
			const authorName = formData.get('manifest-author-name') as string
			const authorEmail = formData.get('manifest-author-email') as string
			const authorUrl = formData.get('manifest-author-url') as string

			const metadata = {
				name: formData.get('manifest-name') as string,
				description: formData.get('manifest-description') as string,
				id: formData.get('manifest-id') as string,
				version: formData.get('manifest-version') as string,
				author: authorName
					? {
							name: authorName,
							...(authorEmail && { email: authorEmail }),
							...(authorUrl && { url: authorUrl }),
						}
					: undefined,
				stepCount: Number(formData.get('manifest-stepcount')) || 1,
				v_erizos: {
					group: formData.get('vendor-erizos-group') as string,
				},
			}

			manifest = await interpreter.createManifest(context.triggerMap, metadata)
			await interpreter.createOGrafPackage(manifest, context.triggerMap)
			status = 'OGraf package created! Download initiated.'
			statusType = 'success'
		} catch (e) {
			console.error('Error creating OGraf package:', e)
			status = 'Failed to create OGraf package'
			statusType = 'error'
		}
	}
</script>

<svelte:window bind:innerWidth />

<div
	class="grid h-screen grid-cols-1 grid-rows-[auto_minmax(290px,1fr)_auto_3fr_auto] lg:grid-cols-[minmax(300px,1fr)_2fr] lg:grid-rows-[auto_minmax(0,2fr)_1fr_auto]"
>
	<header class="col-span-full flex items-center gap-4 bg-base-300 px-2">
		<enhanced:img src={logo} alt="CBS News Logo" />
		<h1 class="mt-0.5 text-lg font-thin tracking-widest uppercase lg:text-xl">
			Rive OGraf Wrapper
		</h1>
	</header>

	<!-- Page content here -->
	<div class="place-content-center bg-(image:--stripes) p-4 lg:col-2">
		{#if !context.hasUploadedFile}
			<FileUploader accept=".riv" onFile={handleRivFile} />
		{:else}
			<GraphicPreview />
		{/if}
	</div>

	<!-- Preview controls -->
	<GraphicPreviewControls open={innerWidth > 1024} />

	<!-- Sidebar content here -->
	<div
		class="overflow-auto border-base-300 bg-base-200 p-4 lg:col-1 lg:row-span-2 lg:row-start-2 lg:border-r"
	>
		{#if context.hasUploadedFile}
			<form
				class="w-full grow"
				onsubmit={(e) => {
					e.preventDefault()
					const formData = new FormData(e.currentTarget)

					// TODO: Form validation

					if (!context.isPreviewing) {
						previewOGraf(formData)
						return
					}

					createOGraf(formData)
				}}
			>
				<div class="card my-4 bg-base-200 card-sm">
					<div class="card-body">
						<h2 class="card-title">Assign Actions</h2>
						<label class="flex flex-row items-center justify-between">
							<span>Play action trigger</span>
							<select
								class="select select-sm"
								name="playActionTrigger"
								bind:value={context.playActionTrigger}
								required
							>
								<option value="" selected disabled hidden>Select trigger...</option>
								{#each context.triggers as trigger}
									<option value={trigger}>{trigger}</option>
								{/each}
							</select>
						</label>
						<label class="flex flex-row items-center justify-between">
							<span>Stop action trigger</span>
							<select
								class="select select-sm"
								name="stopActionTrigger"
								bind:value={context.stopActionTrigger}
								required
							>
								<option value="" selected disabled hidden>Select trigger...</option>
								{#each context.triggers as trigger}
									<option value={trigger}>{trigger}</option>
								{/each}
							</select>
						</label>
					</div>
				</div>

				<div class="card my-4 bg-base-200 card-sm">
					<div class="card-body">
						<h2 class="card-title">Graphic Metadata</h2>
						<table class="table table-zebra bg-base-100 table-sm">
							<tbody>
								<tr>
									<td><label for="manifest-name">Name</label></td>

									<td>
										<input
											class="input input-sm"
											type="text"
											name="manifest-name"
											id="manifest-name"
											placeholder="Graphic name"
											required
										/>
									</td>
								</tr>

								<tr>
									<td><label for="manifest-description">Description</label></td>

									<td>
										<textarea
											class="textarea textarea-sm"
											name="manifest-description"
											id="manifest-description"
											placeholder="Brief description (optional)"
											rows="5">{DEFAULT_DESCRIPTION}</textarea
										>
									</td>
								</tr>

								<tr>
									<td><label for="manifest-id">ID</label></td>

									<td>
										<input
											class="input input-sm"
											type="text"
											name="manifest-id"
											id="manifest-id"
											placeholder="Unique identifier for this graphic"
											value="rive-ograf-template"
											required
										/>
									</td>
								</tr>

								<tr>
									<td><label for="manifest-version">Version</label></td>

									<td>
										<input
											class="input input-sm"
											type="text"
											name="manifest-version"
											id="manifest-version"
											placeholder="e.g. 1, 1.0.1, v2, etc."
										/>
									</td>
								</tr>

								<tr>
									<td><label for="manifest-author-name">Author name</label></td>

									<td>
										<input
											class="input input-sm"
											type="text"
											name="manifest-author-name"
											id="manifest-author-name"
											placeholder="Author name"
										/>
									</td>
								</tr>

								<tr>
									<td><label for="manifest-author-email">Author email</label></td>

									<td>
										<input
											class="input input-sm"
											type="email"
											id="manifest-author-email"
											name="manifest-author-email"
											placeholder="author@example.com"
										/>
									</td>
								</tr>

								<tr>
									<td><label for="manifest-author-url">Author website</label></td>

									<td>
										<input
											class="input input-sm"
											type="url"
											id="manifest-author-url"
											name="manifest-author-url"
											placeholder="https://example.com"
										/>
									</td>
								</tr>

								<tr>
									<td><label for="manifest-stepcount">Step count</label></td>

									<td>
										<input
											class="input input-sm"
											type="number"
											id="manifest-stepcount"
											name="manifest-stepcount"
											min="0"
											value={1}
											required
										/>
									</td>
								</tr>
							</tbody>
						</table>

						<h3 class="text-start text-sm">Vendor settings</h3>

						<table class="table table-zebra bg-base-100 table-sm">
							<tbody>
								<tr><th colspan="2">Erizos</th></tr>

								<tr>
									<td><label for="vendor-erizos-group">Group</label></td>

									<td>
										<input
											class="input input-sm"
											type="text"
											name="vendor-erizos-group"
											id="vendor-erizos-group"
											placeholder="Group name"
										/>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>

				<button class="btn mt-2 btn-primary" type="submit"
					>{context.isPreviewing ? 'LGTM!' : 'Preview'}</button
				>
			</form>
		{/if}
	</div>

	<footer class="lg:col-span-2">
		<StatusBar type={statusType}>{status}</StatusBar>
	</footer>
</div>

<style>
	tr:has(input[required]) label::after,
	label:has([required]) span::after {
		content: '*';
		margin-left: 0.25em;
	}
</style>
