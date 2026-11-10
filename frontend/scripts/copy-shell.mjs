import { copyFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const output = resolve(import.meta.dirname, '../../assets-react')
mkdirSync(output, { recursive: true })
copyFileSync(resolve(import.meta.dirname, '../shell.html'), resolve(output, 'index.html'))
