<script lang="ts">
	import type { ViewModelInstance } from '@rive-app/webgl2'
	import { getAppContext } from './lib/context.svelte'
	import { getInstancePropertyValue } from './lib/rive-interpreter'
	import RiveViewModelTable from './RiveViewModelTable.svelte'

	type Props = {
		vmi: ViewModelInstance
		path?: string
	}

	let { vmi, path = '/' }: Props = $props()

	const context = getAppContext()
</script>

<table class="table bg-neutral/5 table-xs">
	<thead>
		<tr>
			<th>
				<span>{vmi.viewModelName}</span>
				<!-- <span class="font-light italic">(type)</span> -->
			</th>
			<!-- <th>Value</th> -->
		</tr>
	</thead>
	<tbody>
		{#each vmi.properties.filter(({ type }) => type !== 'trigger') as { name, type }}
			<tr>
				<td>
					<div class="flex flex-wrap items-center justify-end gap-2">
						<div><span>{name}</span> <span class="font-light italic">({type})</span></div>
						{#if type === 'list'}
							<button
								class="btn ml-2 btn-soft btn-xs"
								onclick={() => {
									// list.addInstance()
								}}>+ Add item</button
							>
						{/if}
					</div>
				</td>
				<td class="flex justify-start gap-1">
					{#if type === 'list'}
						{@const list = vmi.list(name)!}
						{@const listCount = list.length}
						{@const instances = Array.from(
							{ length: listCount },
							(_, i) => vmi.list(name)!.instanceAt(i)!
						)}
						{#each instances as instance}
							<RiveViewModelTable vmi={instance} path={`${path}/${name}`}></RiveViewModelTable>
						{/each}
					{:else if type === 'viewModel'}
						{@const instance = vmi.viewModel(name)!}
						<RiveViewModelTable vmi={instance} path={`${path}/${name}`}></RiveViewModelTable>
					{:else}
						<!-- TODO: we can do better here, this is a little gross -->
						<input
							class="input input-xs"
							type={type === 'number' ? 'number' : type === 'boolean' ? 'checkbox' : 'text'}
							checked={type === 'boolean'
								? (getInstancePropertyValue({ name, type }, vmi) as boolean)
								: undefined}
							value={type !== 'boolean' ? getInstancePropertyValue({ name, type }, vmi) : undefined}
							name={`${path}/${name}`}
						/>
					{/if}
				</td>
			</tr>
		{/each}
	</tbody>
</table>

<style></style>
