export function keyToCompanion(k: number): string | null {
	if (k >= 0 && k < 4) return `0/${k + 1}`
	if (k >= 4 && k < 8) return `1/${(k % 4) + 1}`
	if (k === 8) return 'menu'
	if (k === 9) return 'wheel'
	return null
}

export function companionToKey(id: string): number | null {
	if (id === 'menu') return 8
	if (id === 'wheel') return 9

	const parts = id.split('/')
	if (parts.length !== 2) return null

	const row = parseInt(parts[0], 10)
	const col = parseInt(parts[1], 10)
	if (isNaN(row) || isNaN(col)) return null

	if (row === 0 && col >= 1 && col <= 4) return col - 1
	if (row === 1 && col >= 1 && col <= 4) return col + 3

	return null
}
