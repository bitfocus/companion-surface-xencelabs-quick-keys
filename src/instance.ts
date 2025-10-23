import {
	CardGenerator,
	HostCapabilities,
	SurfaceDrawProps,
	SurfaceContext,
	SurfaceInstance,
	parseColor,
} from '@companion-surface/base'
import {
	WheelEvent,
	XencelabsQuickKeys,
	XencelabsQuickKeysDisplayBrightness,
	XencelabsQuickKeysDisplayOrientation,
	XencelabsQuickKeysWheelSpeed,
} from '@xencelabs-quick-keys/node'
import { companionToKey, keyToCompanion } from './util.js'

export class QuickKeysWrapper implements SurfaceInstance {
	readonly #surface: XencelabsQuickKeys
	readonly #surfaceId: string
	// readonly #context: SurfaceContext

	#statusTimer: NodeJS.Timeout | undefined

	public get surfaceId(): string {
		return this.#surfaceId
	}
	public get productName(): string {
		return 'Xencelabs Quick Keys'
	}

	public constructor(surfaceId: string, surface: XencelabsQuickKeys, context: SurfaceContext) {
		this.#surface = surface
		this.#surfaceId = surfaceId
		// this.#context = context

		this.#surface.on('error', (e) => context.disconnect(e as Error))

		this.#surface.on('down', (key: number) => {
			const k = keyToCompanion(key)
			if (k !== null) {
				context.keyDownById(k)
			}
		})
		this.#surface.on('up', (key: number) => {
			const k = keyToCompanion(key)
			if (k !== null) {
				context.keyUpById(k)
			}
		})
		this.#surface.on('wheel', (ev: WheelEvent) => {
			switch (ev) {
				case WheelEvent.Left:
					context.rotateLeftById('wheel')
					break
				case WheelEvent.Right:
					context.rotateRightById('wheel')
					break
			}
		})
	}

	async init(): Promise<void> {
		await this.#surface.startData()

		await this.#surface.setWheelSpeed(XencelabsQuickKeysWheelSpeed.Normal) // TODO dynamic
		await this.#surface.setDisplayOrientation(XencelabsQuickKeysDisplayOrientation.Rotate0) // TODO dynamic
		await this.#surface.setSleepTimeout(0) // TODO dynamic

		// Start with blanking it
		await this.blank()
	}
	async close(): Promise<void> {
		this.stopStatusInterval()

		await this.#surface.stopData()
	}

	updateCapabilities(_capabilities: HostCapabilities): void {
		// Not used
	}

	async ready(): Promise<void> {}

	async setBrightness(percent: number): Promise<void> {
		const opts = Object.values<XencelabsQuickKeysDisplayBrightness | string>(
			XencelabsQuickKeysDisplayBrightness,
		).filter((k): k is XencelabsQuickKeysDisplayBrightness => typeof k === 'number')

		const perStep = 100 / (opts.length - 1)
		const step = Math.round(percent / perStep)

		await this.#surface.setDisplayBrightness(opts[step])
	}
	async blank(): Promise<void> {
		await this.clearStatus()

		// Do some initial setup too

		await this.#surface.setWheelColor(0, 0, 0)

		for (let i = 0; i < 8; i++) {
			await this.#surface.setKeyText(i, '')
		}
	}
	async draw(signal: AbortSignal, drawProps: SurfaceDrawProps): Promise<void> {
		await this.clearStatus()

		if (signal.aborted) return

		if (drawProps.controlId === 'menu') {
			// Nothing to draw
			return
		} else if (drawProps.controlId === 'wheel') {
			const { r, g, b } = parseColor(drawProps.color)

			await this.#surface.setWheelColor(r, g, b)
		} else {
			const keyIndex = companionToKey(drawProps.controlId)
			if (keyIndex === null) return

			await this.#surface.setKeyText(keyIndex, typeof drawProps.text === 'string' ? drawProps.text.slice(0, 8) : '')
		}
	}
	async showStatus(_signal: AbortSignal, _cardGenerator: CardGenerator, status: string): Promise<void> {
		this.stopStatusInterval()

		const newMessage = status
		this.#statusTimer = setInterval(() => {
			// Update on an interval, as we cant set it unlimited
			this.#surface.showOverlayText(5, newMessage).catch((e) => {
				console.error(`Overlay failed: ${e}`)
			})
		}, 3000)

		await this.#surface.showOverlayText(5, newMessage)
	}

	private stopStatusInterval(): boolean {
		if (this.#statusTimer) {
			clearInterval(this.#statusTimer)
			this.#statusTimer = undefined

			return true
		}

		return false
	}
	private async clearStatus(msg?: string): Promise<void> {
		if (this.stopStatusInterval()) {
			await this.#surface.showOverlayText(1, msg ?? '')
		}
	}
}
