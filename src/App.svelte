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
            alert(`Please assign a trigger to ${action} before submitting.`)
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

        template = interpreter.createTestTemplate(actionsToTriggersMap)
        document.querySelector('.drop-zone')?.replaceWith(template)
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
            manifest = await interpreter.createManifest(actionsToTriggersMap)
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

    <FileUploader accept=".riv" onFile={handleRivFile} />

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
        <div class="card">
            <span class="label">Rive ViewModel Properties</span>
            <ul>
                {#each riveProps as prop (prop.name)}
                    <li>
                        {prop.name} ({prop.type})
                        {#if prop.type === ('trigger' as any)}
                            <select
                                name="assign_{prop.name}"
                                onchange={(e) =>
                                    (triggersToActionsMap[prop.name] = e
                                        .currentTarget.value as
                                        | 'playAction'
                                        | 'stopAction'
                                        | 'customAction')}
                            >
                                <option value="playAction">playAction</option>
                                <option value="stopAction">stopAction</option>
                                <option value="customAction" selected
                                    >customAction</option
                                >
                            </select>
                        {/if}
                    </li>
                {/each}
            </ul>
        </div>

        {#if !hasLoaded}
            <button onclick={previewOGraf}>Preview</button>
        {/if}
    {/if}

    {#if hasLoaded}
        <button onclick={createOGraf}>LGTM!</button>
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
</style>
