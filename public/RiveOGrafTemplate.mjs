class RiveOGrafTemplate extends HTMLElement {
    #canvas
    #currentStep = 0
    #width = 500
    #height = 500
    #playActionTrigger = '${PLAY_ACTION_TRIGGER}'
    #stopActionTrigger = '${STOP_ACTION_TRIGGER}'
    #riveBuffer = new Uint8Array('${RIVE_FILE}')
    #riveInstance
    #hasRiveScriptLoaded
    #vmi

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.#canvas = document.createElement('canvas')

        const script = document.createElement('script')
        script.src = 'https://unpkg.com/@rive-app/webgl@2.35.0'
        this.#hasRiveScriptLoaded = new Promise((resolve) => {
            script.onload = () => resolve(true)
        })
        this.shadowRoot?.appendChild(script)
    }

    connectedCallback() {}

    async load(params) {
        if (params.renderType !== 'realtime') {
            throw new Error('Non-realtime not supported by this graphic.')
        }

        try {
            await this.#hasRiveScriptLoaded

            if (this.#riveInstance) {
                return this.updateAction(params)
            }

            return new Promise((resolve) => {
                this.#canvas.width = this.#width
                this.#canvas.height = this.#height
                this.#canvas.style.outline = '1px solid #fff'
                this.shadowRoot?.appendChild(this.#canvas)

                this.#riveInstance = new window.rive.Rive({
                    buffer: this.#riveBuffer.buffer,
                    canvas: this.#canvas,
                    autoplay: true,
                    autoBind: true,
                    stateMachines: 'State Machine 1',
                    onLoad: async () => {
                        this.#riveInstance.resizeDrawingSurfaceToCanvas()

                        if (!this.#riveInstance.viewModelInstance) {
                            throw new Error('ViewModel instance not found.')
                        }

                        this.#vmi = this.#riveInstance.viewModelInstance
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

    async dispose(params) {
        if (this.#riveInstance) {
            this.#canvas.remove()
            this.#riveInstance.cleanup()
        }

        return { statusCode: 200 }
    }

    async updateAction(params) {
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
                        this.#vmi.string(key).value = params.data[key]
                        break
                    /* @ts-expect-error - Rive's DataType enum is weird and behaves like a string but types like a number */
                    case 'number':
                        this.#vmi.number(key).value = params.data[key]
                        break
                    /* @ts-expect-error - Rive's DataType enum is weird and behaves like a string but types like a number */
                    case 'boolean':
                        this.#vmi.boolean(key).value = params.data[key]
                        break
                    /* @ts-expect-error - Rive's DataType enum is weird and behaves like a string but types like a number */
                    case 'color':
                        this.#vmi.color(key).value = params.data[key]
                        break
                    /* @ts-expect-error - Rive's DataType enum is weird and behaves like a string but types like a number */
                    case 'enum':
                        this.#vmi.enum(key).value = params.data[key]
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

    async playAction(params) {
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

    async stopAction(params) {
        if (!this.#riveInstance) {
            return { statusCode: 200 }
        }

        if (!this.#vmi) {
            throw new Error('ViewModel instance not available.')
        }

        this.#vmi.trigger(this.#stopActionTrigger)?.trigger()

        return { statusCode: 200 }
    }

    async customAction({ id, payload }) {
        if (!this.#riveInstance) {
            return { statusCode: 501, message: 'App not loaded' }
        }

        if (!this.#vmi) {
            throw new Error('ViewModel instance not available.')
        }

        this.#vmi.trigger(id)?.trigger()

        return { statusCode: 200 }
    }

    async goToTime(_payload) {
        throw new Error('Non-realtime not supported by this graphic.')
        return { statusCode: 400 }
    }

    async setActionsSchedule(_payload) {
        throw new Error('Non-realtime not supported by this graphic.')
        return { statusCode: 400 }
    }
}

export default RiveOGrafTemplate
