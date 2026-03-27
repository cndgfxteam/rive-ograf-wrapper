<script lang="ts">
	import type { GraphicsManifest } from 'ograf'
	import { getAppContext } from './lib/context.svelte'
	import RiveInterpreter from './lib/rive-interpreter'

	const DEFAULT_DESCRIPTION =
		'OGraf Graphic containing a Rive state machine. Generated using the Rive OGraf Wrapper tool.'

	type Props = {
		interpreter: RiveInterpreter | undefined
	}

	let { interpreter }: Props = $props()

	const context = getAppContext()
	let status = $state('No file uploaded')
	let statusType = $state<'error' | 'success' | 'warn' | 'info'>('error')
	let manifest: GraphicsManifest | undefined = $state()

	const previewOGraf = async (formData: FormData) => {
		if (!context.hasUploadedFile) {
			alert('Please upload a valid .riv file first.')
			return
		}

		if (!interpreter) {
			alert('Interpreter not initialized. Please try re-uploading your .riv file.')
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
			alert('Interpreter not initialized. Please try re-uploading your .riv file.')
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

<style>
	tr:has(input[required]) label::after,
	label:has([required]) span::after {
		content: '*';
		margin-left: 0.25em;
	}
</style>
