class RiveOGrafTemplate extends HTMLElement {
    #canvas
    #currentStep = 0

    /* === REPLACED VARIABLES === */
    #width = 500
    #height = 500
    #playActionTrigger = '${PLAY_ACTION_TRIGGER}'
    #stopActionTrigger = '${STOP_ACTION_TRIGGER}'
    #riveBuffer = new Uint8Array('${RIVE_FILE}')

    /* === RIVE-SPECIFIC VARIABLES === */
    #hasRiveScriptLoaded
    #riveInstance
    #vmi

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.#canvas = document.createElement('canvas')

        // TODO: Find a way to bundle the Rive runtime with the graphic instead of loading from CDN
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
                return this.updateAction({ data: params.data })
            }

            return new Promise((resolve) => {
                this.#canvas.width = this.#width
                this.#canvas.height = this.#height
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
                            return resolve({
                                statusCode: 500,
                            })
                        }

                        this.#vmi = this.#riveInstance.viewModelInstance
                        console.log(
                            '%c☑️ Rive loaded.',
                            'color: #8368cb; font-weight: bold;',
                        )

                        if (params.data) {
                            return resolve(
                                this.updateAction({ data: params.data }),
                            )
                        }

                        return resolve({ statusCode: 200 })
                    },
                })
            })
        } catch (e) {
            console.error('Error during load:', e)
            return { statusCode: 500 }
        }
    }

    async dispose(params) {
        if (this.#riveInstance) {
            this.#canvas.remove()
            this.#riveInstance.cleanup()
            this.#vmi = undefined
            this.#riveInstance = undefined
        }

        return { statusCode: 200 }
    }

    #setInstancePropertyValues(vmi, data) {
        for (let key in data) {
            const type = vmi.properties.find((p) => p.name === key)?.type

            if (!type) {
                throw new Error(`Property ${key} not found in Rive file.`)
            }

            switch (type) {
                /* @ts-expect-error - Rive's DataType is bugged */
                case 'string':
                    vmi.string(key).value = data[key]
                    break
                /* @ts-expect-error - Rive's DataType is bugged */
                case 'number':
                    vmi.number(key).value = data[key]
                    break
                /* @ts-expect-error - Rive's DataType is bugged */
                case 'boolean':
                    vmi.boolean(key).value = data[key]
                    break
                /* @ts-expect-error - Rive's DataType is bugged */
                case 'color':
                    vmi.color(key).value = data[key]
                    break
                /* @ts-expect-error - Rive's DataType is bugged */
                case 'enum':
                    vmi.enum(key).value = data[key]
                    break
                /* @ts-expect-error - Rive's DataType is bugged */
                case 'list':
                    const items = data[key]
                    const list = vmi.list(key)
                    const vmName = list.instanceAt(0)?.viewModel.name

                    if (!this.#riveInstance) {
                        throw new Error('Rive instance not available.')
                    }

                    if (!Array.isArray(items)) {
                        throw new Error(
                            `Expected an array for property ${key}.`,
                        )
                    }

                    if (!vmName) {
                        throw new Error(`ViewModel for list ${key} not found.`)
                    }

                    const vm = this.#riveInstance.viewModelByName(vmName)

                    if (!vm) {
                        throw new Error(`ViewModel for list ${key} not found.`)
                    }

                    // Clear the list
                    while (list.length > 0) {
                        list.removeInstanceAt(0)
                    }

                    // Repopulate the list with the new data
                    items.forEach((item) => {
                        const instance = vm.instance()
                        this.#setInstancePropertyValues(instance, item)
                        list.addInstance(instance)
                    })

                    break
                default:
                    throw new Error(
                        `WIP: Unsupported property type for ${key}.`,
                    )
            }
        }
    }

    async updateAction(params) {
        if (!this.#riveInstance) {
            return { statusCode: 501 }
        }

        try {
            if (!this.#vmi) {
                throw new Error('ViewModel instance not available.')
            }

            if (typeof params.data !== 'object' || params.data === null) {
                throw new Error('Data must be a non-null object.')
            }

            this.#setInstancePropertyValues(this.#vmi, params.data)

            return { statusCode: 200 }
        } catch (error) {
            console.error('Update action failed:', error)
            return { statusCode: 500 }
        }
    }

    async playAction(params) {
        if (!this.#riveInstance) {
            return {
                statusCode: 501,
                currentStep: this.#currentStep,
            }
        }

        this.#currentStep += params.delta ?? 1

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

    async customAction({ id }) {
        if (!this.#riveInstance) {
            return { statusCode: 501 }
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
