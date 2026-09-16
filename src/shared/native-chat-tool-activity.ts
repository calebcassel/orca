// Live tool-activity derivation and copy for the native-chat "Running …" row,
// shared by the desktop renderer (as its i18n fallback strings) and the mobile
// app (used directly — mobile ships English only) so the two surfaces never drift.

import { createToolInputDisplay } from './native-chat-tool-summary'
import { isToolCallBlock, type NativeChatBlock } from './native-chat-types'

type NativeChatToolCallBlock = Extract<NativeChatBlock, { type: 'tool-call' }>

export const NATIVE_CHAT_TOOL_ACTIVITY_COPY = {
  runningPreview: 'Running {{preview}}',
  runningCommand: 'Running command',
  runningNamedPreview: 'Running {{toolName}} {{preview}}',
  runningNamed: 'Running {{toolName}}',
  countOne: '1 tool call',
  countN: '{{value0}} tool calls',
  moreCalls: '+{{value0}} more'
} as const

/** Tools whose call is a shell command, so the row reads as terminal activity
 *  (and takes the terminal glyph) rather than a named tool invocation. */
export const COMMAND_TOOL_NAMES: ReadonlySet<string> = new Set([
  'bash',
  'shell',
  'powershell',
  'terminal',
  'execute',
  'run_command',
  'run_shell_command',
  'shell_command',
  'exec_command',
  'run_terminal_cmd',
  'run_terminal_command'
])

export function isCommandToolName(name: string): boolean {
  return COMMAND_TOOL_NAMES.has(name.trim().toLowerCase())
}

export type NativeChatActiveToolDescriptor = {
  key: 'runningPreview' | 'runningCommand' | 'runningNamedPreview' | 'runningNamed'
  toolName: string
  preview: string
  isCommand: boolean
}

/** Which copy key and arguments the active-tool row renders for a running call. */
export function describeActiveToolCall(
  call: NativeChatToolCallBlock
): NativeChatActiveToolDescriptor {
  const preview = createToolInputDisplay(call.input).label
  const isCommand = isCommandToolName(call.name)
  const key = isCommand
    ? preview
      ? 'runningPreview'
      : 'runningCommand'
    : preview
      ? 'runningNamedPreview'
      : 'runningNamed'
  return { key, toolName: call.name, preview, isCommand }
}

/** Resolve the active-tool label in English. For platforms without i18n (mobile). */
export function formatActiveToolLabel(descriptor: NativeChatActiveToolDescriptor): string {
  return NATIVE_CHAT_TOOL_ACTIVITY_COPY[descriptor.key]
    .replaceAll('{{preview}}', descriptor.preview)
    .replaceAll('{{toolName}}', descriptor.toolName)
}

/** The call this run is inside right now: its newest one, and only while that call
 *  is still running.
 *
 *  `state` is a latch the provider revises once its result lands, so a lost result
 *  or a turn that never reaches its end boundary leaves `running` set forever. The
 *  live row cannot be read off that latch alone: "what is this agent doing now" is
 *  answered by the turn's newest activity, and an older call the agent has already
 *  worked past is history however it is still labelled.
 *
 *  A block without lifecycle `state` only counts while the turn is known to be
 *  working, so a restored transcript never spins on an orphaned call. */
export function selectActiveToolCall(
  blocks: readonly NativeChatBlock[],
  {
    activeTurnIsWorking,
    isTurnActivityFrontier
  }: { activeTurnIsWorking?: boolean; isTurnActivityFrontier?: boolean }
): NativeChatToolCallBlock | null {
  // The frontier is the working turn's newest row. Rows above it were superseded by
  // the activity that followed, which is what holds the turn to one live row.
  if (activeTurnIsWorking === false || isTurnActivityFrontier === false) {
    return null
  }
  const newest = blocks.findLast(isToolCallBlock)
  if (!newest) {
    return null
  }
  return newest.state === 'running' || (newest.state == null && activeTurnIsWorking === true)
    ? newest
    : null
}

/** Fallback summary when no per-tool summary is available. */
export function formatToolCallCount(callCount: number): string {
  return callCount === 1
    ? NATIVE_CHAT_TOOL_ACTIVITY_COPY.countOne
    : NATIVE_CHAT_TOOL_ACTIVITY_COPY.countN.replaceAll('{{value0}}', String(callCount))
}
