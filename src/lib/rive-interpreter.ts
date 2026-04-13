import { DataType, Rive, RiveFile, ViewModelInstance } from '@rive-app/webgl2'
import type { ViewModelProperty } from '@rive-app/webgl2/rive_advanced.mjs'
import JSZip from 'jszip'
import type { GraphicsManifest } from 'ograf'
import RiveOGrafTemplate from './RiveOGrafTemplate'

type RiveInterpreterOptions = (
	| { src: string; buffer?: never }
	| { src?: never; buffer: ArrayBuffer }
) & {
	onFileLoad?: (riveInstance: Rive, triggers: string[]) => void
}

export interface TriggerMap {
	playAction: string
	stopAction: string
	customActions: string[]
}

export function getInstancePropertyValue(prop: ViewModelProperty, vmi: ViewModelInstance): unknown {
	switch (prop.type) {
		case DataType.boolean:
			return vmi.boolean(prop.name)!.value
		case DataType.string:
			return vmi.string(prop.name)!.value
		case DataType.number:
			return vmi.number(prop.name)!.value
		case DataType.color:
			return vmi.color(prop.name)!.value
		case DataType.enumType:
			return vmi.enum(prop.name)!.value
		case DataType.list:
			const list = vmi.list(prop.name)!
			const listCount = list.length
			const instances = Array.from(
				{ length: listCount },
				(_, i) => vmi.list(prop.name)!.instanceAt(i)!
			)
			return instances.map((instance) => {
				const instanceProps = instance.properties
				return instanceProps.reduce(
					(obj, instanceProp) => {
						obj[instanceProp.name] = getInstancePropertyValue(instanceProp, instance)
						return obj
					},
					{} as Record<string, unknown>
				)
			})
		default:
			// Includes triggers since they have no value
			return undefined
	}
}

export function setInstancePropertyValues(
	data: Record<string, unknown>,
	vmi: ViewModelInstance,
	riveInstance: Rive
) {
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
				const vmName = list.instanceAt(0)?.viewModelName

				if (!riveInstance) {
					throw new Error('Rive instance not available.')
				}

				if (!Array.isArray(items)) {
					throw new Error(`Expected an array for property ${key}.`)
				}

				if (!vmName) {
					throw new Error(`ViewModel for list ${key} not found.`)
				}

				const vm = riveInstance.viewModelByName(vmName)

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
					setInstancePropertyValues(item, instance, riveInstance)
					list.addInstance(instance)
				})

				break
			default:
				throw new Error(`WIP: Unsupported property type for ${key}.`)
		}
	}
}

export default class RiveInterpreter {
	#buffer: ArrayBuffer
	#canvas: OffscreenCanvas
	#riveFile?: RiveFile
	#riveInstance?: Rive
	#isInstanceLoaded: boolean = false
	#onFileLoad?: (riveInstance: Rive, triggers: string[]) => void
	#artboardHeight: number = 0
	#artboardWidth: number = 0

	constructor(options: RiveInterpreterOptions) {
		if (!options.src && !options.buffer) {
			throw new Error('Rive file is required for RiveInterpreter constructor.')
		}

		if (options.src && options.buffer) {
			throw new Error('Provide either src or buffer, not both, to RiveInterpreter constructor.')
		}

		this.#canvas = new OffscreenCanvas(1, 1)
		this.#onFileLoad = options.onFileLoad
		this.#buffer = options.buffer ?? new ArrayBuffer(0)

		this.loadRiveFile(options.buffer ?? options.src)
	}

	async loadRiveFile(src: string | ArrayBuffer) {
		const loadMethod = src instanceof ArrayBuffer ? { buffer: src } : { src }
		const file = new RiveFile({
			...loadMethod,
			onLoad: (e) => {
				this.#riveFile = file
				this.#riveInstance = new Rive({
					riveFile: file,
					canvas: this.#canvas,
					autoBind: true,
					onLoad: () => {
						this.#isInstanceLoaded = true
						this.#artboardHeight = this.#riveInstance!.artboardHeight ?? 0
						this.#artboardWidth = this.#riveInstance!.artboardWidth ?? 0
						this.#onFileLoad?.(
							this.#riveInstance!,
							this.#riveInstance!.viewModelInstance?.properties.filter(
								(prop) => prop.type === DataType.trigger
							).map((prop) => prop.name) ?? []
						)
					},
				})
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

	#generateSchemaForViewModel(vmi: ViewModelInstance) {
		const schema: GraphicsManifest['schema'] = {
			type: 'object',
			properties: {},
		}
		const properties = vmi.properties

		properties.forEach((prop) => {
			if (prop.type === DataType.trigger) {
				// Triggers get converted to actions and are not in the schema
				return
			}

			if (prop.type === DataType.list) {
				if (!vmi.list(prop.name)?.instanceAt(0)) {
					throw new Error(`List property ${prop.name} has no instances, cannot generate schema.`)
				}

				schema.properties![prop.name] = {
					type: 'array',
					title: prop.name,
					description: `Auto-generated property for ${prop.name}`,
					items: this.#generateSchemaForViewModel(
						// An assumption is made here that all instances in the list use the same ViewModel,
						// which is not enforced by Rive but should be true for our use cases
						vmi.list(prop.name)!.instanceAt(0)!
					),
					default: getInstancePropertyValue(prop, vmi),
				}

				return
			}

			schema.properties![prop.name] = {
				type: prop.type,
				title: prop.name,
				description: `Auto-generated property for ${prop.name}`,
				default: getInstancePropertyValue(prop, vmi),
			}
		})

		return schema
	}

	async createManifest(
		triggerMap: TriggerMap,
		metadata: {
			name: string
			description?: string
			id: string
			version: string
			author?: {
				name: string
				email?: string
				url?: string
			}
			stepCount: number
		}
	): Promise<GraphicsManifest> {
		try {
			const template: GraphicsManifest = await (await fetch('./manifest.ograf.json')).json()
			const properties = this.#riveInstance?.viewModelInstance?.properties

			if (!properties) {
				throw new Error('Could not create manifest: Rive instance properties not available.')
			}

			const manifest: GraphicsManifest = { ...template, ...metadata }

			manifest.customActions = []
			manifest[__MANIFEST_VERSION_KEY__] = __VERSION__
			manifest.schema = this.#generateSchemaForViewModel(this.#riveInstance!.viewModelInstance!)

			// Handle triggers
			properties.forEach((prop) => {
				if (prop.name === triggerMap.playAction || prop.name === triggerMap.stopAction) {
					return
				}

				if (prop.type === DataType.trigger) {
					manifest.customActions!.push({
						id: prop.name,
						name: prop.name,
						description: `Auto-generated custom action for ${prop.name}`,
					})
					return
				}
			})

			return manifest
		} catch (e) {
			throw new Error(`Failed to create manifest: ${e}`)
		}
	}

	createTestTemplate(triggerMap: TriggerMap): RiveOGrafTemplate {
		if (!this.#riveFile || !this.#isInstanceLoaded) {
			throw new Error('Rive file not loaded yet.')
		}

		return new RiveOGrafTemplate(this.#riveFile, triggerMap)
	}

	async createOGrafPackage(manifest: GraphicsManifest, triggerMap: TriggerMap) {
		if (!this.#riveFile || !this.#isInstanceLoaded) {
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
