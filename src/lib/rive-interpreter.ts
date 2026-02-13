import { Rive, RiveFile, EventType } from '@rive-app/webgl2'
import type { ViewModelProperty } from '@rive-app/webgl2/rive_advanced.mjs'
import type { GraphicsManifest } from 'ograf'
import RiveOGrafTemplate from './RiveOGrafTemplate'
import JSZip from 'jszip'

type RiveInterpreterOptions = (
    | { src: string; buffer?: never }
    | { src?: never; buffer: ArrayBuffer }
) & {
    onFileLoad?: (file: RiveFile) => void
}

export interface TriggerMap {
    playAction: string
    stopAction: string
}

export default class RiveInterpreter {
    #buffer: ArrayBuffer
    #canvas: OffscreenCanvas
    #riveFile?: RiveFile
    #riveInstance?: Rive
    #isInstanceLoaded: boolean = false
    #onFileLoad?: (file: RiveFile) => void
    #artboardHeight: number = 0
    #artboardWidth: number = 0
    #propertiesCache?: ViewModelProperty[]

    constructor(options: RiveInterpreterOptions) {
        if (!options.src && !options.buffer) {
            throw new Error(
                'Rive file is required for RiveInterpreter constructor.',
            )
        }

        if (options.src && options.buffer) {
            throw new Error(
                'Provide either src or buffer, not both, to RiveInterpreter constructor.',
            )
        }

        this.#canvas = new OffscreenCanvas(1, 1)
        this.#onFileLoad = options.onFileLoad
        this.#buffer = options.buffer ?? new ArrayBuffer(0)

        this.loadRiveFile(options.buffer ?? options.src)
    }

    async loadRiveFile(src: string | ArrayBuffer) {
        const loadMethod =
            src instanceof ArrayBuffer ? { buffer: src } : { src }
        const file = new RiveFile({
            ...loadMethod,
            onLoad: (e) => {
                // console.log('Rive file loaded successfully.', e)
                this.#riveFile = file
                this.#onFileLoad?.(file)
            },
            onLoadError: (err) => {
                throw new Error(`Failed to load Rive file: ${err}`)
            },
        })

        try {
            await file.init()
            return file
        } catch (e) {
            console.error(e)
            return
        }
    }

    async parseProperties(): Promise<ViewModelProperty[]> {
        if (!this.#riveFile) {
            throw new Error('Rive file not loaded yet.')
        }

        if (!this.#riveInstance) {
            this.#riveInstance = new Rive({
                riveFile: this.#riveFile,
                canvas: this.#canvas,
                autoBind: true,
            })
        }

        // TODO: reject promise on improperly formatted Rive files
        return new Promise<ViewModelProperty[]>((resolve) => {
            if (this.#isInstanceLoaded && this.#propertiesCache) {
                resolve(this.#propertiesCache)
                return
            }

            this.#riveInstance!.on(EventType.Load, () => {
                this.#isInstanceLoaded = true
                this.#propertiesCache =
                    this.#riveInstance!.viewModelInstance?.properties ?? []
                this.#artboardHeight = this.#riveInstance!.artboardHeight
                this.#artboardWidth = this.#riveInstance!.artboardWidth
                resolve(this.#propertiesCache)
            })
        })
    }

    async createManifest(triggerMap: TriggerMap): Promise<GraphicsManifest> {
        try {
            const template: GraphicsManifest = await (
                await fetch('./manifest.ograf.json')
            ).json()
            const properties = this.#propertiesCache

            if (!properties) {
                throw new Error(
                    'Properties must be parsed before creating manifest.',
                )
            }

            template.customActions = []
            template[__MANIFEST_VERSION_KEY__] = __VERSION__
            template.schema = {
                type: 'object',
                properties: {},
            }

            properties.forEach((prop) => {
                if (
                    prop.name === triggerMap.playAction ||
                    prop.name === triggerMap.stopAction
                ) {
                    return
                }

                /* @ts-expect-error - Rive's DataType enum is weird and behaves like a string but types like a number */
                if (prop.type === 'trigger') {
                    template.customActions!.push({
                        id: prop.name,
                        name: prop.name,
                        description: `Auto-generated custom action for ${prop.name}`,
                    })
                    return
                }

                template.schema!.properties![prop.name] = {
                    type: prop.type,
                    title: prop.name,
                    description: `Auto-generated property for ${prop.name}`,
                }
            })

            return template
        } catch (e) {
            throw new Error(`Failed to create manifest: ${e}`)
        }
    }

    createTestTemplate(triggerMap: TriggerMap): RiveOGrafTemplate {
        if (!this.#riveFile) {
            throw new Error('Rive file not loaded yet.')
        }

        if (!this.#propertiesCache) {
            throw new Error('Properties not parsed yet.')
        }

        return new RiveOGrafTemplate(
            this.#riveFile,
            this.#artboardWidth,
            this.#artboardHeight,
            triggerMap,
        )
    }

    async createOGrafPackage(
        manifest: GraphicsManifest,
        triggerMap: TriggerMap,
    ) {
        if (!this.#riveFile) {
            throw new Error('Rive file not loaded yet.')
        }

        const res = await fetch('./RiveOGrafTemplate.mjs')
        const template = await res.text()
        const bufferData = new Uint8Array(this.#buffer)
        const fileContent = template
            .replace(`#width = 500`, `#width = ${this.#artboardWidth}`)
            .replace(`#height = 500`, `#height = ${this.#artboardHeight}`)
            .replace('${PLAY_ACTION_TRIGGER}', triggerMap.playAction)
            .replace('${STOP_ACTION_TRIGGER}', triggerMap.stopAction)
            .replace("'${RIVE_FILE}'", `[${bufferData.toString()}]`)
        const zip = new JSZip()

        zip.file(manifest.main, fileContent)
        zip.file('manifest.ograf.json', JSON.stringify(manifest))

        zip.generateAsync({ type: 'blob' }).then((blob) => {
            this.#triggerDownload(blob, `${manifest.id}.zip`)
            console.info('Template generated and download triggered.')
        })
    }

    #triggerDownload(blob: Blob, filename: string) {
        const url = URL.createObjectURL(blob)
        const downloadLink = document.createElement('a')
        downloadLink.href = url
        downloadLink.download = filename
        document.body.appendChild(downloadLink)
        downloadLink.click()
        document.body.removeChild(downloadLink)
        URL.revokeObjectURL(url)
    }
}
