<script lang="ts">
    import { type ViewModelProperty } from '@rive-app/webgl2/rive_advanced.mjs'
    import FileUploader from './lib/FileUploader.svelte'
    import RiveInterpreter, { type TriggerMap } from './lib/rive-interpreter'
    import RiveOGrafTemplate from './lib/RiveOGrafTemplate'
    import type { GraphicsManifest } from 'ograf'

    let status = $state('No file uploaded')
    let statusType = $state<'error' | 'success' | 'warn' | 'info'>('error')
    let riveProps = $state<ViewModelProperty[]>([])
    let interpreter: RiveInterpreter | undefined = $state()
    let manifest: GraphicsManifest | undefined = $state()
    let template: RiveOGrafTemplate | undefined = $state()
    let hasLoaded = $state(false)
    let triggersToActionsMap = $state<{
        [key: string]: 'playAction' | 'stopAction' | 'customAction'
    }>({})
    let propertyDefaults = $state<{ [key: string]: string | number }>({})

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
                riveProps = await interpreter!.parseProperties()
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

    const previewOGraf = async () => {
        if (statusType !== 'success' || !interpreter) {
            alert('Please upload a valid .riv file first.')
            return
        }

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

    const createOGraf = async () => {
        if (!interpreter) {
            return
        }

        try {
            manifest = await interpreter.createManifest(
                actionsToTriggersMap,
                propertyDefaults,
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

                // TODO: Form validation

                if (!hasLoaded) {
                    previewOGraf()
                    return
                }

                createOGraf()
            }}
        >
            <div class="card">
                <span class="label">Rive ViewModel Properties</span>
                <table class="property-list">
                    <thead>
                        <tr>
                            <th>Property name</th>
                            <th>Default value</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each riveProps as prop (prop.name)}
                            <tr>
                                <td>{prop.name}</td>
                                <!-- We need the "any" here because of the Rive DataType issue and not being able to use @ts-expect-error here -->
                                {#if prop.type === ('trigger' as any)}
                                    <td>
                                        <select
                                            name="assign_{prop.name}"
                                            onchange={(e) =>
                                                (triggersToActionsMap[
                                                    prop.name
                                                ] = e.currentTarget.value as
                                                    | 'playAction'
                                                    | 'stopAction'
                                                    | 'customAction')}
                                        >
                                            <option value="playAction"
                                                >playAction</option
                                            >
                                            <option value="stopAction"
                                                >stopAction</option
                                            >
                                            <option
                                                value="customAction"
                                                selected>customAction</option
                                            >
                                        </select>
                                    </td>
                                {:else}
                                    <td>
                                        <!-- We need the "any"s here because of the Rive DataType issue and not being able to use @ts-expect-error here -->
                                        <input
                                            type={(prop.type as any) ===
                                            'number'
                                                ? 'number'
                                                : 'text'}
                                            name="assign_${prop.name}"
                                            placeholder={prop.type as any}
                                            bind:value={
                                                propertyDefaults[prop.name]
                                            }
                                            oninput={(e) => {
                                                const value =
                                                    e.currentTarget.value
                                                propertyDefaults[prop.name] =
                                                    (prop.type as any) ===
                                                        'number' && value !== ''
                                                        ? Number(value)
                                                        : value
                                            }}
                                        />
                                    </td>
                                {/if}
                            </tr>
                        {/each}
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

    table.property-list {
        margin-top: 1em;
        width: 100%;
        border-collapse: collapse;
        font-size: 0.75rem;

        td,
        th {
            padding: 0.25em 0.75em;

            &:first-child {
                min-width: 50%;
            }

            &:last-child {
                width: 120px;
            }
        }

        thead th {
            background-color: oklch(from currentColor l c h / 0.1);
            border-bottom: 1px solid oklch(from currentColor l c h / 0.2);
        }

        tbody {
            font-family: monospace;

            tr:nth-child(odd) {
                background-color: oklch(from currentColor l c h / 0.05);
            }
        }
    }
</style>
