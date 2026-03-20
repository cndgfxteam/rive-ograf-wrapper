<script lang="ts">
	import './app.css'
	import { type ViewModelProperty } from '@rive-app/webgl2/rive_advanced.mjs'
	import FileUploader from './lib/FileUploader.svelte'
	import RiveInterpreter, { type TriggerMap } from './lib/rive-interpreter'
	import RiveOGrafTemplate from './lib/RiveOGrafTemplate'
	import type { GraphicsAPI, GraphicsManifest } from 'ograf'

	const STATUS_TYPES = ['error', 'success', 'warn', 'info'] as const
	const STATUS_VARIANTS = {
		error: 'status-error',
		success: 'status-success',
		warn: 'status-warning',
		info: 'status-info',
	} as const
	const TEXT_VARIANTS = {
		error: 'text-error',
		success: 'text-success',
		warn: 'text-warning',
		info: 'text-info',
	} as const

	const DEFAULT_DESCRIPTION =
		'OGraf Graphic containing a Rive state machine. Generated using the Rive OGraf Wrapper tool.'

	let hasUploaded = $state(false)
	let isPreviewing = $state(false)
	let status = $state('No file uploaded')
	let statusType = $state<'error' | 'success' | 'warn' | 'info'>('error')
	let interpreter: RiveInterpreter | undefined = $state()
	let manifest: GraphicsManifest | undefined = $state()
	let template: (HTMLElement & GraphicsAPI.Graphic) | undefined = $state()
	let playActionTrigger = $state('')
	let stopActionTrigger = $state('')
	let triggers = $state<string[]>([])

	const customActionTriggers = $derived(
		triggers.filter((t) => t !== playActionTrigger && t !== stopActionTrigger)
	)
	const actionsToTriggersMap: TriggerMap = $derived({
		playAction: playActionTrigger,
		stopAction: stopActionTrigger,
		customActions: customActionTriggers,
	})

	async function handleRivFile(file: File) {
		if (!file.name.endsWith('.riv')) {
			alert('Only .riv files are supported.')

			return
		}

		status = `Uploaded file: ${file.name}`
		statusType = 'info'

		interpreter = new RiveInterpreter({
			buffer: await file.arrayBuffer(),
			onFileLoad: async (trigs) => {
				status = 'ViewModel properties parsed'
				statusType = 'success'
				triggers = trigs
				hasUploaded = true
			},
		})
	}

	const previewOGraf = async (formData: FormData) => {
		if (statusType !== 'success' || !interpreter) {
			alert('Please upload a valid .riv file first.')

			return
		}

		template = interpreter.createTestTemplate(actionsToTriggersMap)
		document.querySelector('#preview-container')?.replaceWith(template)

		await template.load({
			renderType: 'realtime',
			renderCharacteristics: { accessToPublicInternet: true },
		})

		isPreviewing = true
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

			manifest = await interpreter.createManifest(actionsToTriggersMap, metadata)
			await interpreter.createOGrafPackage(manifest, actionsToTriggersMap)
			status = 'OGraf package created! Download initiated.'
			statusType = 'success'
		} catch (e) {
			console.error('Error creating OGraf package:', e)
			status = 'Failed to create OGraf package'
			statusType = 'error'
		}
	}
</script>

<main>
	<h1>Rive OGraf Wrapper</h1>

	<div id="preview-container">
		{#if !hasUploaded}
			<FileUploader accept=".riv" onFile={handleRivFile} />
		{:else}
			<p class="preview-cover">Assign file properties below</p>
		{/if}
	</div>

	{#if isPreviewing}
		<div class="card bg-neutral/50 text-start text-neutral-content card-sm">
			<div class="card-body">
				<h2 class="card-title">Preview Controls</h2>

				<div>
					<button
						class="btn btn-sm btn-primary"
						onclick={() => {
							template?.playAction({})
						}}>PLAY</button
					>
					<button
						class="btn btn-sm btn-secondary"
						onclick={() => {
							template?.stopAction({})
						}}>STOP</button
					>
				</div>
				{#each actionsToTriggersMap.customActions as trigger}
					<div>
						<h3 class="mt-4 mb-2 text-sm">Custom actions</h3>

						<button
							class="btn btn-sm"
							onclick={() => {
								template?.customAction({ id: trigger, payload: {} })
							}}>{trigger.toUpperCase()}</button
						>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<div class="card my-4 bg-base-200 card-sm">
		<div class="card-body flex-row items-center gap-4">
			<h2 class="card-title">Status</h2>
			<div class="flex flex-row items-baseline gap-1">
				<div class="status {STATUS_VARIANTS[statusType]}"></div>
				<span class={TEXT_VARIANTS[statusType]}>{status}</span>
			</div>
		</div>
	</div>

	{#if hasUploaded}
		<form
			onsubmit={(e) => {
				e.preventDefault()
				const formData = new FormData(e.currentTarget)

				// TODO: Form validation

				if (!isPreviewing) {
					previewOGraf(formData)
					return
				}

				createOGraf(formData)
			}}
		>
			<div class="card">
				<div class="card-body">
					<h2 class="card-title">Assign Actions</h2>
					<label
						><span>Play action trigger</span>
						<select
							class="select select-sm"
							name="playActionTrigger"
							bind:value={playActionTrigger}
							required
						>
							<option value="" selected disabled></option>
							{#each triggers as trigger}
								<option value={trigger}>{trigger}</option>
							{/each}
						</select></label
					>
					<label
						><span>Stop action trigger</span>
						<select
							class="select select-sm"
							name="stopActionTrigger"
							bind:value={stopActionTrigger}
							required
						>
							<option value="" selected disabled></option>
							{#each triggers as trigger}
								<option value={trigger}>{trigger}</option>
							{/each}
						</select></label
					>
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
				>{isPreviewing ? 'LGTM!' : 'Preview'}</button
			>
		</form>
	{/if}
</main>

<style>
	.preview-cover {
		display: flex;
		align-items: center;
		justify-content: center;
		background: repeating-linear-gradient(
			-45deg,
			transparent,
			transparent 8px,
			oklch(from currentColor l c h / 0.05) 8px,
			oklch(from currentColor l c h / 0.05) 16px
		);
		width: 500px;
		max-width: 100%;
		height: 200px;
		text-align: center;
		font-weight: 500;
		color: oklch(from currentColor l c h / 0.8);
		border: 1px solid oklch(from currentColor l c h / 0.1);
		margin: 0;
	}

	tr:has(input[required]) label::after,
	label:has([required]) span::after {
		content: '*';
		margin-left: 0.25em;
	}
</style>
