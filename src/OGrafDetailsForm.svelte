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
		} catch (e) {
			console.error('Error creating OGraf package:', e)
		}
	}
</script>

{#if context.hasUploadedFile}
	<form
		class="grid grid-cols-2 items-center gap-x-4 gap-y-1 text-xs lg:text-sm *:[input,select,textarea]:justify-self-end"
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
		<h2 class="col-span-full text-sm font-medium uppercase lg:text-base">Actions</h2>
		<label for="playActionTrigger">Play action trigger</label>
		<select
			class="select select-xs lg:select-sm"
			name="playActionTrigger"
			id="playActionTrigger"
			bind:value={context.playActionTrigger}
			required
		>
			<option value="" selected disabled hidden>Select trigger...</option>
			{#each context.triggers as trigger}
				<option value={trigger}>{trigger}</option>
			{/each}
		</select>
		<label for="stopActionTrigger">Stop action trigger</label>
		<select
			class="select select-xs lg:select-sm"
			name="stopActionTrigger"
			id="stopActionTrigger"
			bind:value={context.stopActionTrigger}
			required
		>
			<option value="" selected disabled hidden>Select trigger...</option>
			{#each context.triggers as trigger}
				<option value={trigger}>{trigger}</option>
			{/each}
		</select>

		<h2 class="col-span-full mt-4 text-sm font-medium uppercase lg:text-base">Graphic Metadata</h2>
		<label for="manifest-name">Name</label>
		<input
			class="input input-xs lg:input-sm"
			type="text"
			name="manifest-name"
			id="manifest-name"
			placeholder="Graphic name"
			required
		/>
		<label for="manifest-description">Description</label>
		<textarea
			class="textarea textarea-xs lg:textarea-sm"
			name="manifest-description"
			id="manifest-description"
			placeholder="Brief description (optional)"
			rows="5">{DEFAULT_DESCRIPTION}</textarea
		>
		<label for="manifest-id">ID</label>
		<input
			class="input input-xs lg:input-sm"
			type="text"
			name="manifest-id"
			id="manifest-id"
			placeholder="Unique identifier for this graphic"
			value="rive-ograf-template"
			required
		/>
		<label for="manifest-version">Version</label>
		<input
			class="input input-xs lg:input-sm"
			type="text"
			name="manifest-version"
			id="manifest-version"
			placeholder="e.g. 1, 1.0.1, v2, etc."
		/>
		<label for="manifest-author-name">Author name</label>
		<input
			class="input input-xs lg:input-sm"
			type="text"
			name="manifest-author-name"
			id="manifest-author-name"
			placeholder="Author name"
		/>
		<label for="manifest-author-email">Author email</label>
		<input
			class="input input-xs lg:input-sm"
			type="email"
			id="manifest-author-email"
			name="manifest-author-email"
			placeholder="author@example.com"
		/>
		<label for="manifest-author-url">Author website</label>
		<input
			class="input input-xs lg:input-sm"
			type="url"
			id="manifest-author-url"
			name="manifest-author-url"
			placeholder="https://example.com"
		/>
		<label for="manifest-stepcount">Step count</label>
		<input
			class="input input-xs lg:input-sm"
			type="number"
			id="manifest-stepcount"
			name="manifest-stepcount"
			min="0"
			value={1}
			required
		/>

		<h3 class="col-span-full mt-2 text-xs font-medium uppercase lg:text-sm">
			Vendor-specific metadata
		</h3>

		<h4 class="col-span-full mt-1 border-b border-base-300 font-light tracking-wider uppercase">
			Erizos
		</h4>
		<label for="vendor-erizos-group">Group</label>
		<input
			class="input input-xs lg:input-sm"
			type="text"
			name="vendor-erizos-group"
			id="vendor-erizos-group"
			placeholder="Group name"
		/>

		<button class="btn col-start-2 mt-4 justify-self-end btn-primary" type="submit"
			>{context.isPreviewing ? 'Download' : 'Preview'}</button
		>
	</form>
{/if}

<style>
	label:has(+ [required])::after {
		content: '*';
		margin-left: calc(var(--spacing) / 2);
		color: var(--color-error);
	}
</style>
