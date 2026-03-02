<script lang="ts">
    import { type ViewModelProperty } from '@rive-app/webgl2/rive_advanced.mjs'
    import FileUploader from './lib/FileUploader.svelte'
    import RiveInterpreter, {
        type NestableRecord,
        type TriggerMap,
    } from './lib/rive-interpreter'
    import RiveOGrafTemplate from './lib/RiveOGrafTemplate'
    import type { GraphicsManifest } from 'ograf'
    import type { ViewModel, ViewModelInstance } from '@rive-app/webgl2'

    let status = $state('No file uploaded')
    let statusType = $state<'error' | 'success' | 'warn' | 'info'>('error')
    // let riveProps = $state<ViewModelProperty[]>([])
    let riveViewModelInfo: Awaited<
        ReturnType<RiveInterpreter['parseViewModels']>
    > = $state({
        viewModels: [],
        viewModelInstances: {},
    })
    let interpreter: RiveInterpreter | undefined = $state()
    let manifest: GraphicsManifest | undefined = $state()
    let template: RiveOGrafTemplate | undefined = $state()
    let hasLoaded = $state(false)
    let triggersToActionsMap = $state<{
        [key: string]: 'playAction' | 'stopAction' | 'customAction'
    }>({})
    let listsToViewModelsMap = $state<{
        [key: string]: ViewModel // list of instance names for this list property
    }>({})

    const defaultViewModelName = $derived(
        riveViewModelInfo.viewModels[0]?.name || '',
    )
    const defaultViewModelInstance = $derived(
        riveViewModelInfo.viewModelInstances[defaultViewModelName]?.[0],
    )
    const riveProps = $derived(defaultViewModelInstance?.properties || [])
    const defaultStepCount = $derived(
        riveProps.find((prop) => prop.name === 'stepCount')
            ? riveProps.find((prop) => prop.name === 'stepCount')
            : 1,
    )

    async function handleRivFile(file: File) {
        if (!file.name.endsWith('.riv')) {
            alert('Only .riv files are supported.')
            return
        }

        status = `Uploaded file: ${file.name}`
        statusType = 'info'

        interpreter = new RiveInterpreter({
            buffer: await file.arrayBuffer(),
            onFileLoad: async (file) => {
                // riveProps = await interpreter!.parseProperties()
                riveViewModelInfo = await interpreter!.parseViewModels()
                triggersToActionsMap = riveProps.reduce(
                    (map, prop) => {
                        // @ts-expect-error - Rive DataType is messed up and doesn't recognize 'trigger' as a valid type
                        if (prop.type === 'trigger') {
                            map[prop.name] = 'customAction'
                        }
                        return map
                    },
                    {} as {
                        [key: string]:
                            | 'playAction'
                            | 'stopAction'
                            | 'customAction'
                    },
                )
                status = 'ViewModel properties parsed'
                statusType = 'success'
            },
        })
    }

    const getTriggerForAction = (
        action: 'playAction' | 'stopAction',
    ): string => {
        const trigger = Object.keys(triggersToActionsMap).find(
            (key) => triggersToActionsMap[key] === action,
        )

        if (!trigger) {
            alert(
                "You must have exactly one trigger assigned to 'playAction' and 'stopAction'.",
            )
            throw new Error(`No trigger assigned to ${action}`)
        }

        return trigger
    }

    const actionsToTriggersMap: TriggerMap = $derived({
        playAction: getTriggerForAction('playAction'),
        stopAction: getTriggerForAction('stopAction'),
        customActions: Object.entries(triggersToActionsMap)
            .filter(([_, action]) => action === 'customAction')
            .map(([trigger, _]) => trigger),
    })

    const extractPropertyDefaults = (
        formData: FormData,
        properties: ViewModelProperty[],
    ) => {
        const propertyDefaults: NestableRecord = {}

        properties.forEach((prop) => {
            // @ts-expect-error - Rive DataType is messed up and doesn't recognize 'trigger' as a valid type
            if (prop.type === 'trigger') {
                return
            }

            // @ts-expect-error - Rive DataType is messed up and doesn't recognize 'list' as a valid type
            if (prop.type === 'list') {
                const listItemForms = document.querySelectorAll(
                    `form[data-list-property="${prop.name}"]`,
                )! as NodeListOf<HTMLFormElement>

                propertyDefaults[prop.name] = []
                const listItemDefaults: NestableRecord[] = propertyDefaults[
                    prop.name
                ] as NestableRecord[]

                listItemForms.forEach((form) => {
                    listItemDefaults.push(
                        extractPropertyDefaults(
                            new FormData(form),
                            listsToViewModelsMap[prop.name].properties,
                        ),
                    )
                })
                return
            }

            const value = formData.get(`property-${prop.name}`) as string
            if (value && value.trim() !== '') {
                propertyDefaults[prop.name] =
                    (prop.type as any) === 'number' ? Number(value) : value
            }
        })

        return propertyDefaults
    }

    const previewOGraf = async (formData: FormData) => {
        if (statusType !== 'success' || !interpreter) {
            alert('Please upload a valid .riv file first.')
            return
        }

        const propertyDefaults = extractPropertyDefaults(formData, riveProps)
        console.log(propertyDefaults)
        template = interpreter.createTestTemplate(
            actionsToTriggersMap,
            propertyDefaults,
        )
        document.querySelector('#preview-container')?.replaceWith(template)
        template.load({
            renderType: 'realtime',
            renderCharacteristics: { accessToPublicInternet: true },
        })
        hasLoaded = true
    }

    const createOGraf = async (formData: FormData) => {
        if (!interpreter) {
            return
        }

        try {
            const authorName = formData.get('manifest-author-name') as string
            const authorEmail = formData.get('manifest-author-email') as string
            const authorUrl = formData.get('manifest-author-url') as string

            const propertyDefaults = extractPropertyDefaults(
                formData,
                riveProps,
            )

            const metadata = {
                name: formData.get('manifest-name') as string,
                description: formData.get('manifest-description') as string,
                id: formData.get('manifest-id') as string,
                author: {
                    name: authorName,
                    ...(authorEmail && { email: authorEmail }),
                    ...(authorUrl && { url: authorUrl }),
                },
                stepCount: Number(formData.get('manifest-stepcount')) || 1,
            }

            manifest = await interpreter.createManifest(
                actionsToTriggersMap,
                propertyDefaults,
                metadata,
            )
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

{#snippet rivePropertiesTable(
    props: ViewModelProperty[],
    vmi?: ViewModelInstance,
)}
    <table class="property-list">
        <thead>
            <tr>
                <th>Property name</th>
                <th>Default value</th>
            </tr>
        </thead>
        <tbody>
            {#each props as prop (prop.name)}
                <tr>
                    <td
                        >{prop.name}
                        {#if prop.type === ('list' as any)}{/if}
                    </td>
                    <!-- We need the "any" here because of the Rive DataType issue and not being able to use @ts-expect-error here -->
                    {#if prop.type === ('trigger' as any)}
                        <td>
                            <select
                                name="assign_trigger_{prop.name}"
                                onchange={(e) =>
                                    (triggersToActionsMap[prop.name] = e
                                        .currentTarget.value as
                                        | 'playAction'
                                        | 'stopAction'
                                        | 'customAction')}
                            >
                                <option value="playAction">Play action</option>
                                <option value="stopAction">Stop action</option>
                                <option value="customAction" selected
                                    >Custom action</option
                                >
                            </select>
                        </td>
                    {:else if prop.type === ('list' as any)}
                        <!-- We need the "any"s here because of the Rive DataType issue and not being able to use @ts-expect-error here -->
                        <td>
                            <select
                                name="assign_list_{prop.name}"
                                onchange={(e) => {
                                    listsToViewModelsMap[prop.name] =
                                        riveViewModelInfo.viewModels.find(
                                            (vm) =>
                                                vm.name ===
                                                e.currentTarget.value,
                                        )!
                                }}
                            >
                                <option value="" disabled selected
                                    >Select a view model for this list</option
                                >
                                {#each riveViewModelInfo.viewModels as vm, vmIndex (vm.name)}
                                    {#if vmIndex > 0}
                                        <option value={vm.name}
                                            >{vm.name}</option
                                        >
                                    {/if}
                                {/each}
                            </select>
                        </td>
                    {:else if prop.type === ('number' as any)}
                        <!-- We need the "any"s here because of the Rive DataType issue and not being able to use @ts-expect-error here -->
                        <td>
                            <input
                                type="number"
                                name="property-{prop.name}"
                                placeholder={prop.type as any}
                                value={vmi?.number(prop.name)?.value ?? ''}
                            />
                        </td>
                    {:else}
                        <td>
                            <!-- We need the "any"s here because of the Rive DataType issue and not being able to use @ts-expect-error here -->
                            <input
                                type="text"
                                name="property-{prop.name}"
                                placeholder={prop.type as any}
                                value={vmi?.string(prop.name)?.value ?? ''}
                            />
                        </td>
                    {/if}
                </tr>
                {#if prop.type === ('list' as any)}
                    {@const vm = listsToViewModelsMap[prop.name]}
                    {#if vm}
                        <tr class="nested-row">
                            <td colspan="2">
                                <p>
                                    List items: {riveViewModelInfo
                                        .viewModelInstances[vm.name]?.length ??
                                        0}
                                </p>
                                <div>
                                    {#each riveViewModelInfo.viewModelInstances[vm.name] as instance}
                                        <form data-list-property={prop.name}>
                                            {@render rivePropertiesTable(
                                                vm.properties,
                                                instance,
                                            )}
                                        </form>
                                    {/each}
                                </div>
                                <button
                                    type="button"
                                    onclick={() => {
                                        const newVMI = vm.instance()!
                                        riveViewModelInfo.viewModelInstances[
                                            vm.name
                                        ].push(newVMI)
                                    }}>+ New list item</button
                                >
                            </td>
                        </tr>
                    {/if}
                {/if}
            {/each}
        </tbody>
    </table>
{/snippet}

<main>
    <h1>Rive OGraf Wrapper</h1>

    <div id="preview-container">
        {#if !riveProps.length}
            <FileUploader accept=".riv" onFile={handleRivFile} />
        {:else}
            <p class="preview-cover">Assign file properties below</p>
        {/if}
    </div>

    {#if hasLoaded}
        <div class="card actions">
            <p class="label label-big">Preview Controls</p>
            {#each Object.entries(actionsToTriggersMap) as [action, trigger] (action)}
                {#if action === 'customActions'}
                    <div class="custom-actions">
                        <p class="label">Custom actions</p>
                        {#if !trigger || !Array.isArray(trigger) || trigger.length === 0}
                            <p>None</p>
                        {/if}

                        {#each trigger as customTrigger}
                            <button
                                onclick={() => {
                                    template?.customAction({
                                        id: customTrigger,
                                        payload: {},
                                    })
                                }}>{customTrigger.toUpperCase()}</button
                            >
                        {/each}
                    </div>
                {:else}
                    <button
                        onclick={() => {
                            template?.[action as 'playAction' | 'stopAction'](
                                {},
                            )
                        }}>{action.replace('Action', '').toUpperCase()}</button
                    >
                {/if}
            {/each}
        </div>
    {/if}

    <div class="card">
        <span class="label">Status</span>
        <p data-status={statusType}>{status}</p>
    </div>

    {#if riveProps.length}
        <form
            onsubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)

                // TODO: Form validation

                if (!hasLoaded) {
                    previewOGraf(formData)
                    return
                }

                createOGraf(formData)
            }}
        >
            <div class="card">
                <span class="label">Rive ViewModel Properties</span>
                {@render rivePropertiesTable(
                    riveProps,
                    defaultViewModelInstance,
                )}
            </div>

            <div class="card">
                <span class="label">Graphic Metadata</span>
                <table class="metadata-form">
                    <tbody>
                        <tr>
                            <td><label for="manifest-name">Name</label></td>
                            <td
                                ><input
                                    type="text"
                                    id="manifest-name"
                                    name="manifest-name"
                                    placeholder="Graphic name"
                                    required
                                /></td
                            >
                        </tr>
                        <tr>
                            <td
                                ><label for="manifest-description"
                                    >Description</label
                                ></td
                            >
                            <td
                                ><textarea
                                    id="manifest-description"
                                    name="manifest-description"
                                    placeholder="Brief description (optional)"
                                    >OGraf Graphic containing a Rive state
                                    machine.</textarea
                                ></td
                            >
                        </tr>
                        <tr>
                            <td><label for="manifest-id">ID</label></td>
                            <td
                                ><input
                                    type="text"
                                    id="manifest-id"
                                    name="manifest-id"
                                    placeholder="Unique identifier for this graphic"
                                    value="rive-ograf-template"
                                    required
                                /></td
                            >
                        </tr>
                        <tr>
                            <td
                                ><label for="manifest-author-name"
                                    >Author name</label
                                ></td
                            >
                            <td
                                ><input
                                    type="text"
                                    id="manifest-author-name"
                                    name="manifest-author-name"
                                    placeholder="Author name"
                                    required
                                /></td
                            >
                        </tr>
                        <tr>
                            <td
                                ><label for="manifest-author-email"
                                    >Author email</label
                                ></td
                            >
                            <td
                                ><input
                                    type="email"
                                    id="manifest-author-email"
                                    name="manifest-author-email"
                                    placeholder="author@example.com"
                                /></td
                            >
                        </tr>
                        <tr>
                            <td
                                ><label for="manifest-author-url"
                                    >Author website</label
                                ></td
                            >
                            <td
                                ><input
                                    type="url"
                                    id="manifest-author-url"
                                    name="manifest-author-url"
                                    placeholder="https://example.com"
                                /></td
                            >
                        </tr>
                        <tr>
                            <td
                                ><label for="manifest-stepcount"
                                    >Step count</label
                                ></td
                            >
                            <td
                                ><input
                                    type="number"
                                    id="manifest-stepcount"
                                    name="manifest-stepcount"
                                    min="0"
                                    value={defaultStepCount}
                                    required
                                /></td
                            >
                        </tr>
                    </tbody>
                </table>
            </div>

            <button type="submit">{hasLoaded ? 'LGTM!' : 'Preview'}</button>
        </form>
    {/if}
</main>

<style>
    button {
        color: white;
        padding: 0.5em 1.5em;
    }

    .label {
        font-weight: 500;
        text-transform: uppercase;

        &.label-big {
            font-size: 1.25em;
        }
    }

    .card {
        margin: 2em 0;
        text-align: left;

        > .label {
            & + p[data-status='error'] {
                color: #ff4d4f;
            }
            & + p[data-status='success'] {
                color: #52c41a;
            }
            & + p[data-status='warn'] {
                color: #faad14;
            }
            & + p[data-status='info'] {
                color: #1890ff;
            }

            & + p:before {
                content: '|';
                margin: 0 1em 0 0;
            }
        }
    }

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

    .actions {
        background-color: oklch(from currentColor l c h / 0.1);
        margin-block: 1em;
        padding: 1em;
        border-radius: 0.25em;

        > .label-big {
            font-weight: 700;
            margin-top: 0;
        }

        button {
            margin-right: 0.25em;
        }
    }

    table {
        margin-top: 1em;
        width: 100%;
        border-collapse: collapse;
        font-size: 0.75rem;

        tr:not(.nested-row) > td,
        tr:not(.nested-row) > th {
            padding: 0.25em 0.75em;

            &:first-child {
                min-width: 50%;
            }

            &:last-child {
                width: 180px;
            }
        }

        thead th {
            background-color: oklch(from currentColor l c h / 0.1);
            border-bottom: 1px solid oklch(from currentColor l c h / 0.2);
        }

        tbody tr:nth-child(odd) {
            background-color: oklch(from currentColor l c h / 0.05);
        }
    }

    table.property-list tbody {
        font-family: monospace;
    }

    input,
    textarea,
    select {
        width: 100%;
        padding: 0.25em;
        border: 1px solid oklch(from currentColor l c h / 0.2);
        border-radius: 0.25em;
        background: oklch(from currentColor 0.95 c h);
    }

    tr:has(input[required]) label {
        &::after {
            content: '*';
            margin-left: 0.25em;
        }
    }

    .nested-row {
        background-color: oklch(from currentColor 0.2 c h);
        border-block-end: 1px solid oklch(from currentColor l c h / 0.2);

        td {
            padding: 2em 4em;

            p {
                margin: 0;
            }

            div {
                display: flex;
                flex-wrap: wrap;
                gap: 1em;

                table {
                    flex-basis: fit-content;
                    flex: 0 1;

                    th {
                        white-space: nowrap;
                    }
                }
            }
        }
    }
</style>
