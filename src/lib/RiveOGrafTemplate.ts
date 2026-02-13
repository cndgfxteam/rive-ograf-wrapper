import { Rive, type ViewModelInstance, type RiveFile } from '@rive-app/webgl2'
import { GraphicsAPI } from 'ograf'
import type { TriggerMap } from './rive-interpreter'
import type { GraphicInstanceLoadResponse } from './types/ograf'

class RiveOGrafTemplate extends HTMLElement implements GraphicsAPI.Graphic {
    #canvas: HTMLCanvasElement
    #currentStep: number = 0
    #width: number = 0
    #height: number = 0
    #riveFile: RiveFile
    #riveInstance: Rive | undefined
    #vmi: ViewModelInstance | undefined
    #playActionTrigger: string
    #stopActionTrigger: string

    constructor(
        riveFile: RiveFile,
        width: number,
        height: number,
        triggerMap: TriggerMap,
    ) {
        super()
        this.attachShadow({ mode: 'open' })
        this.#canvas = document.createElement('canvas')
        this.#width = width > 500 ? 500 : width
        this.#height = width > 500 ? (height / (width || 1)) * 500 : height
        this.#riveFile = riveFile
        this.#playActionTrigger = triggerMap.playAction
        this.#stopActionTrigger = triggerMap.stopAction
    }

    connectedCallback() {}

    async load(params: any) {
        if (params.renderType !== 'realtime') {
            throw new Error('Non-realtime not supported by this graphic.')
        }

        try {
            if (this.#riveInstance) {
                return this.updateAction(params)
            }

            return new Promise<GraphicInstanceLoadResponse>((resolve) => {
                this.#canvas.width = this.#width
                this.#canvas.height = this.#height
                this.#canvas.style.outline = '1px solid #fff'
                this.shadowRoot?.appendChild(this.#canvas)

                this.#riveInstance = new Rive({
                    riveFile: this.#riveFile,
                    canvas: this.#canvas,
                    autoplay: true,
                    autoBind: true,
                    stateMachines: 'State Machine 1',
                    onLoad: async () => {
                        this.#riveInstance!.resizeDrawingSurfaceToCanvas()

                        if (!this.#riveInstance!.viewModelInstance) {
                            return resolve({
                                statusCode: 500,
                                message: 'ViewModel instance not found.',
                            })
                        }

                        this.#vmi = this.#riveInstance!.viewModelInstance
                        console.log(
                            '%c☑️ Rive loaded.',
                            'color: #8368cb; font-weight: bold;',
                        )

                        if (params.data) {
                            return resolve(this.updateAction(params))
                        }

                        return resolve({ statusCode: 200 })
                    },
                })
            })
        } catch (e) {
            console.error('Error during load:', e)

            return {
                statusCode: 500,
                message: e instanceof Error ? e.message : 'Unknown error',
            }
        }
    }

    async dispose(params: any) {
        if (this.#riveInstance) {
            this.#canvas.remove()
            this.#riveInstance.cleanup()
            this.#vmi = undefined
            this.#riveInstance = undefined
        }

        return { statusCode: 200 }
    }

    async updateAction(params: { data: any }) {
        if (!this.#riveInstance) {
            return { statusCode: 501, message: 'App not loaded' }
        }

        try {
            if (!this.#vmi) {
                throw new Error('ViewModel instance not available.')
            }

            for (let key in params.data) {
                const type = this.#vmi.properties.find(
                    (p) => p.name === key,
                )?.type

                if (!type) {
                    throw new Error(`Property ${key} not found in Rive file.`)
                }

                switch (type) {
                    /* @ts-expect-error - Rive's DataType enum is weird and behaves like a string but types like a number */
                    case 'string':
                        this.#vmi.string(key)!.value = params.data[key]
                        break
                    /* @ts-expect-error - Rive's DataType enum is weird and behaves like a string but types like a number */
                    case 'number':
                        this.#vmi.number(key)!.value = params.data[key]
                        break
                    /* @ts-expect-error - Rive's DataType enum is weird and behaves like a string but types like a number */
                    case 'boolean':
                        this.#vmi.boolean(key)!.value = params.data[key]
                        break
                    /* @ts-expect-error - Rive's DataType enum is weird and behaves like a string but types like a number */
                    case 'color':
                        this.#vmi.color(key)!.value = params.data[key]
                        break
                    /* @ts-expect-error - Rive's DataType enum is weird and behaves like a string but types like a number */
                    case 'enum':
                        this.#vmi.enum(key)!.value = params.data[key]
                        break
                    default:
                        throw new Error(
                            `WIP: Unsupported property type for ${key}.`,
                        )
                }
            }

            return { statusCode: 200 }
        } catch (error) {
            console.error('Update action failed:', error)

            return {
                statusCode: 500,
                message:
                    error instanceof Error ? error.message : 'Unknown error',
            }
        }
    }

    async playAction(params: any) {
        if (!this.#riveInstance) {
            return {
                statusCode: 501,
                currentStep: this.#currentStep,
                message: 'App not loaded',
            }
        }

        this.#currentStep += params.delta

        if (!this.#vmi) {
            throw new Error('ViewModel instance not available.')
        }

        // TODO: validate triggers exist in constructor?
        this.#vmi.trigger(this.#playActionTrigger)?.trigger()

        return { statusCode: 200, currentStep: this.#currentStep }
    }

    async stopAction(params: any) {
        if (!this.#riveInstance) {
            return { statusCode: 200 }
        }

        if (!this.#vmi) {
            throw new Error('ViewModel instance not available.')
        }

        this.#vmi.trigger(this.#stopActionTrigger)?.trigger()

        return { statusCode: 200 }
    }

    async customAction({ id, payload }: { id: string; payload: any }) {
        if (!this.#riveInstance) {
            return { statusCode: 501, message: 'App not loaded' }
        }

        if (!this.#vmi) {
            throw new Error('ViewModel instance not available.')
        }

        this.#vmi.trigger(id)?.trigger()

        return { statusCode: 200 }
    }

    async goToTime(_payload: any) {
        throw new Error('Non-realtime not supported by this graphic.')
        return { statusCode: 400 }
    }

    async setActionsSchedule(_payload: any) {
        throw new Error('Non-realtime not supported by this graphic.')
        return { statusCode: 400 }
    }
}

customElements.define('rive-ograf-template', RiveOGrafTemplate)

export default RiveOGrafTemplate
