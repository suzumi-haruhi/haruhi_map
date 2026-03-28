import { spawn } from 'child_process'
import { resolve } from 'path'

const isWin = process.platform === 'win32'
const npmCmd = isWin ? 'npm.cmd' : 'npm'
const cwd = resolve(process.cwd())

function startProcess(name, command, args) {
	const child = spawn(command, args, {
		cwd,
		stdio: 'inherit',
		env: process.env,
		shell: true
	})

	child.on('exit', (code, signal) => {
		if (signal) {
			console.log(`[${name}] exited with signal ${signal}`)
		} else {
			console.log(`[${name}] exited with code ${code}`)
		}
	})

	return child
}

console.log('Starting backend and frontend...')

const server = startProcess('server', process.execPath, ['server/index.js'])
const web = startProcess('web', npmCmd, ['run', 'dev'])

function shutdown() {
	if (server?.pid) server.kill('SIGINT')
	if (web?.pid) web.kill('SIGINT')
}

process.on('SIGINT', () => {
	shutdown()
	process.exit(0)
})

process.on('SIGTERM', () => {
	shutdown()
	process.exit(0)
})
