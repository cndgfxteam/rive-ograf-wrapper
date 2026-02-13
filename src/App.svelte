<script lang="ts">
    import { type ViewModelProperty } from "@rive-app/webgl2/rive_advanced.mjs"
    import FileUploader from "./lib/FileUploader.svelte"
    import RiveInterpreter, { type TriggerMap } from "./lib/rive-interpreter"
    import RiveOGrafTemplate from "./lib/RiveOGrafTemplate"
    
    let status = $state('No file uploaded')
    let statusType = $state<'error'|'success'|'warn'|'info'>('error')
    let riveProps = $state<ViewModelProperty[]>([])
    let interpreter: RiveInterpreter|undefined = $state()
    let template: RiveOGrafTemplate|undefined = $state()
    let hasLoaded = $state(false)
    let triggersToActionsMap = $state<{ [key: string]: 'playAction' | 'stopAction' | 'customAction' }>({})

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
                status = 'ViewModel properties parsed'
                statusType = 'success'
            }
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

    const onSubmit = async () => {
        if (statusType !== 'success' || !interpreter) {
            alert('Please upload a valid .riv file first.')
            return
        }

        const actionsToTriggersMap: TriggerMap = {
            playAction: getTriggerForAction('playAction'),
            stopAction: getTriggerForAction('stopAction'),
        }

        const manifest = await interpreter.createManifest(actionsToTriggersMap)
        template = interpreter.createTestTemplate(actionsToTriggersMap)
        document.querySelector('.drop-zone')?.replaceWith(template)
        template.load({renderType: 'realtime'})
        hasLoaded = true
        
        try {
            await interpreter.createOGrafPackage(manifest, actionsToTriggersMap)
            status = 'OGraf package created! Download initiated.'
            statusType = 'success'
        } catch (e) {
            console.error('Error creating OGraf package:', e)
            status = 'Failed to create OGraf package'
            statusType = 'error'
        }
    }

    const triggerIn = () => {
        template?.playAction({delta: 1})
    }

    const triggerOut = () => {
        template?.stopAction({})
    }
</script>

<main>
  <h1>Rive OGraf Wrapper</h1>

  <FileUploader accept=".riv" onFile={handleRivFile} />

  <div class="card">
    <span class="label">Status</span>
    <p data-status={statusType}>{status}</p>
  </div>

  {#if riveProps.length}
    <div class="card">
      <span class="label">Rive ViewModel Properties</span>
      <ul>
        {#each riveProps as prop (prop.name)}
          <li>{prop.name} ({prop.type})
            {#if prop.type === 'trigger' as any}
                <select name="assign_{prop.name}" onchange={(e) => triggersToActionsMap[prop.name] = e.currentTarget.value as 'playAction' | 'stopAction' | 'customAction'}>
                    <option value="playAction">playAction</option>
                    <option value="stopAction">stopAction</option>
                    <option value="customAction" selected>customAction</option>
                </select>
            {/if}
          </li>
        {/each}
      </ul>
    </div>

    <button onclick={onSubmit}>LGTM!</button>
  {/if}
  {#if hasLoaded}
    <div class="card">
        <button onclick={triggerIn}>IN</button>
        <button onclick={triggerOut}>OUT</button>
    </div>
  {/if}
</main>

<style>
    button {
        color: white;
    }
    .card {
        margin: 2em 0;
        text-align: left;

        > .label {
            font-weight: bold;
            text-transform: uppercase;

            & + p[data-status="error"] {
                color: #ff4d4f;
            }
            & + p[data-status="success"] {
                color: #52c41a;
            }
            & + p[data-status="warn"] {
                color: #faad14;
            }
            & + p[data-status="info"] {
                color: #1890ff;
            }

            & + p:before {
                content: "|";
                margin: 0 1em 0 0;
            }
        }
    }
</style>
