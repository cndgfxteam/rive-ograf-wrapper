import { DataType, Rive, type RiveFile, type ViewModelInstance } from '@rive-app/webgl2'
import { GraphicsAPI, type ReturnPayload } from 'ograf'
import type { TriggerMap } from './rive-interpreter'

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
	#resizeHandler: () => void

	constructor(riveFile: RiveFile, width: number, height: number, triggerMap: TriggerMap) {
		super()
		this.attachShadow({ mode: 'open' })
		this.#canvas = document.createElement('canvas')
		this.#width = width
		this.#height = height
		this.#riveFile = riveFile
		this.#playActionTrigger = triggerMap.playAction
		this.#stopActionTrigger = triggerMap.stopAction
		this.#resizeHandler = () => {}
	}

	connectedCallback() {}

	async load(
		params: Parameters<GraphicsAPI.Graphic['load']>[0]
	): ReturnType<GraphicsAPI.Graphic['load']> {
		if (params.renderType !== 'realtime') {
			throw new Error('Non-realtime not supported by this graphic.')
		}

		try {
			if (this.#riveInstance) {
				return this.updateAction({ data: params.data })
			}

			return new Promise<ReturnPayload | undefined>((resolve) => {
				this.#canvas.width = this.#width
				this.#canvas.height = this.#height
				this.#canvas.style.outline = '1px solid #fff'
				this.#canvas.style.background =
					'repeating-conic-gradient(#808080 0 25%, #0000 0 50%) 50% / 20px 20px'
				this.shadowRoot?.appendChild(this.#canvas)

				this.#riveInstance = new Rive({
					riveFile: this.#riveFile,
					canvas: this.#canvas,
					autoplay: true,
					autoBind: true,
					stateMachines: 'State Machine 1',
					onLoad: async () => {
						this.#riveInstance!.resizeDrawingSurfaceToCanvas()

						this.#resizeHandler = () => {
							this.#riveInstance!.resizeDrawingSurfaceToCanvas()
						}
						window.addEventListener('resize', this.#resizeHandler)

						if (!this.#riveInstance!.viewModelInstance) {
							return resolve({
								statusCode: 500,
							})
						}

						this.#vmi = this.#riveInstance!.viewModelInstance
						console.log('%c☑️ Rive loaded.', 'color: #8368cb; font-weight: bold;')

						if (params.data) {
							return resolve(this.updateAction({ data: params.data }))
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

	async dispose(
		_params: Parameters<GraphicsAPI.Graphic['dispose']>[0]
	): ReturnType<GraphicsAPI.Graphic['dispose']> {
		if (this.#riveInstance) {
			this.#canvas.remove()
			this.#riveInstance.cleanup()
			this.#vmi = undefined
			this.#riveInstance = undefined
			window.removeEventListener('resize', this.#resizeHandler)
		}

		return { statusCode: 200 }
	}

	#setInstancePropertyValues(vmi: ViewModelInstance, data: Record<string, unknown>) {
		for (let key in data) {
			const type = vmi.properties.find((p) => p.name === key)?.type

			if (!type) {
				throw new Error(`Property ${key} not found in Rive file.`)
			}

			switch (type) {
				case DataType.string:
					vmi.string(key)!.value = data[key] as string
					break
				case DataType.number:
					vmi.number(key)!.value = data[key] as number
					break
				case DataType.boolean:
					vmi.boolean(key)!.value = data[key] as boolean
					break
				case DataType.color:
					vmi.color(key)!.value = data[key] as number
					break
				case DataType.enumType:
					vmi.enum(key)!.value = data[key] as string
					break
				case DataType.list:
					const items = data[key] as Record<string, unknown>[]
					const list = vmi.list(key)!
					// TODO: REMOVE THE HARDCODED VM NAME ASAP
					const vmName = list.instanceAt(0)?.viewModel.name || 'BarVM'

					if (!this.#riveInstance) {
						throw new Error('Rive instance not available.')
					}

					if (!Array.isArray(items)) {
						throw new Error(`Expected an array for property ${key}.`)
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
					throw new Error(`WIP: Unsupported property type for ${key}.`)
			}
		}
	}

	async updateAction(
		params: Parameters<GraphicsAPI.Graphic['updateAction']>[0]
	): ReturnType<GraphicsAPI.Graphic['updateAction']> {
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

			const data = params.data as Record<string, unknown>
			this.#setInstancePropertyValues(this.#vmi, data)

			return { statusCode: 200 }
		} catch (error) {
			console.error('Update action failed:', error)
			return { statusCode: 500 }
		}
	}

	async playAction(
		params: Parameters<GraphicsAPI.Graphic['playAction']>[0]
	): ReturnType<GraphicsAPI.Graphic['playAction']> {
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

	async stopAction(
		_params: Parameters<GraphicsAPI.Graphic['stopAction']>[0]
	): ReturnType<GraphicsAPI.Graphic['stopAction']> {
		if (!this.#riveInstance) {
			return { statusCode: 200 }
		}

		if (!this.#vmi) {
			throw new Error('ViewModel instance not available.')
		}

		this.#vmi.trigger(this.#stopActionTrigger)?.trigger()

		return { statusCode: 200 }
	}

	async customAction({
		id,
	}: Parameters<GraphicsAPI.Graphic['customAction']>[0]): ReturnType<
		GraphicsAPI.Graphic['customAction']
	> {
		if (!this.#riveInstance) {
			return { statusCode: 501 }
		}

		if (!this.#vmi) {
			throw new Error('ViewModel instance not available.')
		}

		this.#vmi.trigger(id)?.trigger()

		return { statusCode: 200 }
	}

	async goToTime(
		_params: Parameters<GraphicsAPI.Graphic['goToTime']>[0]
	): ReturnType<GraphicsAPI.Graphic['goToTime']> {
		throw new Error('Non-realtime not supported by this graphic.')
	}

	async setActionsSchedule(
		_params: Parameters<GraphicsAPI.Graphic['setActionsSchedule']>[0]
	): ReturnType<GraphicsAPI.Graphic['setActionsSchedule']> {
		throw new Error('Non-realtime not supported by this graphic.')
	}
}

customElements.define('rive-ograf-template', RiveOGrafTemplate)

export default RiveOGrafTemplate
