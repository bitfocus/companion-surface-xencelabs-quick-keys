import {
	DiscoveredSurfaceInfo,
	OpenSurfaceResult,
	SurfaceContext,
	SurfacePlugin,
	SurfacePluginDetectionEvents,
} from '@companion-surface/base'
import { XencelabsQuickKeys, XencelabsQuickKeysManagerInstance } from '@xencelabs-quick-keys/node'
import { QuickKeysWrapper } from './instance.js'
import EventEmitter from 'node:events'

interface DeviceInfo {
	device: XencelabsQuickKeys
}

class QuickKeysDetection extends EventEmitter<SurfacePluginDetectionEvents<DeviceInfo>> {
	constructor() {
		super()

		XencelabsQuickKeysManagerInstance.on('error', (err) => {
			console.error('Xencelabs Quick Keys Manager Error:', err)
		})

		XencelabsQuickKeysManagerInstance.on('connect', (dev) => {
			// Ignore devices without an ID
			if (!dev.deviceId) return

			this.emit('surfacesAdded', [
				{
					deviceHandle: dev.deviceId,
					surfaceId: `quickkeys:${dev.deviceId}`,
					description: `Xencelabs Quick Keys`,
					pluginInfo: { device: dev },
				},
			])
		})
		XencelabsQuickKeysManagerInstance.on('disconnect', (dev) => {
			// Ignore devices without an ID
			if (!dev.deviceId) return

			this.emit('surfacesRemoved', [dev.deviceId])
		})
	}

	async triggerScan() {
		await XencelabsQuickKeysManagerInstance.scanDevices()
	}

	rejectSurface(_surfaceInfo: DiscoveredSurfaceInfo<DeviceInfo>) {
		// No resources to clean up
		// TODO - what should happen here?
	}
}

const QuickKeysPlugin: SurfacePlugin<DeviceInfo> = {
	detection: new QuickKeysDetection(),

	init: async (): Promise<void> => {
		// Nothing to do
	},
	destroy: async (): Promise<void> => {
		await XencelabsQuickKeysManagerInstance.closeAll()
	},

	openSurface: async (
		surfaceId: string,
		pluginInfo: DeviceInfo,
		context: SurfaceContext,
	): Promise<OpenSurfaceResult> => {
		return {
			surface: new QuickKeysWrapper(surfaceId, pluginInfo.device, context),
			registerProps: {
				brightness: true,
				surfaceLayout: {
					stylePresets: {
						default: { text: true }, // Labelled buttons
						wheel: { colors: 'hex' },
						empty: {}, // The menu button
					},
					controls: {
						menu: { row: 0, column: 0, stylePreset: 'empty' },
						wheel: { row: 0, column: 5, stylePreset: 'wheel' },
						'0/1': { row: 0, column: 1 },
						'0/2': { row: 0, column: 2 },
						'0/3': { row: 0, column: 3 },
						'0/4': { row: 0, column: 4 },
						'1/1': { row: 1, column: 1 },
						'1/2': { row: 1, column: 2 },
						'1/3': { row: 1, column: 3 },
						'1/4': { row: 1, column: 4 },
					},
				},
				pincodeMap: null,
				configFields: [],
				location: null,
			},
		}
	},
}
export default QuickKeysPlugin
